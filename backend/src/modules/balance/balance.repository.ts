import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EnergySource } from './entities/energy-source.entity';
import { BalanceEntry, TimeTrunc } from './entities/balance-entry.entity';

export interface UpsertEntryPayload {
  energySource: EnergySource;
  value: number;
  percentage?: number;
  datetime: Date;
  timeTrunc: TimeTrunc;
}

@Injectable()
export class BalanceRepository {
  constructor(
    @InjectRepository(EnergySource)
    private readonly sourceRepo: Repository<EnergySource>,
    @InjectRepository(BalanceEntry)
    private readonly entryRepo: Repository<BalanceEntry>,
  ) {}

  // ── Energy Sources ────────────────────────────────────────────────

  /**
   * Upsert atómico — elimina la race condition del find+save original.
   * Devuelve la fuente existente o recién creada.
   */
  async upsertSource(
    type: string,
    title: string,
    extras?: { groupId?: string; color?: string; magnitude?: string },
  ): Promise<EnergySource> {
    await this.sourceRepo.upsert(
      { type, title, ...extras },
      { conflictPaths: ['type', 'title'], skipUpdateIfNoValuesChanged: true },
    );
    return this.sourceRepo.findOneOrFail({ where: { type, title } });
  }

  /**
   * Carga todas las fuentes de una vez para evitar N+1 en la ingesta.
   */
  async findAllSources(): Promise<EnergySource[]> {
    return this.sourceRepo.find({ order: { type: 'ASC', title: 'ASC' } });
  }

  // ── Balance Entries ───────────────────────────────────────────────

  /**
   * Upsert en batch — idempotente, seguro de llamar repetidamente.
   * En conflicto (energySource, datetime, timeTrunc) actualiza value y percentage.
   */
  async upsertEntries(entries: UpsertEntryPayload[]): Promise<void> {
    if (!entries.length) return;

    await this.entryRepo
      .createQueryBuilder()
      .insert()
      .into(BalanceEntry)
      .values(
        entries.map((e) => ({
          energySource: e.energySource,
          value: e.value,
          percentage: e.percentage,
          datetime: e.datetime,
          timeTrunc: e.timeTrunc,
        })),
      )
      .orUpdate(['value', 'percentage', 'updated_at'], ['energy_source_id', 'datetime', 'time_trunc'])
      .execute();
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    timeTrunc: TimeTrunc,
    sourceType?: string,
  ): Promise<BalanceEntry[]> {
    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.energySource', 'source')
      .where('entry.datetime BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('entry.time_trunc = :timeTrunc', { timeTrunc })
      .orderBy('entry.datetime', 'ASC')
      .addOrderBy('source.type', 'ASC');

    if (sourceType) {
      qb.andWhere('source.type = :sourceType', { sourceType });
    }

    return qb.getMany();
  }

  async findLatestSnapshot(timeTrunc: TimeTrunc = TimeTrunc.HOUR): Promise<BalanceEntry[]> {
    const latest = await this.entryRepo
      .createQueryBuilder('entry')
      .select('MAX(entry.datetime)', 'maxDatetime')
      .where('entry.time_trunc = :timeTrunc', { timeTrunc })
      .getRawOne<{ maxDatetime: Date }>();

    if (!latest?.maxDatetime) return [];

    return this.entryRepo.find({
      where: { datetime: latest.maxDatetime, timeTrunc },
      relations: ['energySource'],
      order: { energySource: { type: 'ASC' } },
    });
  }

  async getLastIngestionTime(): Promise<Date | null> {
    const entry = await this.entryRepo.findOne({
      where: {},
      order: { updatedAt: 'DESC' },   // updatedAt en lugar de createdAt — más preciso
    });
    return entry?.updatedAt ?? null;
  }

  async hasDataInRange(startDate: Date, endDate: Date): Promise<boolean> {
    const count = await this.entryRepo.count({
      where: { datetime: Between(startDate, endDate) },
    });
    return count > 0;
  }
}



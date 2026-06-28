import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ReeApiClient } from './ree-api.client';
import { ReeDataMapper } from './ree-data.mapper';
import { BalanceRepository } from '../balance/balance.repository';
import { TimeTrunc } from '../balance/entities/balance-entry.entity';
import { EnergySource } from '../balance/entities/energy-source.entity';

@Injectable()
export class ReeIngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReeIngestionService.name);
  private isIngesting = false; // NOTE: flag en memoria — no funciona con múltiples instancias

  constructor(
    private readonly reeClient: ReeApiClient,
    private readonly mapper: ReeDataMapper,
    private readonly balanceRepo: BalanceRepository,
    private readonly config: ConfigService,
  ) {}

  // ── Bootstrap: seed histórico en el primer arranque ───────────────

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Application bootstrap: checking for existing data...');

    const initialDays = this.config.get<number>('INGESTION_INITIAL_DAYS', 30);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - initialDays);

    const hasData = await this.balanceRepo.hasDataInRange(startDate, endDate);

    if (!hasData) {
      this.logger.log(`No historical data found. Seeding last ${initialDays} days...`);
      await this.ingestRange(startDate, endDate, TimeTrunc.DAY);
    } else {
      this.logger.log('Historical data present. Skipping seed.');
    }
  }

  // ── Cron: ingesta horaria ─────────────────────────────────────────

  @Cron('0 * * * *')
  async ingestLatestData(): Promise<void> {
    if (this.isIngesting) {
      this.logger.warn('Ingestion already in progress, skipping this tick.');
      return;
    }

    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - 25);

    this.logger.log('Cron triggered: ingesting latest 25h of data (hour granularity)');
    await this.ingestRange(start, end, TimeTrunc.HOUR);
  }

  // ── Lógica principal de ingesta ───────────────────────────────────

  async ingestRange(
    startDate: Date,
    endDate: Date,
    timeTrunc: TimeTrunc,
  ): Promise<{ ingested: number; errors: number }> {
    if (this.isIngesting) {
      this.logger.warn('Ingestion in progress, skipping concurrent request.');
      return { ingested: 0, errors: 0 };
    }

    this.isIngesting = true;
    let ingested = 0;
    let errors = 0;

    try {
      const startStr = this.mapper.formatDate(startDate);
      const endStr = this.mapper.formatDate(endDate);
      this.logger.log(`Ingesting ${startStr} → ${endStr} [${timeTrunc}]`);

      const response = await this.reeClient.fetchBalance({
        start_date: startStr,
        end_date: endStr,
        time_trunc: timeTrunc,
      });

      const mappedEntries = this.mapper.mapResponse(response, timeTrunc);
      this.logger.debug(`Mapped ${mappedEntries.length} raw entries`);

      if (!mappedEntries.length) {
        this.logger.warn('No entries mapped from REE response — skipping upsert.');
        return { ingested: 0, errors: 0 };
      }

      // ── Cargar fuentes existentes de una vez (evita N+1) ──────────
      const existingSources = await this.balanceRepo.findAllSources();
      const sourceMap = new Map<string, EnergySource>(
        existingSources.map((s) => [`${s.type}__${s.title}`, s]),
      );

      // Upsert solo las fuentes nuevas
      const uniqueKeys = new Set(
        mappedEntries.map((e) => `${e.sourceType}__${e.sourceTitle}`),
      );

      for (const key of uniqueKeys) {
        if (!sourceMap.has(key)) {
          const entry = mappedEntries.find(
            (e) => `${e.sourceType}__${e.sourceTitle}` === key,
          )!;
          const source = await this.balanceRepo.upsertSource(
            entry.sourceType,
            entry.sourceTitle,
            {
              groupId: entry.sourceGroupId,
              color: entry.sourceColor,
              magnitude: entry.sourceMagnitude,
            },
          );
          sourceMap.set(key, source);
        }
      }

      // ── Upsert entradas en batch ──────────────────────────────────
      const upsertPayload = mappedEntries.map((entry) => ({
        energySource: sourceMap.get(`${entry.sourceType}__${entry.sourceTitle}`)!,
        value: entry.value,
        percentage: entry.percentage,
        datetime: entry.datetime,
        timeTrunc,
      }));

      await this.balanceRepo.upsertEntries(upsertPayload);
      ingested = upsertPayload.length;

      this.logger.log(`Ingestion complete: ${ingested} entries upserted.`);
    } catch (err) {
      errors++;
      this.logger.error(
        `Ingestion failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.isIngesting = false;
    }

    return { ingested, errors };
  }

  getIngestionStatus(): { isIngesting: boolean } {
    return { isIngesting: this.isIngesting };
  }
}



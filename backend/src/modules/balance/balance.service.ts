import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BalanceRepository } from './balance.repository';
import { QueryBalanceDto } from './dto/query-balance.dto';
import {
  BalanceResponseDto,
  SourcesResponseDto,
  LatestResponseDto,
  BalanceEntryDto,
} from './dto/balance-response.dto';
import { BalanceEntry, TimeTrunc } from './entities/balance-entry.entity';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(private readonly balanceRepo: BalanceRepository) {}

  async getBalance(query: QueryBalanceDto): Promise<BalanceResponseDto> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);
    const timeTrunc = query.time_trunc ?? TimeTrunc.DAY;

    this.logger.debug(
      `Querying balance: ${startDate.toISOString()} → ${endDate.toISOString()} [${timeTrunc}]`,
    );

    const entries = await this.balanceRepo.findByDateRange(
      startDate,
      endDate,
      timeTrunc,
      query.source_type,
    );

    const lastIngestion = await this.balanceRepo.getLastIngestionTime();

    return {
      data: entries.map(this.mapEntry),
      total: entries.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timeTrunc,
      lastIngestion: lastIngestion?.toISOString(),
    };
  }

  async getSources(): Promise<SourcesResponseDto> {
    const sources = await this.balanceRepo.findAllSources();
    return {
      data: sources.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        groupId: s.groupId,
        color: s.color,
        magnitude: s.magnitude,
      })),
      total: sources.length,
    };
  }

  async getLatest(): Promise<LatestResponseDto> {
    const entries = await this.balanceRepo.findLatestSnapshot(TimeTrunc.HOUR);

    if (!entries.length) {
      const dayEntries = await this.balanceRepo.findLatestSnapshot(TimeTrunc.DAY);
      if (!dayEntries.length) {
        throw new NotFoundException('No data available yet. Ingestion may be in progress.');
      }
      return {
        datetime: dayEntries[0].datetime.toISOString(),
        timeTrunc: TimeTrunc.DAY,
        data: dayEntries.map(this.mapEntry),
      };
    }

    return {
      datetime: entries[0].datetime.toISOString(),
      timeTrunc: TimeTrunc.HOUR,
      data: entries.map(this.mapEntry),
    };
  }

  private mapEntry(entry: BalanceEntry): BalanceEntryDto {
    return {
      id: entry.id,
      value: Number(entry.value),
      percentage: entry.percentage ? Number(entry.percentage) : undefined,
      datetime: entry.datetime.toISOString(),
      timeTrunc: entry.timeTrunc,
      energySource: {
        id: entry.energySource.id,
        type: entry.energySource.type,
        title: entry.energySource.title,
        groupId: entry.energySource.groupId,
        color: entry.energySource.color,
        magnitude: entry.energySource.magnitude,
      },
    };
  }
}



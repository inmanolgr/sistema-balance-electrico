import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BalanceService } from './balance.service';
import { BalanceRepository } from './balance.repository';
import { QueryBalanceDto } from './dto/query-balance.dto';
import { BalanceEntry, TimeTrunc } from './entities/balance-entry.entity';
import { EnergySource } from './entities/energy-source.entity';

const mockEnergySource: EnergySource = {
  id: 1,
  type: 'Nuclear',
  title: 'Nuclear',
  groupId: 'No-Renovable',
  color: '#464394',
  magnitude: 'GWh',
  createdAt: new Date('2024-01-01'),
  entries: [],
};

const makeEntry = (overrides: Partial<BalanceEntry> = {}): BalanceEntry => ({
  id: 1,
  energySource: mockEnergySource,
  value: 1234.5 as unknown as number,
  percentage: 0.21 as unknown as number,
  datetime: new Date('2024-01-15T00:00:00Z'),
  timeTrunc: TimeTrunc.DAY,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('BalanceService', () => {
  let service: BalanceService;
  let repo: jest.Mocked<BalanceRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findByDateRange: jest.fn(),
      findAllSources: jest.fn(),
      findLatestSnapshot: jest.fn(),
      getLastIngestionTime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        { provide: BalanceRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
    repo = module.get(BalanceRepository);
  });

  describe('getBalance', () => {
    it('returns mapped entries with metadata', async () => {
      repo.findByDateRange.mockResolvedValue([makeEntry()]);
      repo.getLastIngestionTime.mockResolvedValue(new Date());

      const query: QueryBalanceDto = {
        start_date: '2024-01-01T00:00',
        end_date: '2024-01-31T23:59',
        time_trunc: TimeTrunc.DAY,
      };

      const result = await service.getBalance(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.timeTrunc).toBe(TimeTrunc.DAY);
      expect(result.lastIngestion).toBeDefined();
    });

    it('maps numeric values correctly from string decimal columns', async () => {
      repo.findByDateRange.mockResolvedValue([makeEntry({ value: '1234.5' as unknown as number })]);
      repo.getLastIngestionTime.mockResolvedValue(null);

      const query: QueryBalanceDto = {
        start_date: '2024-01-01T00:00',
        end_date: '2024-01-31T23:59',
        time_trunc: TimeTrunc.DAY,
      };

      const result = await service.getBalance(query);
      expect(typeof result.data[0].value).toBe('number');
    });

    it('returns empty data array when no entries found', async () => {
      repo.findByDateRange.mockResolvedValue([]);
      repo.getLastIngestionTime.mockResolvedValue(null);

      const query: QueryBalanceDto = {
        start_date: '2024-01-01T00:00',
        end_date: '2024-01-31T23:59',
        time_trunc: TimeTrunc.DAY,
      };

      const result = await service.getBalance(query);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getSources', () => {
    it('returns all sources with count', async () => {
      repo.findAllSources.mockResolvedValue([mockEnergySource]);
      const result = await service.getSources();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].title).toBe('Nuclear');
    });

    it('returns groupId in source data', async () => {
      repo.findAllSources.mockResolvedValue([mockEnergySource]);
      const result = await service.getSources();
      expect(result.data[0].groupId).toBe('No-Renovable');
    });
  });

  describe('getLatest', () => {
    it('returns latest hourly snapshot when available', async () => {
      repo.findLatestSnapshot.mockResolvedValueOnce([makeEntry({ timeTrunc: TimeTrunc.HOUR })]);
      const result = await service.getLatest();
      expect(result.timeTrunc).toBe(TimeTrunc.HOUR);
      expect(result.data).toHaveLength(1);
    });

    it('falls back to daily snapshot when no hourly data', async () => {
      repo.findLatestSnapshot
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeEntry({ timeTrunc: TimeTrunc.DAY })]);

      const result = await service.getLatest();
      expect(result.timeTrunc).toBe(TimeTrunc.DAY);
    });

    it('throws NotFoundException when no data exists at all', async () => {
      repo.findLatestSnapshot.mockResolvedValue([]);
      await expect(service.getLatest()).rejects.toThrow(NotFoundException);
    });
  });
});



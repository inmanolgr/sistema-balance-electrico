import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ReeApiClient } from './ree-api.client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ReeApiClient', () => {
  let client: ReeApiClient;

  const mockConfigService = {
    get: (key: string, fallback?: unknown) => {
      if (key === 'REE_API_BASE_URL') return 'https://apidatos.ree.es';
      return fallback;
    },
  };

  const mockAxiosInstance = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReeApiClient,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    client = module.get<ReeApiClient>(ReeApiClient);
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('calls the correct endpoint with params', async () => {
    const mockData = { data: {}, included: [] };
    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

    const result = await client.fetchBalance({
      start_date: '2024-01-01T00:00',
      end_date: '2024-01-31T23:59',
      time_trunc: 'day',
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/es/datos/balance/balance-electrico',
      expect.objectContaining({
        params: {
          start_date: '2024-01-01T00:00',
          end_date: '2024-01-31T23:59',
          time_trunc: 'day',
        },
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('retries on 5xx server errors', async () => {
    const serverError = { response: { status: 500 } };
    mockAxiosInstance.get
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: { data: {}, included: [] } });

    const result = await client.fetchBalance({
      start_date: '2024-01-01T00:00',
      end_date: '2024-01-01T23:59',
      time_trunc: 'hour',
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    expect(result).toBeDefined();
  });

  it('does not retry on 4xx client errors', async () => {
    const clientError = { response: { status: 400, data: { message: 'Bad params' } } };
    mockAxiosInstance.get.mockRejectedValueOnce(clientError);

    await expect(
      client.fetchBalance({
        start_date: '2024-01-01T00:00',
        end_date: '2024-01-01T23:59',
        time_trunc: 'hour',
      }),
    ).rejects.toThrow('REE API client error 400');

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    const networkError = new Error('Network timeout');
    mockAxiosInstance.get.mockRejectedValue(networkError);

    await expect(
      client.fetchBalance({
        start_date: '2024-01-01T00:00',
        end_date: '2024-01-01T23:59',
        time_trunc: 'hour',
      }),
    ).rejects.toThrow('REE API unavailable after 3 attempts');
  });
});



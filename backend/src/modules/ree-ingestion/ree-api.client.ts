import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ReeApiResponse, ReeQueryParams } from './ree-api.types';

@Injectable()
export class ReeApiClient {
  private readonly logger = new Logger(ReeApiClient.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>(
      'REE_API_BASE_URL',
      'https://apidatos.ree.es',
    );

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15_000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchBalance(params: ReeQueryParams): Promise<ReeApiResponse> {
    const endpoint = '/es/datos/balance/balance-electrico';
    const maxRetries = 3;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `REE fetch attempt ${attempt}/${maxRetries} — ` +
            `${params.start_date} → ${params.end_date} [${params.time_trunc}]`,
        );

        const response = await this.http.get<ReeApiResponse>(endpoint, {
          params: {
            start_date: params.start_date,
            end_date: params.end_date,
            time_trunc: params.time_trunc,
          },
        });

        this.logger.debug(
          `REE responded with ${response.data.included?.length ?? 0} sources`,
        );

        return response.data;
      } catch (err) {
        lastError = err as Error;
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        this.logger.warn(
          `REE API error on attempt ${attempt}: ` +
            `${status ? `HTTP ${status}` : (err as Error).message}`,
        );

        // Don't retry on 4xx client errors (bad params)
        if (status && status >= 400 && status < 500) {
          throw new Error(
            `REE API client error ${status}: ${JSON.stringify(axiosErr.response?.data)}`,
          );
        }

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1); // exponential backoff
          this.logger.debug(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`REE API unavailable after ${maxRetries} attempts: ${lastError.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

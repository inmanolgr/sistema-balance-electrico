import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReeIngestionService } from './ree-ingestion.service';
import { ReeApiClient } from './ree-api.client';
import { ReeDataMapper } from './ree-data.mapper';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [HttpModule, BalanceModule],
  providers: [ReeIngestionService, ReeApiClient, ReeDataMapper],
  exports: [ReeIngestionService],
})
export class ReeIngestionModule {}

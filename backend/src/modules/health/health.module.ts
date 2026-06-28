import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReeIngestionModule } from '../ree-ingestion/ree-ingestion.module';

@Module({
  imports: [ReeIngestionModule],
  controllers: [HealthController],
})
export class HealthModule {}



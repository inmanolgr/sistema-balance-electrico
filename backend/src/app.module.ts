import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { BalanceModule } from './modules/balance/balance.module';
import { ReeIngestionModule } from './modules/ree-ingestion/ree-ingestion.module';
import { HealthModule } from './modules/health/health.module';
import { EnergySource } from './modules/balance/entities/energy-source.entity';
import { BalanceEntry } from './modules/balance/entities/balance-entry.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        database: config.get<string>('DB_NAME', 'ree_balance'),
        username: config.get<string>('DB_USER', 'ree_user'),
        password: config.get<string>('DB_PASSWORD', 'ree_secret_2024'),
        entities: [EnergySource, BalanceEntry],
        synchronize: true,
        migrationsRun: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    BalanceModule,
    ReeIngestionModule,
    HealthModule,
  ],
})
export class AppModule {}

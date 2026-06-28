import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { BalanceRepository } from './balance.repository';
import { EnergySource } from './entities/energy-source.entity';
import { BalanceEntry } from './entities/balance-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EnergySource, BalanceEntry])],
  controllers: [BalanceController],
  providers: [BalanceService, BalanceRepository],
  exports: [BalanceRepository],
})
export class BalanceModule {}

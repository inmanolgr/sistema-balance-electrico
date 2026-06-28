import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { EnergySource } from './energy-source.entity';

export enum TimeTrunc {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

@Entity('balance_entries')
@Unique(['energySource', 'datetime', 'timeTrunc'])
@Index(['datetime', 'timeTrunc'])          // índice compuesto — query principal
@Index(['energySource', 'datetime'])
export class BalanceEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => EnergySource, (source) => source.entries, { eager: false })
  @JoinColumn({ name: 'energy_source_id' })
  energySource!: EnergySource;

  /** Valor numérico en la magnitud de la fuente (GWh / MWh) */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value!: number;

  /** Porcentaje sobre el total del mix en ese instante */
  @Column({ type: 'decimal', precision: 8, scale: 6, nullable: true })
  percentage?: number;

  /** Timestamp de la medición — con timezone */
  @Column({ type: 'timestamptz' })
  datetime!: Date;

  /** Granularidad con la que se ingirió */
  @Column({ name: 'time_trunc', type: 'enum', enum: TimeTrunc })
  timeTrunc!: TimeTrunc;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}



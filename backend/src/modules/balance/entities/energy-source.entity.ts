import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Unique,
  Index,
} from 'typeorm';
import { BalanceEntry } from './balance-entry.entity';

@Entity('energy_sources')
@Unique(['type', 'title'])
@Index(['type'])   // acelera joins y filtros por categoría
export class EnergySource {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Tipo REE: "Eólica", "Nuclear", "Demanda en b.c.", etc. */
  @Column({ length: 100 })
  type!: string;

  /** Etiqueta de display */
  @Column({ length: 100 })
  title!: string;

  /** groupId tal como viene en la respuesta REE: "Renovable", "No-Renovable", etc. */
  @Column({ name: 'group_id', length: 50, nullable: true })
  groupId?: string;

  /** Color hexadecimal de la fuente (según REE) */
  @Column({ length: 10, nullable: true })
  color?: string;

  /** Magnitud: "GWh", "MWh" */
  @Column({ length: 20, nullable: true })
  magnitude?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => BalanceEntry, (entry) => entry.energySource)
  entries!: BalanceEntry[];
}



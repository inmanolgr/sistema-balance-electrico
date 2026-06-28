import { ApiProperty } from '@nestjs/swagger';

export class EnergySourceDto {
  @ApiProperty() id!: number;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false }) groupId?: string;
  @ApiProperty({ required: false }) color?: string;
  @ApiProperty({ required: false }) magnitude?: string;
}

export class BalanceEntryDto {
  @ApiProperty() id!: number;
  @ApiProperty() value!: number;
  @ApiProperty({ required: false }) percentage?: number;
  @ApiProperty() datetime!: string;
  @ApiProperty() timeTrunc!: string;
  @ApiProperty({ type: EnergySourceDto }) energySource!: EnergySourceDto;
}

export class BalanceResponseDto {
  @ApiProperty({ type: [BalanceEntryDto] })
  data!: BalanceEntryDto[];

  @ApiProperty() total!: number;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() timeTrunc!: string;
  @ApiProperty() lastIngestion?: string;
}

export class SourcesResponseDto {
  @ApiProperty({ type: [EnergySourceDto] })
  data!: EnergySourceDto[];
  @ApiProperty() total!: number;
}

export class LatestResponseDto {
  @ApiProperty() datetime!: string;
  @ApiProperty() timeTrunc!: string;
  @ApiProperty({ type: [BalanceEntryDto] }) data!: BalanceEntryDto[];
}

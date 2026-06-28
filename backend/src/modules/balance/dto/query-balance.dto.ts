import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { TimeTrunc } from '../entities/balance-entry.entity';

@ValidatorConstraint({ name: 'endAfterStart', async: false })
class EndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments): boolean {
    const obj = args.object as QueryBalanceDto;
    if (!obj.start_date || !endDate) return true;
    return new Date(endDate) > new Date(obj.start_date);
  }
  defaultMessage(): string {
    return 'end_date must be after start_date';
  }
}

export class QueryBalanceDto {
  @ApiProperty({
    description: 'Fecha de inicio (ISO 8601)',
    example: '2024-01-01T00:00',
  })
  @IsNotEmpty()
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    description: 'Fecha de fin (ISO 8601)',
    example: '2024-01-31T23:59',
  })
  @IsNotEmpty()
  @IsDateString()
  @Validate(EndAfterStartConstraint)
  end_date!: string;

  @ApiPropertyOptional({
    description: 'Granularidad temporal',
    enum: TimeTrunc,
    default: TimeTrunc.DAY,
  })
  @IsOptional()
  @IsEnum(TimeTrunc)
  time_trunc: TimeTrunc = TimeTrunc.DAY;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de fuente',
    example: 'Nuclear',
  })
  @IsOptional()
  @IsString()
  source_type?: string;
}



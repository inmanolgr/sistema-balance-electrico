import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BalanceService } from './balance.service';
import { QueryBalanceDto } from './dto/query-balance.dto';
import {
  BalanceResponseDto,
  SourcesResponseDto,
  LatestResponseDto,
} from './dto/balance-response.dto';

@ApiTags('balance')
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener balance eléctrico por rango de fechas',
    description:
      'Devuelve los registros de balance eléctrico almacenados en BD para el rango especificado.',
  })
  @ApiResponse({ status: 200, type: BalanceResponseDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  async getBalance(@Query() query: QueryBalanceDto): Promise<BalanceResponseDto> {
    return this.balanceService.getBalance(query);
  }

  @Get('sources')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Catálogo de fuentes de energía disponibles',
    description: 'Lista todas las categorías y tipos de energía conocidos en el sistema.',
  })
  @ApiResponse({ status: 200, type: SourcesResponseDto })
  async getSources(): Promise<SourcesResponseDto> {
    return this.balanceService.getSources();
  }

  @Get('latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Último snapshot disponible',
    description: 'Devuelve el registro más reciente disponible en base de datos.',
  })
  @ApiResponse({ status: 200, type: LatestResponseDto })
  @ApiResponse({ status: 404, description: 'Sin datos disponibles todavía' })
  async getLatest(): Promise<LatestResponseDto> {
    return this.balanceService.getLatest();
  }
}

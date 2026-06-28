import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReeIngestionService } from '../ree-ingestion/ree-ingestion.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly ingestion: ReeIngestionService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del sistema' })
  check() {
    return {
      status: 'ok',
      ingestion: this.ingestion.getIngestionStatus(),
      version: '1.0.0',
    };
  }
}



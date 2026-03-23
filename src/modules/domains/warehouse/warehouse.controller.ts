import { Controller } from '@nestjs/common';
import { WarehouseService } from './warehouse.service.js';

@Controller('domains/warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}
}

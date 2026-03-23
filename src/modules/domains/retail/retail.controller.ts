import { Controller } from '@nestjs/common';
import { RetailService } from './retail.service.js';

@Controller('domains/retail')
export class RetailController {
  constructor(private readonly retailService: RetailService) {}
}

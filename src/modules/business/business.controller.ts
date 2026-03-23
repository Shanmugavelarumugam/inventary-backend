import { Controller } from '@nestjs/common';
import { BusinessService } from './business.service.js';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}
}

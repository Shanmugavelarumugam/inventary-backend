import { Controller } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service.js';

@Controller('domains/pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}
}

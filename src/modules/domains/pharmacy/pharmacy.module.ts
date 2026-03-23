import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service.js';
import { PharmacyController } from './pharmacy.controller.js';

@Module({
  controllers: [PharmacyController],
  providers: [PharmacyService],
})
export class PharmacyModule {}

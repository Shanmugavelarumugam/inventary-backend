import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
}

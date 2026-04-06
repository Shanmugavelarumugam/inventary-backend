import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity.js';
import { Unit } from '../../database/entities/unit.entity.js';
import { Brand } from '../../database/entities/brand.entity.js';


@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  // Categories
  async getCategories(businessId: string) {
    return this.categoryRepository.find({ 
      where: { businessId }, 
      relations: ['parent'],
      order: { displayOrder: 'ASC', name: 'ASC' } 
    });
  }

  async createCategory(businessId: string, name: string, data: any) {
    const category = this.categoryRepository.create({ 
      ...data,
      name, 
      businessId 
    });
    return this.categoryRepository.save(category);
  }

  async updateCategory(id: string, businessId: string, data: any) {
    const category = await this.categoryRepository.findOne({ where: { id, businessId } });
    if (!category) throw new Error('Category not found');
    
    // Explicitly handle parentCategoryId to avoid issues with null
    if (data.parentCategoryId === '') {
      data.parentCategoryId = null;
    }

    Object.assign(category, data);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string, businessId: string) {
    const category = await this.categoryRepository.findOne({ 
      where: { id, businessId },
      relations: ['products', 'children']
    });
    if (!category) throw new Error('Category not found');
    
    if (category.products && category.products.length > 0) {
      throw new Error('Cannot delete category with linked products');
    }
    
    if (category.children && category.children.length > 0) {
      throw new Error('Cannot delete category with sub-categories');
    }

    return this.categoryRepository.remove(category);
  }

  // Units
  async getUnits(businessId: string) {
    return this.unitRepository.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async createUnit(businessId: string, name: string, shortName?: string) {
    const unit = this.unitRepository.create({ name, shortName, businessId });
    return this.unitRepository.save(unit);
  }

  async updateUnit(id: string, businessId: string, data: any) {
    const unit = await this.unitRepository.findOne({ where: { id, businessId } });
    if (!unit) throw new Error('Unit not found');
    Object.assign(unit, data);
    return this.unitRepository.save(unit);
  }

  async deleteUnit(id: string, businessId: string) {
    const unit = await this.unitRepository.findOne({ where: { id, businessId } });
    if (!unit) throw new Error('Unit not found');
    return this.unitRepository.remove(unit);
  }

  // Brands
  async getBrands(businessId: string) {
    return this.brandRepository.find({ where: { businessId }, order: { name: 'ASC' } });
  }

  async createBrand(businessId: string, name: string) {
    const brand = this.brandRepository.create({ name, businessId });
    return this.brandRepository.save(brand);
  }

  async updateBrand(id: string, businessId: string, data: any) {
    const brand = await this.brandRepository.findOne({ where: { id, businessId } });
    if (!brand) throw new Error('Brand not found');
    Object.assign(brand, data);
    return this.brandRepository.save(brand);
  }

  async deleteBrand(id: string, businessId: string) {
    const brand = await this.brandRepository.findOne({ where: { id, businessId } });
    if (!brand) throw new Error('Brand not found');
    return this.brandRepository.remove(brand);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../../../database/entities/system-config.entity.js';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  async getConfigs() {
    const configs = await this.configRepository.find();
    return configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  }

  async updateConfig(key: string, value: string) {
    let config = await this.configRepository.findOne({ where: { key } });
    if (config) {
      config.value = value;
    } else {
      config = this.configRepository.create({ key, value });
    }
    return this.configRepository.save(config);
  }

  async setMany(configs: Record<string, string>) {
    for (const [key, value] of Object.entries(configs)) {
      await this.updateConfig(key, value);
    }
    return this.getConfigs();
  }

  async isMaintenanceMode(): Promise<boolean> {
    const config = await this.configRepository.findOne({
      where: { key: 'maintenance_mode' },
    });
    return config?.value === 'true';
  }
}

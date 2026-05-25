import { DataSource } from 'typeorm';
import { Business } from '../src/database/entities/business.entity.js';
import { User } from '../src/database/entities/user.entity.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'inventory_db',
    entities: [Business, User],
    synchronize: false,
  });

  await ds.initialize();
  
  const businessRepo = ds.getRepository(Business);
  const userRepo = ds.getRepository(User);

  const businesses = await businessRepo.find();
  console.log('--- ALL BUSINESSES ---');
  console.table(businesses.map(b => ({ id: b.id, name: b.name, code: b.companyCode, status: b.status })));

  const users = await userRepo.find({ relations: ['business'] });
  console.log('--- ALL USERS ---');
  console.table(users.map(u => ({ id: u.id, email: u.email, business: u.business?.companyCode || 'PLATFORM' })));

  await ds.destroy();
}

checkDb().catch(console.error);

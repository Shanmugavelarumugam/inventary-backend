import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './src/database/entities/user.entity.js';
import { Role } from './src/database/entities/role.entity.js';
import { Repository } from 'typeorm';

async function checkUser() {
  const email = 'rohit@gmail.com';
  console.log(`Checking user: ${email}`);
  
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  
  const user = await userRepository.findOne({ 
      where: { email },
      relations: ['role', 'role.permissions']
  });

  if (!user) {
    console.log(`User ${email} NOT FOUND in database.`);
  } else {
    console.log('--- User Found ---');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Business ID: ${user.businessId}`);
    console.log(`Role ID: ${user.roleId}`);
    console.log(`Role Name: ${user.role?.name || 'NULL'}`);
    if (user.role?.permissions) {
        console.log(`Permissions (${user.role.permissions.length}): ${user.role.permissions.map(p => p.key).join(', ')}`);
    } else {
        console.log('Permissions: NONE');
    }
  }

  await app.close();
  process.exit(0);
}

checkUser().catch(err => {
  console.error('Error during check:', err);
  process.exit(1);
});

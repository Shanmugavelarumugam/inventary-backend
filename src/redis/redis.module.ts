import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          lazyConnect: true,
        });
        client.on('error', (err) => {
          console.warn(
            '⚠️ [Redis Module] Connection failed or server offline:',
            err.message,
          );
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

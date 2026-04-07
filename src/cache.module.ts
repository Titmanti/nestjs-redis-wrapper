// src/cache.module.ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@liaoliaots/nestjs-redis';
import { CacheService } from './cache.service';
import { CACHE_MODULE_OPTIONS } from './constants';
import { createCacheModuleAsyncProviders, createCacheModuleProvider } from './cache.provider';
import { CacheModuleAsyncOptions, CacheModuleOptions } from './interfaces';

@Global()
@Module({})
export class CacheModule {
  static forRoot(options: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        NestRedisModule.forRoot({ config: options })
      ],
      providers: createCacheModuleProvider(options),
      exports: [CacheService],
    };
  }

  static forRootAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [
        ...(options.imports || []),
        NestRedisModule.forRootAsync({
          imports: options.imports || [],
          useFactory: async (cacheOptions: any) => ({
            config: cacheOptions as CacheModuleOptions
          }),
          inject: [CACHE_MODULE_OPTIONS],
        }),
      ],
      providers: createCacheModuleAsyncProviders(options),
      exports: [CacheService],
    };
  }
}

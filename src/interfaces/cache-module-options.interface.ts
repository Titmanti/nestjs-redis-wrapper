// src/interfaces/cache-module-options.interface.ts
import { ModuleMetadata, Type } from '@nestjs/common';
import type { RedisOptions } from 'ioredis';

type CacheModuleOptions = RedisOptions;

interface CacheModuleOptionsFactory {
  createCacheOptions(): Promise<CacheModuleOptions> | CacheModuleOptions;
}

interface CacheModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<CacheModuleOptionsFactory>;
  useClass?: Type<CacheModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<CacheModuleOptions> | CacheModuleOptions;
  inject?: any[];
}

export type { CacheModuleOptions, CacheModuleAsyncOptions, CacheModuleOptionsFactory}

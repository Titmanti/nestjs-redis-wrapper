// src/cache.provider.ts
import { Provider } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { CACHE_MODULE_OPTIONS } from "./constants"
import { CacheModuleAsyncOptions, CacheModuleOptions, CacheModuleOptionsFactory } from "./interfaces";

export function createCacheModuleProvider(options: CacheModuleOptions): Provider[] {
  return [
    {
      provide: CACHE_MODULE_OPTIONS,
      useValue: options,
    },
    CacheService,
  ];
}

export function createCacheModuleAsyncProviders(options: CacheModuleAsyncOptions): Provider[] {
  if (options.useExisting || options.useFactory) {
    return [createCacheModuleAsyncOptionsProvider(options), CacheService];
  }

  if (!options.useClass) {
    throw new Error('Invalid CacheModule configuration: useClass is missing');
  }

  return [
    createCacheModuleAsyncOptionsProvider(options),
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
    CacheService,
  ];
}

function createCacheModuleAsyncOptionsProvider(options: CacheModuleAsyncOptions): Provider {
  if (options.useFactory) {
    return {
      provide: CACHE_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }

  const injectToken = options.useExisting || options.useClass;

  if (!injectToken) {
    throw new Error('Invalid CacheModule configuration: missing provider token');
  }

  return {
    provide: CACHE_MODULE_OPTIONS,
    useFactory: async (optionsFactory: CacheModuleOptionsFactory) =>
      await optionsFactory.createCacheOptions(),
    inject: [injectToken],
  };
}

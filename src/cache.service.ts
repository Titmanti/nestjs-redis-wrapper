// src/cache.service.ts
import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { RedisService as NestRedisService } from '@liaoliaots/nestjs-redis';
import type { ICacheResponse } from "./interfaces";

/**
 * Service for interacting with Redis cache in NestJS applications.
 * Provides a standardized response wrapper and helper methods for JSON and atomic operations.
 */
@Injectable()
export class CacheService {
  private readonly client: Redis;
  private readonly logger = new Logger(CacheService.name);

  public constructor(
    private readonly service: NestRedisService
  ) {
    this.client = this.service.getOrThrow();
  }

  // --- SET METHODS ---

  /**
   * Stores a primitive value (string or number) in Redis.
   * * @param key - The unique identifier for the cached item.
   * @param value - The string or number to store.
   * @param ttl - Time-to-live in seconds. Defaults to 300s (5 minutes).
   * @returns A promise resolving to an object indicating success or the caught error.
   */
  public async set(key: string, value: string | number, ttl = 300): Promise<Omit<ICacheResponse<never>, 'data'>> {
    try {
      const result = await this.client.set(key, value, 'EX', ttl);
      this.logger.debug(`Set String: ${key}`);
      return { success: result === 'OK', error: null };
    } catch (error) {
      this.logger.error(`Failed to set key "${key}"`, (error as Error).stack);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Atomic "Set if Not Exists" operation.
   * Useful for basic distributed locks or ensuring an operation isn't duplicated.
   * * @param key - The unique identifier.
   * @param value - The value to store if the key doesn't exist.
   * @param ttl - Expiration time in seconds. Defaults to 60s.
   * @returns `data: true` if the key was set, `false` if it already existed.
   */
  public async setNx(key: string, value: string | number, ttl = 60): Promise<ICacheResponse<boolean>> {
    try {
      const result = await this.client.set(key, value, 'EX', ttl, 'NX');
      const success = result === 'OK';
      this.logger.debug(`SetNX: ${key} -> ${success}`);
      return { data: success, success: true, error: null };
    } catch (error) {
      this.logger.error(`SetNX failed: ${key}`, (error as Error).stack);
      return { data: false, success: false, error: error as Error };
    }
  }

  /**
   * Serializes an object/array to JSON and stores it in Redis.
   * * @template T - The type of the object being stored.
   * @param key - The unique identifier.
   * @param value - The data to be stringified.
   * @param ttl - Expiration time in seconds. Defaults to 600s (10 minutes).
   * @returns Success status.
   */
  public async setJson<T>(key: string, value: T, ttl = 600): Promise<Omit<ICacheResponse<never>, 'data'>> {
    try {
      const payload = JSON.stringify(value);
      const result = await this.client.set(key, payload, 'EX', ttl);
      this.logger.debug(`Set JSON: ${key}`);
      return { success: result === 'OK', error: null };
    } catch (error) {
      this.logger.error(`Failed to set JSON key "${key}"`, (error as Error).stack);
      return { success: false, error: error as Error };
    }
  }

  // --- GET METHODS ---

  /**
   * Retrieves a raw string value from Redis.
   * * @param key - The unique identifier.
   * @returns The string value or `null` if not found.
   */
  public async get(key: string): Promise<ICacheResponse<string>> {
    try {
      const data = await this.client.get(key);
      this.logger.debug(`Get: ${key} -> ${data ? 'Hit' : 'Miss'}`);
      return { data, success: true, error: null };
    } catch (error) {
      this.logger.error(`Failed to get key "${key}"`, (error as Error).stack);
      return { data: null, success: false, error: error as Error };
    }
  }

  /**
   * Retrieves and parses a JSON-stored value.
   * * @template T - The expected type of the parsed data.
   * @param key - The unique identifier.
   * @returns The parsed object of type T or `null`.
   */
  public async getJson<T>(key: string): Promise<ICacheResponse<T>> {
    try {
      const data = await this.client.get(key);
      if (!data) return { data: null, success: true, error: null };

      const parsed = JSON.parse(data) as T;
      this.logger.debug(`Get JSON: ${key} -> Hit`);
      return { data: parsed, success: true, error: null };
    } catch (error) {
      this.logger.error(`Failed to get/parse JSON key "${key}"`, (error as Error).stack);
      return { data: null, success: false, error: error as Error };
    }
  }

  /**
   * Retrieves multiple JSON objects in a single command (MGET).
   * Filters out any keys that were not found.
   * * @template T - The expected type of the items in the array.
   * @param keys - Array of keys to fetch.
   * @returns An array of parsed objects.
   */
  public async getManyJson<T>(keys: string[]): Promise<ICacheResponse<T[]>> {
    try {
      if (keys.length === 0) return { data: [], success: true, error: null };

      const results = await this.client.mget(...keys);
      const parsed = results
        .map(item => item ? JSON.parse(item) as T : null)
        .filter((item): item is T => item !== null);

      this.logger.debug(`MGet JSON: Requested ${keys.length}, Found ${parsed.length}`);
      return { data: parsed, success: true, error: null };
    } catch (error) {
      this.logger.error(`MGet JSON failed`, (error as Error).stack);
      return { data: null, success: false, error: error as Error };
    }
  }

  // --- DELETE METHODS ---

  /**
   * Removes a specific key from the cache.
   */
  public async delete(key: string): Promise<Omit<ICacheResponse<never>, 'data'>> {
    try {
      await this.client.del(key);
      this.logger.debug(`Deleted key: ${key}`);
      return { success: true, error: null };
    } catch (error) {
      this.logger.error(`Failed to delete key "${key}"`, (error as Error).stack);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Deletes all keys matching a glob-style pattern (e.g., "user:*").
   * @warning This can be slow on large databases as it uses the KEYS command.
   */
  public async deletePattern(pattern: string): Promise<Omit<ICacheResponse<never>, 'data'>> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      this.logger.debug(`Delete pattern "${pattern}": Removed ${keys.length} keys`);
      return { success: true, error: null };
    } catch (error) {
      this.logger.error(`Delete pattern failed: ${pattern}`, (error as Error).stack);
      return { success: false, error: error as Error };
    }
  }

  // --- LOGIC WRAPPERS ---

  /**
   * Implementation of the Cache-Aside pattern.
   * Checks the cache first; if it's a miss, executes the provided function,
   * caches the result, and returns it.
   * * @template T - The type of data being handled.
   * @param key - Unique cache key.
   * @param fetchFn - Async function to retrieve data if cache is empty.
   * @param ttl - Expiration time for the new cache entry. Defaults to 300s.
   */
  public async wrap<T>(key: string, fetchFn: () => Promise<T>, ttl = 300): Promise<ICacheResponse<T>> {
    const { data: cached } = await this.getJson<T>(key);

    if (cached) return { data: cached, success: true, error: null };

    try {
      const freshData = await fetchFn();
      if (freshData) await this.setJson(key, freshData, ttl);
      return { data: freshData, success: true, error: null };
    } catch (error) {
      this.logger.error(`Cache-Wrap Fetch failed for key "${key}"`, (error as Error).stack);
      return { data: null, success: false, error: error as Error };
    }
  }

  /**
   * Atomically increments the number stored at the key by 1.
   * If the key does not exist, it is set to 0 before the operation.
   */
  async increment(key: string): Promise<ICacheResponse<number>> {
    try {
      const newValue = await this.client.incr(key);
      return { data: newValue, success: true, error: null };
    } catch (error) {
      this.logger.error(`Increment failed: ${key}`, (error as Error).stack);
      return { data: null, success: false, error: error as Error };
    }
  }

  /**
   * Checks if a key exists in Redis.
   */
  async exists(key: string): Promise<ICacheResponse<boolean>> {
    try {
      const result = await this.client.exists(key);
      return { data: result === 1, success: true, error: null };
    } catch (error) {
      this.logger.error(`Exists check failed: ${key}`, (error as Error).stack);
      return { data: false, success: false, error: error as Error };
    }
  }

  /**
   * Returns the remaining time-to-live of a key in seconds.
   * @returns TTL in seconds, -2 if key doesn't exist, -1 if key has no expiry.
   */
  async getTtl(key: string): Promise<ICacheResponse<number>> {
    try {
      const ttl = await this.client.ttl(key);
      return { data: ttl, success: true, error: null };
    } catch (error) {
      this.logger.error(`TTL check failed: ${key}`, (error as Error).stack);
      return { data: -2, success: false, error: error as Error };
    }
  }
}

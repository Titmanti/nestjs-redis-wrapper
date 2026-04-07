// src/interfaces/cache-response.interface.ts
/**
 * Standardized response structure for all CacheService operations.
 * * Provides a predictable way to handle results without relying on try-catch blocks
 * in the calling service.
 * * @template T - The type of data expected from the cache or fetch function.
 */
interface ICacheResponse<T> {
  /**
   * The retrieved or processed data.
   * Returns `null` if the key was not found or if an error occurred.
   */
  data: T | null;

  /**
   * Indicates if the operation was successful.
   * `true` means the data was successfully retrieved/set.
   * `false` means either a cache miss (in some contexts) or a Redis/Fetch failure.
   */
  success: boolean;

  /**
   * Contains the Error object if the operation failed.
   * This allows for graceful error handling and logging in the business logic.
   * Returns `null` if no errors occurred.
   */
  error: Error | null;
}

export type { ICacheResponse }

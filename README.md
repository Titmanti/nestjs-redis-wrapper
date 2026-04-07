# nestjs-redis-wrapper

<div align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
  <h3>Advanced Redis Caching for NestJS</h3>

  [![npm version](https://img.shields.io/npm/v/nestjs-redis-wrapper?style=flat-square)](https://www.npmjs.com/package/nestjs-redis-wrapper)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
  [![Build Status](https://img.shields.io/badge/status-active-success?style=flat-square)](https://github.com/tms-star/nestjs-cache)
</div>

---

## 🎯 Overview

**nestjs-redis-wrapper** is an advanced Redis wrapper for NestJS, built on top of [liaoliaots/nestjs-redis](https://github.com/liaoliaots/nestjs-redis). It provides a high-level cache service with **Cache-Aside pattern** support, standardized response handling, and full TypeScript support.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎯 **Flat Configuration** | Pass Redis parameters directly—no nested `config` blocks |
| 🛡️ **Predictable API** | All methods return `ICacheResponse<T>` for safe error handling |
| 🔄 **Cache-Aside Pattern** | Built-in `wrap()` method for automatic cache synchronization |
| 🪵 **Smart Logging** | Auto-integrates with NestJS Logger, Pino, Winston, etc. |
| 🚀 **TypeScript First** | Full type safety for all methods, options, and responses |
| ⚡ **High Performance** | Optimized for Redis operations with minimal overhead |

---

## 📦 Installation

Install the package and its required dependencies:

```bash
npm install nestjs-redis-wrapper @liaoliaots/nestjs-redis ioredis
```

Or with Yarn:

```bash
yarn add nestjs-redis-wrapper @liaoliaots/nestjs-redis ioredis
```

> **Prerequisites**: Ensure `@nestjs/common` and `@nestjs/core` are installed in your project.

---

## ⚙️ Configuration

### Asynchronous Registration (Recommended)

Use `forRootAsync()` to integrate seamlessly with NestJS `ConfigService`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from 'nestjs-redis-wrapper';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD'),
        db: config.get<number>('REDIS_DB', 0),
        // All ioredis options are available here
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 🚀 Usage

### Injecting CacheService

The `CacheService` can be injected into any NestJS provider:

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from 'nestjs-redis-wrapper';

@Injectable()
export class UserService {
  constructor(private readonly cache: CacheService) {}

  async getUser(id: string) {
    const result = await this.cache.getJson<User>(`user:${id}`);

    if (!result.success) {
      throw new Error(result.error?.message);
    }

    return result.data;
  }
}
```

### Cache-Aside Pattern (Recommended)

The `wrap()` method implements the **Cache-Aside pattern** automatically:

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from 'nestjs-redis-wrapper';

@Injectable()
export class UserService {
  constructor(
    private readonly cache: CacheService,
    private readonly userRepository: UserRepository,
  ) {}

  async getUser(id: string) {
    /**
     * Cache-Aside Pattern with wrap():
     * 1. Check cache for key
     * 2. On miss: execute fetch function
     * 3. Store result in Redis
     * 4. Return cached data
     */
    const result = await this.cache.wrap(
      `user:${id}`,
      async () => {
        return await this.userRepository.findOne(id);
      },
      600, // TTL: 10 minutes
    );

    if (!result.success) {
      this.logger.error(`Cache error for user:${id}`, result.error);
    }

    return result.data;
  }
}
```

---

## 📚 API Reference

### Storage Methods

Efficiently store data in Redis with automatic serialization:

| Method | Description | Default TTL | Return Type |
|--------|-------------|-------------|-------------|
| `set(key, value, ttl)` | Store a string or number | 300s | `ICacheResponse<boolean>` |
| `setJson(key, value, ttl)` | Serialize and store object/array | 600s | `ICacheResponse<boolean>` |
| `setNx(key, value, ttl)` | Atomic "Set if Not Exists" | 60s | `ICacheResponse<boolean>` |

**Example:**

```typescript
// Store a primitive value
await this.cache.set('session:123', 'active-user', 3600);

// Store a JSON object
await this.cache.setJson('profile:456', { name: 'John', role: 'admin' }, 1800);

// Atomic set-if-not-exists
const result = await this.cache.setNx('lock:process', 'locked', 60);
if (result.success && result.data) {
  console.log('Lock acquired!');
}
```

### Retrieval Methods

Fetch data from the cache with full type safety:

| Method | Description | Return Type |
|--------|-------------|-------------|
| `get(key)` | Get raw string value | `ICacheResponse<string \| null>` |
| `getJson<T>(key)` | Get deserialized object | `ICacheResponse<T \| null>` |
| `getManyJson<T>(keys)` | Get multiple objects (MGET) | `ICacheResponse<(T \| null)[]>` |
| `wrap(key, fn, ttl)` | Cache-Aside pattern wrapper | `ICacheResponse<T>` |

**Example:**

```typescript
// Get a raw string
const session = await this.cache.get('session:123');

// Get deserialized object with type safety
const profile = await this.cache.getJson<UserProfile>('profile:456');

// Get multiple values at once
const profiles = await this.cache.getManyJson<User>(['user:1', 'user:2', 'user:3']);

// Use wrap for automatic cache management
const user = await this.cache.wrap(
  'user:789',
  () => userRepository.findOne(789),
  1800,
);
```

### Utility Operations

Manage keys and perform atomic operations:

| Method | Description | Return Type |
|--------|-------------|-------------|
| `delete(key)` | Remove a specific key | `ICacheResponse<boolean>` |
| `deletePattern(pattern)` | Remove keys by glob pattern (e.g., `user:*`) | `ICacheResponse<number>` |
| `increment(key)` | Atomically increment numeric value | `ICacheResponse<number>` |
| `exists(key)` | Check if key exists | `ICacheResponse<boolean>` |
| `getTtl(key)` | Get remaining time-to-live | `ICacheResponse<number>` |

**Example:**

```typescript
// Delete a single key
await this.cache.delete('session:123');

// Delete multiple keys matching a pattern
const deleted = await this.cache.deletePattern('session:*');
console.log(`Deleted ${deleted.data} keys`);

// Atomic increment for counters
const views = await this.cache.increment('page:views:home');
console.log(`Total views: ${views.data}`);

// Check key existence
const exists = await this.cache.exists('user:789');

// Get remaining TTL in seconds
const ttl = await this.cache.getTtl('session:abc');
```

---

## 📋 Response Structure

All service operations return a standardized response object:

```typescript
interface ICacheResponse<T> {
  data: T | null;        // Retrieved data (null on miss/error)
  success: boolean;      // Operation status
  error: Error | null;   // Error object (null if success)
}
```

### Safe Error Handling

No need for `try-catch` blocks—handle errors gracefully:

```typescript
const result = await this.cache.getJson<User>('user:123');

if (result.success) {
  console.log('User found:', result.data);
} else {
  console.error('Cache error:', result.error?.message);
  // Fallback logic here
}
```

---

## 🔧 Advanced Examples

### Rate Limiting

```typescript
async checkRateLimit(userId: string, limit: number = 100): Promise<boolean> {
  const key = `rate-limit:${userId}`;
  const result = await this.cache.increment(key);

  if (result.data === 1) {
    // First request this window
    await this.cache.setTtl(key, 3600); // 1 hour window
  }

  return result.data! <= limit;
}
```

### Session Management

```typescript
async createSession(userId: string, data: SessionData): Promise<string> {
  const sessionId = generateId();
  const result = await this.cache.setJson(
    `session:${sessionId}`,
    { userId, ...data },
    86400, // 24 hours
  );

  return result.success ? sessionId : null;
}
```

### Cache Invalidation

```typescript
async invalidateUserCache(userId: string): Promise<void> {
  await this.cache.deletePattern(`user:${userId}:*`);
}
```

---

## 🎨 Features in Detail

### Flat Configuration
No nested structures—pass Redis options directly to `forRootAsync()`. All standard ioredis options are supported.

### Predictable API
Standardized `ICacheResponse` structure across all methods eliminates guesswork and improves code reliability.

### Cache-Aside Pattern
The `wrap()` method implements cache-aside automatically, synchronizing your cache with database reads effortlessly.

### Smart Logging
Seamlessly integrates with NestJS Logger. If Pino, Winston, or another logger is configured, logs are routed there automatically.

### TypeScript First
Full generic type support for all methods—get compile-time safety for your cached data.

---

## 📄 License

MIT © 2026. Developed for the **TMS Star Project**.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to improve this package.

---

## 📞 Support

For issues, questions, or suggestions, please open an issue on the repository.

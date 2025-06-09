/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/redis.ts
import Redis from 'ioredis';

// Configuration simple
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0'),
  retryStrategy: () => 100, // Retry delay of 100ms
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Gestion des événements
redis.on('connect', () => console.log('✅ Redis connecté'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// Fonctions utilitaires simples
export const redisClient = {
  // Cache basique
  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  // Incrémentation (pour compteurs, rate limiting)
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const result = await redis.incr(key);
    if (ttlSeconds && result === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return result;
  },

  // Hash operations (pour données structurées)
  async hset(key: string, field: string, value: any): Promise<void> {
    await redis.hset(key, field, JSON.stringify(value));
  },

  async hget<T>(key: string, field: string): Promise<T | null> {
    const data = await redis.hget(key, field);
    return data ? JSON.parse(data) : null;
  },

  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    const data = await redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    
    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(data)) {
      result[field] = JSON.parse(value);
    }
    return result;
  },

  // Lists (pour queues, logs)
  async lpush(key: string, ...values: any[]): Promise<number> {
    const serialized = values.map(v => JSON.stringify(v));
    return await redis.lpush(key, ...serialized);
  },

  async rpop<T>(key: string): Promise<T | null> {
    const data = await redis.rpop(key);
    return data ? JSON.parse(data) : null;
  },

  // Sets (pour tags, relations)
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await redis.sadd(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    return await redis.smembers(key);
  },

  // Utilitaires
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },

  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    return await redis.ttl(key);
  },

  // Pattern matching
  async keys(pattern: string): Promise<string[]> {
    return await redis.keys(pattern);
  },

  // Pub/Sub simple
  async publish(channel: string, message: any): Promise<number> {
    return await redis.publish(channel, JSON.stringify(message));
  },

  subscribe(channel: string, callback: (message: any) => void): Redis {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (_, message) => {
      try {
        callback(JSON.parse(message));
      } catch {
        callback(message);
      }
    });
    return subscriber;
  },

  // Nettoyage
  async flushdb(): Promise<void> {
    await redis.flushdb();
  },

  async disconnect(): Promise<void> {
    await redis.quit();
  }
};

// Export du client brut si besoin
export { redis };

// Export par défaut
export default redisClient;
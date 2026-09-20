import { Injectable, OnModuleInit } from '@nestjs/common'
import { createClient } from 'redis'
import { DataService } from '../data-service/data-service.interface'
import { Actor } from '../../../entities/entities.interface';


@Injectable()
export class RedisService implements OnModuleInit, DataService {
  private client: any

  constructor() {}

  async onModuleInit() {
    try {
      this.client = await createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
      })
        .on('error', (err) => console.log('Redis Client Error', err))
        .connect()
    } catch (e) {
      console.log('Failed to connect to db', e)
    }
  }

  async get(key: string) {
    const value = await this.client.get(key)
    return value ? JSON.parse(value) : null
  }

  async set(key: string, value: any) {
    return this.client.set(key, JSON.stringify(value))
  }

  async compareAndSet(key: string, expectedValue: any | null, value: any): Promise<boolean> {
    const script = [
      "local current = redis.call('GET', KEYS[1])",
      "if ARGV[1] == '0' then",
      "  if current then return 0 end",
      "else",
      "  if current ~= ARGV[2] then return 0 end",
      "end",
      "redis.call('SET', KEYS[1], ARGV[3])",
      "return 1",
    ].join('\n')

    const result = await this.client.eval(script, {
      keys: [key],
      arguments: [
        expectedValue === null ? '0' : '1',
        expectedValue === null ? '' : JSON.stringify(expectedValue),
        JSON.stringify(value),
      ],
    })

    return Number(result) === 1
  }
  async compareAndDelete(key: string, expectedValue: any): Promise<boolean> {
    const script = [
      "local current = redis.call('GET', KEYS[1])",
      "if current ~= ARGV[1] then return 0 end",
      "redis.call('DEL', KEYS[1])",
      "return 1",
    ].join('\n')

    const result = await this.client.eval(script, {
      keys: [key],
      arguments: [JSON.stringify(expectedValue)],
    })

    return Number(result) === 1
  }
  async delete(key: string) {
    return this.client.del(key)
  }

  async listKeysForActor(actor: Actor): Promise<string[]> {
    // Construct a pattern like `${actor.instanceId}:${actor.userId}:*`
    const pattern = `${actor.instanceId}:${actor.userId}:*`
    // Use SCAN instead of KEYS for production safety
    const keys: string[] = []
    let cursor = '0'
    do {
      const [newCursor, foundKeys] = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 })
      cursor = newCursor
      keys.push(...foundKeys)
    } while (cursor !== '0')
    return keys
  }
}

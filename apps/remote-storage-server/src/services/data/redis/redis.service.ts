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

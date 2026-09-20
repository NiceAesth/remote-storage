import { Injectable, OnModuleInit } from '@nestjs/common'
import { DataService } from '../data-service/data-service.interface'
import { Actor } from '../../../entities/entities.interface';

@Injectable()
export class SqliteService implements OnModuleInit, DataService {
  private db = null
  private sqlite3 = require('sqlite3')
  constructor() {}

  async onModuleInit() {
    try {
      this.db = new this.sqlite3.Database('./database.sqlite')
      await this.db.run(
        'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT); CREATE INDEX IF NOT EXISTS key_index ON kv (key)'
      )
    } catch (e) {
      console.error('Failed to initialize sqlite database', e)
    }
  }

  async get<T>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM kv WHERE key = ?', [key], (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row ? JSON.parse(row.value) : null)
        }
      })
    })
  }

  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, JSON.stringify(value), JSON.stringify(value)],
        (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
  }

  async compareAndSet(key: string, expectedValue: any | null, value: any): Promise<boolean> {
    const serializedValue = JSON.stringify(value)

    if (expectedValue === null) {
      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT OR IGNORE INTO kv (key, value) VALUES (?, ?)',
          [key, serializedValue],
          function (err) {
            if (err) {
              reject(err)
            } else {
              resolve(this.changes === 1)
            }
          }
        )
      })
    }

    const serializedExpected = JSON.stringify(expectedValue)
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE kv SET value = ? WHERE key = ? AND value = ?',
        [serializedValue, key, serializedExpected],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve(this.changes === 1)
          }
        }
      )
    })
  }
  async compareAndDelete(key: string, expectedValue: any): Promise<boolean> {
    const serializedExpected = JSON.stringify(expectedValue)
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM kv WHERE key = ? AND value = ?',
        [key, serializedExpected],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve(this.changes === 1)
          }
        }
      )
    })
  }
  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM kv WHERE key = ?', [key], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async listKeysForActor(actor: Actor): Promise<string[]> {
    const pattern = `${actor.instanceId}:${actor.userId}:%`  // keys are stored as "instanceId:userId:key"
    return new Promise((resolve, reject) => {
      this.db.all('SELECT key FROM kv WHERE key LIKE ?', [pattern], (err, rows) => {
        if (err) return reject(err)
        resolve(rows.map(r => r.key))
      })
    })
  }
}

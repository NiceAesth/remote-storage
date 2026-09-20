import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataServiceFactory } from '../../src/services/data/data-service/data-service.factory'
import { SnapshotsController } from '../../src/snapshots/snapshots.controller'
import { SnapshotsService } from '../../src/snapshots/snapshots.service'

describe('snapshots/', () => {
  let app: INestApplication
  let values: Map<string, any>

  beforeAll(async () => {
    values = new Map<string, any>()

    const dataService = {
      get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: any) => {
        values.set(key, value)
      },
      delete: async (key: string) => {
        values.delete(key)
      },
      compareAndSet: async (key: string, expectedValue: any | null, value: any) => {
        const current = values.get(key) ?? null
        if (JSON.stringify(current) !== JSON.stringify(expectedValue)) {
          return false
        }
        values.set(key, value)
        return true
      },
      compareAndDelete: async (key: string, expectedValue: any) => {
        const current = values.get(key) ?? null
        if (JSON.stringify(current) !== JSON.stringify(expectedValue)) {
          return false
        }
        values.delete(key)
        return true
      },      listKeysForActor: async () => [],
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnapshotsController],
      providers: [
        SnapshotsService,
        {
          provide: DataServiceFactory,
          useValue: { getService: () => dataService },
        },
      ],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const actorHeaders = {
    'x-remote-storage-instance-id': 'test-instance',
    'x-remote-storage-user-id': 'test-user',
  }

  it('creates and retrieves a snapshot through HTTP', async () => {
    const put = await request(app.getHttpServer())
      .put('/snapshots/save')
      .set(actorHeaders)
      .send({
        data: { format: 'test', records: [1, 2, 3] },
        baseRevision: null,
      })

    expect(put.statusCode).toBe(200)
    expect(put.body.revision).toBe(1)

    const get = await request(app.getHttpServer())
      .get('/snapshots/save')
      .set(actorHeaders)

    expect(get.statusCode).toBe(200)
    expect(get.body.revision).toBe(1)
    expect(get.body.data).toEqual({ format: 'test', records: [1, 2, 3] })
  })

  it('returns 409 for a stale baseRevision', async () => {
    const put = await request(app.getHttpServer())
      .put('/snapshots/save')
      .set(actorHeaders)
      .send({
        data: { format: 'test', records: [4] },
        baseRevision: 0,
      })

    expect(put.statusCode).toBe(409)
    expect(put.body.currentRevision).toBe(1)
  })

  it('requires the normal actor headers', async () => {
    const get = await request(app.getHttpServer()).get('/snapshots/save')
    expect(get.statusCode).toBe(400)
  })
})
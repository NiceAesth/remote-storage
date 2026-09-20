import { ConflictException } from '@nestjs/common'
import { SnapshotsService } from '../../src/snapshots/snapshots.service'

describe('SnapshotsService', () => {
  const actor = { instanceId: 'test-instance', userId: 'test-user' }
  let values: Map<string, any>
  let service: SnapshotsService

  beforeEach(() => {
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

    const factory = {
      getService: () => dataService,
    }

    service = new SnapshotsService(factory as any)
  })

  it('creates and retrieves a snapshot', async () => {
    const stored = await service.set(actor, 'save', {
      data: { hello: 'world' },
      baseRevision: null,
    })

    expect(stored.revision).toBe(1)
    expect(stored.data).toEqual({ hello: 'world' })
    await expect(service.get(actor, 'save')).resolves.toEqual(stored)
  })

  it('increments revision when the caller has the current revision', async () => {
    await service.set(actor, 'save', { data: { value: 1 }, baseRevision: null })

    const stored = await service.set(actor, 'save', {
      data: { value: 2 },
      baseRevision: 1,
    })

    expect(stored.revision).toBe(2)
    expect(stored.data).toEqual({ value: 2 })
  })

  it('rejects stale writes', async () => {
    await service.set(actor, 'save', { data: { value: 1 }, baseRevision: null })
    await service.set(actor, 'save', { data: { value: 2 }, baseRevision: 1 })

    await expect(
      service.set(actor, 'save', {
        data: { value: 3 },
        baseRevision: 1,
      })
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('keeps snapshot keys out of the entity namespace', async () => {
    await service.set(actor, 'save', { data: { value: 1 } })

    const keys = Array.from(values.keys())
    expect(keys).toHaveLength(1)
    expect(keys[0]).toBe('__snapshot__:test-instance:test-user:save')
  })
})
import fetch from 'cross-fetch'
import { RemoteStorage } from '../src'

jest.mock('cross-fetch', () => jest.fn())

const mockedFetch = fetch as unknown as jest.Mock

describe('RemoteStorage URL handling', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
    })
  })

  it('preserves a path prefix in serverAddress', async () => {
    const storage = new RemoteStorage({
      serverAddress: 'https://example.test/.sync',
      instanceId: 'instance',
      userId: 'user',
    })

    await storage.setItem('save', { value: 1 })

    expect(mockedFetch.mock.calls[0][0]).toBe(
      'https://example.test/.sync/entities/save'
    )
  })

  it('still resolves root server addresses under /entities', async () => {
    const storage = new RemoteStorage({
      serverAddress: 'https://example.test',
      instanceId: 'instance',
      userId: 'user',
    })

    await storage.removeItem('save')

    expect(mockedFetch.mock.calls[0][0]).toBe(
      'https://example.test/entities/save'
    )
  })

  it('throws when an entity write receives a non-success response', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 413,
      text: async () => 'too large',
    })

    const storage = new RemoteStorage({
      serverAddress: 'https://example.test',
      instanceId: 'instance',
      userId: 'user',
    })

    await expect(storage.setItem('save', 'x')).rejects.toThrow(
      'HTTP 413: too large'
    )
  })

  it('preserves a path prefix for snapshot requests', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        version: 1,
        revision: 7,
        updatedAt: '2026-01-01T00:00:00.000Z',
        data: { value: 1 },
      }),
    })

    const storage = new RemoteStorage({
      serverAddress: 'https://example.test/.sync',
      instanceId: 'instance',
      userId: 'user',
    })

    const result = await storage.getSnapshot<{ value: number }>('browser state')

    expect(mockedFetch.mock.calls[0][0]).toBe(
      'https://example.test/.sync/snapshots/browser%20state'
    )
    expect(result?.revision).toBe(7)
    expect(result?.data).toEqual({ value: 1 })
  })

  it('sends baseRevision with a snapshot write', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        version: 1,
        revision: 8,
        updatedAt: '2026-01-01T00:00:01.000Z',
        data: { value: 2 },
      }),
    })

    const storage = new RemoteStorage({
      serverAddress: 'https://example.test/.sync',
      instanceId: 'instance',
      userId: 'user',
    })

    await storage.setSnapshot(
      'browser-state',
      { value: 2 },
      { baseRevision: 7 }
    )

    expect(mockedFetch.mock.calls[0][0]).toBe(
      'https://example.test/.sync/snapshots/browser-state'
    )
    expect(mockedFetch.mock.calls[0][1].method).toBe('PUT')
    expect(JSON.parse(mockedFetch.mock.calls[0][1].body)).toEqual({
      data: { value: 2 },
      baseRevision: 7,
    })
  })

  it('propagates snapshot revision conflicts', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          message: 'Snapshot revision conflict',
          currentRevision: 9,
        }),
    })

    const storage = new RemoteStorage({
      serverAddress: 'https://example.test/.sync',
      instanceId: 'instance',
      userId: 'user',
    })

    await expect(
      storage.setSnapshot(
        'browser-state',
        { value: 3 },
        { baseRevision: 7 }
      )
    ).rejects.toThrow('HTTP 409')
  })
})
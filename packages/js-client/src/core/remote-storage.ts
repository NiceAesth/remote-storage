import fetch from 'cross-fetch'
import { isWeb, uuid } from './utils'
import { HEADER_REMOTE_STORAGE_INSTANCE_ID, HEADER_REMOTE_STORAGE_USER_ID } from './constants'

const entitiesPrefix = 'entities/'
const snapshotsPrefix = 'snapshots/'

export interface RemoteStorageConfig {
  /**
   * The server address to use for remote storage. Defaults to https://api.remote.storage
   */
  serverAddress?: string
  /**
   * The user ID to use for remote storage. Defaults to a random UUID if not provided.
   */
  userId?: string
  /**
   * The instance ID to use for remote storage. Defaults to "default"
   * Instance IDs are used to create a distinct namespace for your application and should not change for the same application.
   */
  instanceId?: string
}

export interface SnapshotRecord<T = any> {
  version: 1
  revision: number
  updatedAt: string
  data: T
}

export interface SnapshotWriteOptions {
  /**
   * When supplied, the server only writes if this revision still matches.
   * Use null to require that the snapshot does not already exist.
   */
  baseRevision?: number | null
}

export class RemoteStorage {
  private readonly serverAddress: string
  private readonly instanceId: string
  private readonly userId: string

  constructor(config?: RemoteStorageConfig) {
    const { serverAddress, instanceId, userId } = config ?? {}
    this.serverAddress = this.normalizeServerAddress(
      serverAddress ?? 'https://api.remote.storage'
    )
    this.instanceId = instanceId ?? 'default'
    this.userId = userId ?? this.getUserId()
  }

  /**
   * Get an item from remote storage
   * @param key the key that corresponds to the item to get
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async getItem<T>(key: string, fetchOptions?: any): Promise<T> {
    const response = await this.call('GET', entitiesPrefix + key, fetchOptions, null)

    if (response.status === 404) {
      return null
    }

    await this.throwForHttpError(response)

    const data = await response.text()
    if (!data.startsWith('{') && !data.startsWith('[')) {
      if (data === 'true') {
        return true as unknown as T
      }
      if (data === 'false') {
        return false as unknown as T
      }
      if (!isNaN(Number(data))) {
        return Number(data) as unknown as T
      }

      return data as T
    }

    return JSON.parse(data) as T
  }

  /**
   * Set an item in remote storage
   * @param key the key that corresponds to the item to set
   * @param value the value to set
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async setItem<T>(key: string, value: T, fetchOptions?: any): Promise<void> {
    const response = await this.call('PUT', entitiesPrefix + key, fetchOptions, value)
    await this.throwForHttpError(response)
  }

  /**
   * Remove an item from remote storage
   * @param key the key that corresponds to the item to remove
   * @param fetchOptions optional fetch options to pass to the underlying fetch call. Currently only headers for authorization are supported.
   */
  async removeItem(key: string, fetchOptions?: any): Promise<void> {
    const response = await this.call('DELETE', entitiesPrefix + key, fetchOptions, null)
    await this.throwForHttpError(response)
  }

  /**
   * Get a versioned snapshot.
   */
  async getSnapshot<T>(
    key: string,
    fetchOptions?: any
  ): Promise<SnapshotRecord<T> | null> {
    const response = await this.call(
      'GET',
      snapshotsPrefix + encodeURIComponent(key),
      fetchOptions,
      null
    )

    if (response.status === 404) {
      return null
    }

    await this.throwForHttpError(response)
    return (await response.json()) as SnapshotRecord<T>
  }

  /**
   * Create or replace a versioned snapshot.
   * Supplying baseRevision enables optimistic concurrency.
   */
  async setSnapshot<T>(
    key: string,
    data: T,
    options?: SnapshotWriteOptions,
    fetchOptions?: any
  ): Promise<SnapshotRecord<T>> {
    const body: { data: T; baseRevision?: number | null } = { data }

    if (
      options &&
      Object.prototype.hasOwnProperty.call(options, 'baseRevision')
    ) {
      body.baseRevision = options.baseRevision
    }

    const response = await this.call(
      'PUT',
      snapshotsPrefix + encodeURIComponent(key),
      fetchOptions,
      body
    )

    await this.throwForHttpError(response)
    return (await response.json()) as SnapshotRecord<T>
  }

  /**
   * Remove a snapshot. Supplying baseRevision makes deletion conditional.
   */
  async removeSnapshot(
    key: string,
    options?: SnapshotWriteOptions,
    fetchOptions?: any
  ): Promise<void> {
    let path = snapshotsPrefix + encodeURIComponent(key)

    if (
      options &&
      Object.prototype.hasOwnProperty.call(options, 'baseRevision') &&
      options.baseRevision !== null &&
      options.baseRevision !== undefined
    ) {
      path += '?baseRevision=' + encodeURIComponent(String(options.baseRevision))
    }

    const response = await this.call('DELETE', path, fetchOptions, null)
    await this.throwForHttpError(response)
  }

  async call(method: string, path: string, options?: any, data?: any) {
    return fetch(new URL(path, this.serverAddress).toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        [HEADER_REMOTE_STORAGE_INSTANCE_ID]: this.instanceId,
        [HEADER_REMOTE_STORAGE_USER_ID]: this.userId,
        ...options?.headers,
      },
      body: data === undefined || data === null ? undefined : JSON.stringify(data),
    })
  }

  private normalizeServerAddress(serverAddress: string): string {
    const url = new URL(serverAddress)
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/'
    }
    return url.toString()
  }

  private async throwForHttpError(response: any): Promise<void> {
    if (response.ok) return

    let detail = ''
    try {
      detail = await response.text()
    } catch {}

    throw new Error(
      'remoteStorage request failed with HTTP ' +
        response.status +
        (detail ? ': ' + detail : '')
    )
  }

  private getUserId(): string | null {
    const key = 'rs-user-id'
    if (isWeb()) {
      if (window.localStorage.getItem(key)) {
        return window.localStorage.getItem(key)
      }
    }

    const userId = uuid()
    if (isWeb()) {
      window.localStorage.setItem(key, userId)
    }
    return userId
  }
}
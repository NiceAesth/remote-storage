import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Actor } from '../entities/entities.interface'
import { DataServiceFactory } from '../services/data/data-service/data-service.factory'
import { PutSnapshotRequest, SnapshotRecord } from './snapshots.interface'

export const MAX_SNAPSHOT_SIZE_BYTES = 50 * 1024 * 1024
const MAX_SNAPSHOT_KEY_LENGTH = 255
const SNAPSHOT_STORAGE_PREFIX = '__snapshot__:'

@Injectable()
export class SnapshotsService {
  constructor(private dataServiceFactory: DataServiceFactory) {}

  async get<T>(actor: Actor, key: string): Promise<SnapshotRecord<T>> {
    this.validateKey(key)

    const record = await this.dataServiceFactory
      .getService()
      .get<SnapshotRecord<T>>(this.getStorageKey(actor, key))

    if (!record) {
      throw new NotFoundException('Snapshot not found')
    }

    return record
  }

  async set<T>(
    actor: Actor,
    key: string,
    request: PutSnapshotRequest<T>
  ): Promise<SnapshotRecord<T>> {
    this.validateKey(key)

    if (!request || !Object.prototype.hasOwnProperty.call(request, 'data')) {
      throw new BadRequestException('Snapshot data not provided')
    }

    const serialized = JSON.stringify(request.data)
    if (serialized === undefined) {
      throw new BadRequestException('Snapshot data is not JSON serializable')
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_SNAPSHOT_SIZE_BYTES) {
      throw new BadRequestException(
        'Snapshot size exceeds ' + MAX_SNAPSHOT_SIZE_BYTES + ' bytes'
      )
    }

    const storageKey = this.getStorageKey(actor, key)
    const dataService = this.dataServiceFactory.getService()
    const existing = await dataService.get<SnapshotRecord<T>>(storageKey)

    const hasBaseRevision = Object.prototype.hasOwnProperty.call(
      request,
      'baseRevision'
    )

    if (hasBaseRevision) {
      const currentRevision = existing?.revision ?? null
      const expectedRevision = request.baseRevision ?? null

      if (currentRevision !== expectedRevision) {
        throw new ConflictException({
          message: 'Snapshot revision conflict',
          currentRevision,
        })
      }

      const record: SnapshotRecord<T> = {
        version: 1,
        revision: (existing?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        data: request.data,
      }

      const stored = await dataService.compareAndSet(storageKey, existing, record)
      if (!stored) {
        const latest = await dataService.get<SnapshotRecord<T>>(storageKey)
        throw new ConflictException({
          message: 'Snapshot revision conflict',
          currentRevision: latest?.revision ?? null,
        })
      }

      return record
    }

    const record: SnapshotRecord<T> = {
      version: 1,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      data: request.data,
    }

    await dataService.set(storageKey, record)
    return record
  }

  async delete(actor: Actor, key: string, baseRevision?: number): Promise<void> {
    this.validateKey(key)

    const storageKey = this.getStorageKey(actor, key)
    const dataService = this.dataServiceFactory.getService()

    if (baseRevision !== undefined) {
      const existing = await dataService.get<SnapshotRecord>(storageKey)
      const currentRevision = existing?.revision ?? null
      if (currentRevision !== baseRevision) {
        throw new ConflictException({
          message: 'Snapshot revision conflict',
          currentRevision,
        })
      }

      if (!existing || !(await dataService.compareAndDelete(storageKey, existing))) {
        const latest = await dataService.get<SnapshotRecord>(storageKey)
        throw new ConflictException({
          message: 'Snapshot revision conflict',
          currentRevision: latest?.revision ?? null,
        })
      }

      return
    }

    await dataService.delete(storageKey)
  }

  private validateKey(key: string): void {
    if (!key) {
      throw new BadRequestException('Snapshot key not provided')
    }

    if (key.length > MAX_SNAPSHOT_KEY_LENGTH) {
      throw new BadRequestException(
        'Snapshot key cannot be longer than ' + MAX_SNAPSHOT_KEY_LENGTH + ' characters'
      )
    }
  }

  private getStorageKey(actor: Actor, key: string): string {
    return (
      SNAPSHOT_STORAGE_PREFIX +
      actor.instanceId +
      ':' +
      actor.userId +
      ':' +
      key
    )
  }
}
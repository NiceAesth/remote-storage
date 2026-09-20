export { RemoteStorage } from './core/remote-storage'
export type {
  RemoteStorageConfig,
  SnapshotRecord,
  SnapshotWriteOptions,
} from './core/remote-storage'
export * from './core/constants'

import { RemoteStorage } from './core/remote-storage'

globalThis.RemoteStorage = RemoteStorage
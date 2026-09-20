export interface SnapshotRecord<T = any> {
  version: 1
  revision: number
  updatedAt: string
  data: T
}

export interface PutSnapshotRequest<T = any> {
  data: T
  baseRevision?: number | null
}
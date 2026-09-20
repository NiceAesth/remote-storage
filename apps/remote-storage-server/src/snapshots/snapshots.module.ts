import { Module } from '@nestjs/common'
import { DataServiceModule } from '../services/data/data-service/data-service.module'
import { DataServiceFactory } from '../services/data/data-service/data-service.factory'
import { RedisModule } from '../services/data/redis/redis.module'
import { SqliteModule } from '../services/data/sqlite/sqlite.module'
import { SnapshotsController } from './snapshots.controller'
import { SnapshotsService } from './snapshots.service'

@Module({
  imports: [DataServiceModule, SqliteModule, RedisModule],
  controllers: [SnapshotsController],
  providers: [SnapshotsService, DataServiceFactory],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
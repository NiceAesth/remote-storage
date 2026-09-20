import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { EntitiesModule } from './entities/entities.module'
import { ConfigModule } from '@nestjs/config'
import { SnapshotsModule } from './snapshots/snapshots.module'

@Module({
  imports: [ConfigModule.forRoot(), EntitiesModule, SnapshotsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

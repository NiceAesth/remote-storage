import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Request,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { validateActorRequest } from '../common/request-actor'
import { PutSnapshotRequest, SnapshotRecord } from './snapshots.interface'
import { SnapshotsService } from './snapshots.service'

@ApiBearerAuth()
@ApiTags('snapshots')
@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @ApiOperation({ summary: 'Get a versioned snapshot by key' })
  @ApiResponse({ status: 200, description: 'Snapshot returned.' })
  @ApiResponse({ status: 404, description: 'Snapshot not found.' })
  @Get(':key')
  async get(
    @Request() request: any,
    @Param('key') key: string
  ): Promise<SnapshotRecord> {
    return this.snapshotsService.get(validateActorRequest(request), key)
  }

  @ApiOperation({ summary: 'Create or replace a versioned snapshot' })
  @ApiResponse({ status: 200, description: 'Snapshot stored.' })
  @ApiResponse({
    status: 409,
    description: 'baseRevision does not match the stored revision.',
  })
  @Put(':key')
  async set(
    @Request() request: any,
    @Param('key') key: string,
    @Body() body: PutSnapshotRequest
  ): Promise<SnapshotRecord> {
    return this.snapshotsService.set(validateActorRequest(request), key, body)
  }

  @ApiOperation({ summary: 'Delete a snapshot' })
  @ApiResponse({ status: 200, description: 'Snapshot deleted.' })
  @ApiResponse({
    status: 409,
    description: 'baseRevision does not match the stored revision.',
  })
  @Delete(':key')
  async delete(
    @Request() request: any,
    @Param('key') key: string,
    @Query('baseRevision') baseRevision?: string
  ): Promise<void> {
    let parsedRevision: number | undefined

    if (baseRevision !== undefined) {
      parsedRevision = Number(baseRevision)
      if (!Number.isSafeInteger(parsedRevision) || parsedRevision < 0) {
        throw new BadRequestException('baseRevision must be a non-negative integer')
      }
    }

    return this.snapshotsService.delete(
      validateActorRequest(request),
      key,
      parsedRevision
    )
  }
}
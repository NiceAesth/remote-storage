import { BadRequestException } from '@nestjs/common'
import { Actor } from '../entities/entities.interface'
import {
  HEADER_REMOTE_STORAGE_INSTANCE_ID,
  HEADER_REMOTE_STORAGE_USER_ID,
} from './constants'

const MAX_ACTOR_KEY_LENGTH = 255

export function validateActorRequest(request: any): Actor {
  const headers = request?.headers
  if (!headers) {
    throw new BadRequestException('No headers provided')
  }

  const instanceId = headers[HEADER_REMOTE_STORAGE_INSTANCE_ID]
  if (!instanceId) {
    throw new BadRequestException('No instanceId provided')
  }

  const userId = headers[HEADER_REMOTE_STORAGE_USER_ID]
  if (!userId) {
    throw new BadRequestException('No userId provided')
  }

  if (instanceId.length > MAX_ACTOR_KEY_LENGTH) {
    throw new BadRequestException(
      'instanceId cannot be longer than ' + MAX_ACTOR_KEY_LENGTH + ' characters'
    )
  }

  if (userId.length > MAX_ACTOR_KEY_LENGTH) {
    throw new BadRequestException(
      'userId cannot be longer than ' + MAX_ACTOR_KEY_LENGTH + ' characters'
    )
  }

  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret) {
    const authorization = headers['authorization']
    if (!authorization) {
      throw new BadRequestException(
        'No authorization header provided. When JWT is enabled, you must provide an authorization header.'
      )
    }

    const token = authorization.split(' ')[1]
    if (!token) {
      throw new BadRequestException(
        'No authorization token provided. When JWT is enabled, you must provide an authorization token.'
      )
    }

    try {
      require('jsonwebtoken').verify(token, jwtSecret)
    } catch {
      throw new BadRequestException('Invalid authorization token')
    }
  }

  return { instanceId, userId }
}
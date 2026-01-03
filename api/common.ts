import { tsr as tsrest } from '@ts-rest/serverless/fetch'
import { contract } from '../connect/src/api/contract'
import { TsRestResponseError } from '@ts-rest/serverless/fetch'
import jwt from 'jsonwebtoken'

export const tsr = tsrest.platformContext<{token?:string}>()

export const verify = <T extends string | object>(token: string | undefined, key: string) => {
  if (!token) return
  try {
    return jwt.verify(token, key) as T
  } catch {
    return
  }
}

export const sign = <T extends string | object>(data: T, key: string, expiresIn?: number) => {
  return jwt.sign(data, key, { expiresIn })
}

export class BadRequestError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Bad request' }) {
    super(contract, { status: 400, body })
  }
}

export class UnauthorizedError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Unauthorized' }) {
    super(contract, { status: 401, body })
  }
}

export class ForbiddenError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Forbidden' }) {
    super(contract, { status: 403, body })
  }
}

export class NotFoundError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Not found' }) {
    super(contract, { status: 404, body })
  }
}

export class InternalServerError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Internal server error' }) {
    super(contract, { status: 500, body })
  }
}
export class NotImplementedError extends TsRestResponseError<typeof contract> {
  constructor(body = { error: 'Not implemented' }) {
    super(contract, { status: 501, body })
  }
}

import { tsr as tsrest } from '@ts-rest/serverless/fetch'
import { contract } from '../connect/src/api/contract'
import { TsRestResponseError } from '@ts-rest/serverless/fetch'

export const tsr = tsrest.platformContext<{}>()

export class BadRequestError extends TsRestResponseError<typeof contract> {
  constructor(body: string = 'Bad request') {
    super(contract, { status: 400, body })
  }
}

export class UnauthorizedError extends TsRestResponseError<typeof contract> {
  constructor(body: string = 'Unauthorized') {
    super(contract, { status: 401, body })
  }
}

export class ForbiddenError extends TsRestResponseError<typeof contract> {
  constructor(body: string = 'Forbidden') {
    super(contract, { status: 403, body })
  }
}

export class NotFoundError extends TsRestResponseError<typeof contract> {
  constructor(body: string = 'Not found') {
    super(contract, { status: 404, body })
  }
}

export class InternalServerError extends TsRestResponseError<typeof contract> {
  constructor(body: string = 'Internal server error') {
    super(contract, { status: 500, body })
  }
}

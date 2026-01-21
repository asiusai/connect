import { tsr as tsrest } from '@ts-rest/serverless/fetch'
import { contract } from '../shared/contract'
import { TsRestResponseError } from '@ts-rest/serverless/fetch'
import jwt from 'jsonwebtoken'
import { Identity } from './auth'

export type Context = { identity?: Identity; origin: string }
export const tsr = tsrest.platformContext<Context>()

const normalizePem = (key: string) => {
  if (!key.includes('-----BEGIN') || key.includes('\n')) return key
  // PEM keys may have spaces instead of newlines after URL decoding
  // Extract header, body, footer
  const match = key.match(/^(-----BEGIN [A-Z ]+-----) (.+) (-----END [A-Z ]+-----)$/)
  if (!match) return key
  const [, header, body, footer] = match
  return `${header}\n${body.replace(/ /g, '\n')}\n${footer}`
}

export const verify = <T extends string | object>(token: string | undefined, key: string) => {
  if (!token) return
  try {
    return jwt.verify(token, normalizePem(key)) as T
  } catch {
    return
  }
}
export const decode = <T extends string | object>(token: string | undefined) => {
  if (!token) return
  try {
    return jwt.decode(token) as T
  } catch {
    return
  }
}

export const sign = <T extends string | object>(data: T, key: string, expiresIn: number = 60 * 60) => {
  return jwt.sign(data, key, { expiresIn })
}

export class BadRequestError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 400, body: { error: error ?? 'Bad request' } })
  }
}

export class UnauthorizedError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 401, body: { error: error ?? 'Unauthorized' } })
  }
}

export class ForbiddenError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 403, body: { error: error ?? 'Forbidden' } })
  }
}

export class NotFoundError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 404, body: { error: error ?? 'Not found' } })
  }
}

export class InternalServerError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 500, body: { error: error ?? 'Internal server error' } })
  }
}
export class NotImplementedError extends TsRestResponseError<typeof contract> {
  constructor(error: string | undefined) {
    super(contract, { status: 501, body: { error: error ?? 'Not implemented' } })
  }
}

export const randomId = () => {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Normalize path from device format (routeId--segment/file) to comma format (routeId/segment/file)
// e.g. "dongleId/2025-01-07--12-00-00--0/qlog.zst" -> "dongleId/2025-01-07--12-00-00/0/qlog.zst"
export const normalizeDataKey = (key: string): string => {
  const parts = key.split('/')
  if (parts.length < 2) return key

  const [dongleId, segmentDir, ...rest] = parts
  if (!segmentDir) return key

  const lastDash = segmentDir.lastIndexOf('--')
  if (lastDash === -1) return key

  const routeId = segmentDir.slice(0, lastDash)
  const segment = segmentDir.slice(lastDash + 2)

  // Only normalize if segment is a number
  if (!/^\d+$/.test(segment)) return key

  return [dongleId, routeId, segment, ...rest].join('/')
}

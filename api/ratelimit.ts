// Simple in-memory rate limiter using sliding window
const requests = new Map<string, number[]>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of requests) {
    const valid = timestamps.filter((t) => now - t < 60000)
    if (valid.length === 0) requests.delete(key)
    else requests.set(key, valid)
  }
}, 60000)

export const rateLimit = (key: string, limit: number, windowMs: number = 60000): boolean => {
  const now = Date.now()
  const timestamps = requests.get(key) ?? []
  const windowStart = now - windowMs
  const recentRequests = timestamps.filter((t) => t > windowStart)

  if (recentRequests.length >= limit) return false

  recentRequests.push(now)
  requests.set(key, recentRequests)
  return true
}

export const getClientIp = (req: Request): string => {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

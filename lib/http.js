function allowedOrigins(env = process.env) {
  return String(env.AI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function applyCors(req, res, env = process.env) {
  const origin = req.headers.origin
  if (!origin) return true

  let sameOrigin = false
  try {
    sameOrigin = new URL(origin).host === req.headers.host
  } catch {
    sameOrigin = false
  }

  const allowed = sameOrigin || allowedOrigins(env).includes(origin)
  if (!allowed) return false

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Socratic-Access-Token')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  return true
}

export function requireGatewayToken(req, env = process.env) {
  const expected = env.AI_GATEWAY_TOKEN
  if (!expected) return true
  const provided = req.headers['x-socratic-access-token']
  return typeof provided === 'string' && provided.length === expected.length && provided === expected
}

export function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return {}
}

export function publicError(error) {
  const code = String(error?.message || 'AI_GATEWAY_ERROR')
  const allowed = new Set([
    'QUESTION_TOO_SHORT',
    'POSITION_TOO_SHORT',
    'UNKNOWN_PROVIDER',
    'PROVIDER_NOT_CONFIGURED',
    'PROVIDER_REQUEST_FAILED',
    'INVALID_MODEL_JSON',
    'INSUFFICIENT_MODEL_QUESTIONS',
  ])
  return allowed.has(code) ? code : error?.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'AI_GATEWAY_ERROR'
}

/**
 * Webhook Signature Verification
 *
 * Provider-specific signature verification logic
 */

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"

/**
 * Verify webhook signature (provider-specific)
 */
export async function verifySignature(
  payload: string,
  signature: string | undefined,
  secret: string,
  algorithm: string,
  provider: string
): Promise<boolean> {
  if (!signature) {
    console.warn('[webhook-receiver] No signature provided')
    return false
  }

  try {
    switch (provider) {
      case 'github':
        return await verifyGitHubSignature(payload, signature, secret)

      case 'stripe':
        return await verifyStripeSignature(payload, signature, secret)

      case 'slack':
        return await verifySlackSignature(payload, signature, secret)

      case 'custom':
        return await verifyHmacSignature(payload, signature, secret, algorithm)

      default:
        console.error(`[webhook-receiver] Unknown provider: ${provider}`)
        return false
    }
  } catch (error) {
    console.error('[webhook-receiver] Signature verification error:', error)
    return false
  }
}

/**
 * GitHub Webhook Signature Verification
 * Header: X-Hub-Signature-256: sha256=<hash>
 */
async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const algorithm = 'SHA-256'
  const expectedPrefix = 'sha256='

  if (!signature.startsWith(expectedPrefix)) {
    return false
  }

  const providedHash = signature.substring(expectedPrefix.length)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === providedHash
}

/**
 * Stripe Webhook Signature Verification
 * Header: Stripe-Signature: t=<timestamp>,v1=<hash>
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const signatureParts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const timestamp = signatureParts['t']
  const v1Hash = signatureParts['v1']

  if (!timestamp || !v1Hash) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === v1Hash
}

/**
 * Slack Webhook Signature Verification
 * Header: X-Slack-Signature: v0=<hash>
 * Header: X-Slack-Request-Timestamp: <timestamp>
 */
async function verifySlackSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const [version, hash] = signature.split('=')
  if (version !== 'v0') {
    return false
  }

  // Note: In production, you should also verify the timestamp
  // to prevent replay attacks (X-Slack-Request-Timestamp header)

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === hash
}

/**
 * Generic HMAC Signature Verification
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string
): Promise<boolean> {
  let hashAlgorithm: string

  switch (algorithm.toLowerCase()) {
    case 'sha256':
    case 'hmac-sha256':
      hashAlgorithm = 'SHA-256'
      break
    case 'sha1':
    case 'hmac-sha1':
      hashAlgorithm = 'SHA-1'
      break
    case 'sha512':
    case 'hmac-sha512':
      hashAlgorithm = 'SHA-512'
      break
    default:
      console.error(`[webhook-receiver] Unknown algorithm: ${algorithm}`)
      return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: hashAlgorithm },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === signature
}

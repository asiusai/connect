import nacl from 'tweetnacl'
import { sha512 } from '@noble/hashes/sha2.js'

const p = 2n ** 255n - 19n

const modPow = (base: bigint, exp: bigint, mod: bigint): bigint => {
  let result = 1n
  base = base % mod
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod
    exp = exp / 2n
    base = (base * base) % mod
  }
  return result
}

// Convert Ed25519 public key to X25519 public key (birational map)
const ed25519PublicToX25519 = (edPub: Uint8Array): Uint8Array => {
  let y = 0n
  for (let i = 0; i < 32; i++) y += BigInt(edPub[i]) << BigInt(8 * i)
  y = y & ((1n << 255n) - 1n)
  const u = (((1n + y) % p) * modPow((p + 1n - y) % p, p - 2n, p)) % p
  const result = new Uint8Array(32)
  let val = u
  for (let i = 0; i < 32; i++) {
    result[i] = Number(val & 0xffn)
    val >>= 8n
  }
  return result
}

// Convert Ed25519 seed to X25519 private key
const ed25519SeedToX25519Private = (seed: Uint8Array): Uint8Array => {
  const h = sha512(seed)
  h[0] &= 248
  h[31] &= 127
  h[31] |= 64
  return h.slice(0, 32)
}

// Extract Ed25519 public key bytes from OpenSSH public key format
const parsePublicKey = (publicKey: string): Uint8Array => {
  const keyData = publicKey.split(' ')[1]
  return Uint8Array.from(atob(keyData).slice(19), (c) => c.charCodeAt(0))
}

// Extract Ed25519 seed from OpenSSH private key format
const parsePrivateKey = (privateKey: string): Uint8Array => {
  const keyData = privateKey
    .split('\n')
    .filter((l) => !l.startsWith('-----'))
    .join('')
  const decoded = typeof Buffer !== 'undefined' ? Buffer.from(keyData, 'base64') : Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))
  const marker = [115, 115, 104, 45, 101, 100, 50, 53, 53, 49, 57] // "ssh-ed25519"
  let idx = -1
  for (let i = 50; i < decoded.length - 11; i++) {
    if (marker.every((v, j) => decoded[i + j] === v)) {
      idx = i
      break
    }
  }
  if (idx === -1) throw new Error('Invalid SSH key format')
  return new Uint8Array(decoded.slice(idx + 51, idx + 83))
}

// Encrypt token with Ed25519 public key (asymmetric)
export const encryptToken = (token: string, publicKey: string): string => {
  const x25519Pub = ed25519PublicToX25519(parsePublicKey(publicKey))
  const ephemeral = nacl.box.keyPair()
  const nonce = nacl.randomBytes(24)
  const encrypted = nacl.box(new TextEncoder().encode(token), nonce, x25519Pub, ephemeral.secretKey)
  const combined = new Uint8Array(32 + 24 + encrypted.length)
  combined.set(ephemeral.publicKey, 0)
  combined.set(nonce, 32)
  combined.set(encrypted, 56)
  return (
    'enc.' +
    btoa(String.fromCharCode(...combined))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  )
}

// Decrypt token with Ed25519 private key (asymmetric)
export const decryptToken = (encrypted: string, privateKey: string): string | undefined => {
  try {
    if (encrypted.startsWith('enc.')) encrypted = encrypted.slice(4)
    const x25519Private = ed25519SeedToX25519Private(parsePrivateKey(privateKey))
    const data =
      typeof Buffer !== 'undefined'
        ? Buffer.from(encrypted, 'base64url')
        : Uint8Array.from(atob(encrypted.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const ephemeralPub = data.slice(0, 32)
    const nonce = data.slice(32, 56)
    const ciphertext = data.slice(56)
    const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPub, x25519Private)
    return decrypted ? new TextDecoder().decode(decrypted) : undefined
  } catch {
    return undefined
  }
}

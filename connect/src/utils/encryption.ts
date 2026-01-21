import nacl from 'tweetnacl'

export const encryptToken = (token: string, publicKeyBase64: string): string => {
  const publicKey = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0))
  const ephemeral = nacl.box.keyPair()
  const nonce = nacl.randomBytes(24)
  const encrypted = nacl.box(new TextEncoder().encode(token), nonce, publicKey, ephemeral.secretKey)
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

export const decryptToken = (encrypted: string, privateKeyBase64: string): string | undefined => {
  try {
    if (encrypted.startsWith('enc.')) encrypted = encrypted.slice(4)
    const privateKey = typeof Buffer !== 'undefined' ? Buffer.from(privateKeyBase64, 'base64') : Uint8Array.from(atob(privateKeyBase64), (c) => c.charCodeAt(0))
    const data =
      typeof Buffer !== 'undefined'
        ? Buffer.from(encrypted, 'base64url')
        : Uint8Array.from(atob(encrypted.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const ephemeralPub = data.slice(0, 32)
    const nonce = data.slice(32, 56)
    const ciphertext = data.slice(56)
    const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPub, privateKey)
    return decrypted ? new TextDecoder().decode(decrypted) : undefined
  } catch {
    return undefined
  }
}

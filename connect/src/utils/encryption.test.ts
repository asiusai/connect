import { describe, test, expect } from 'bun:test'
import { utils } from 'ssh2'
import { encryptToken, decryptToken } from './encryption'

const generateTestKeys = () => {
  const { private: privateKey, public: publicKey } = utils.generateKeyPairSync('ed25519')
  return { privateKey, publicKey }
}

describe('SSH Token Encryption', () => {
  test('encrypts and decrypts token correctly', () => {
    const { privateKey, publicKey } = generateTestKeys()
    const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-token-12345'

    const encrypted = encryptToken(token, publicKey)
    expect(encrypted.startsWith('enc.')).toBe(true)

    const decrypted = decryptToken(encrypted, privateKey)
    expect(decrypted).toBe(token)
  })

  test('works with multiple random key pairs', () => {
    for (let i = 0; i < 5; i++) {
      const { privateKey, publicKey } = generateTestKeys()
      const token = `test-token-${Math.random().toString(36).slice(2)}`

      const encrypted = encryptToken(token, publicKey)
      const decrypted = decryptToken(encrypted, privateKey)
      expect(decrypted).toBe(token)
    }
  })

  test('fails decryption with wrong key', () => {
    const keys1 = generateTestKeys()
    const keys2 = generateTestKeys()
    const token = 'secret-token'

    const encrypted = encryptToken(token, keys1.publicKey)
    const decrypted = decryptToken(encrypted, keys2.privateKey)
    expect(decrypted).toBeUndefined()
  })

  test('fails decryption with tampered data', () => {
    const { privateKey, publicKey } = generateTestKeys()
    const token = 'secret-token'

    const encrypted = encryptToken(token, publicKey)
    const tampered = encrypted.slice(0, -5) + 'XXXXX'
    const decrypted = decryptToken(tampered, privateKey)
    expect(decrypted).toBeUndefined()
  })

  test('handles long tokens', () => {
    const { privateKey, publicKey } = generateTestKeys()
    const token = 'a'.repeat(1000)

    const encrypted = encryptToken(token, publicKey)
    const decrypted = decryptToken(encrypted, privateKey)
    expect(decrypted).toBe(token)
  })
})

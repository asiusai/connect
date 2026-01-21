import type { DerivedFile } from '../../../shared/types'

type StoreName = DerivedFile | 'logs' | 'geocode'

const DB_VERSION = 3

export class DB {
  constructor(
    public _db: IDBDatabase,
    public storeName: StoreName,
  ) {}
  static init = async (storeName: StoreName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(storeName, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName)
          store.createIndex('key', 'key', { unique: true })
          store.createIndex('expiry', 'expiry', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return new DB(db, storeName)
  }
  get = async <T>(key: string) => {
    return new Promise<T | undefined>((resolve) => {
      const tx = this._db.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (result && typeof result === 'object' && 'data' in result && 'expiry' in result) {
          if (Date.now() > result.expiry) {
            this.delete(key)
            resolve(undefined)
            return
          }
          resolve(result.data as T)
          return
        }
        resolve(undefined)
      }
      request.onerror = () => resolve(undefined)
    })
  }
  set = async <T>(key: string, data: T, expiry = 2 * 24 * 60 * 60 * 1000) => {
    return new Promise<void>((resolve, reject) => {
      const tx = this._db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.put({ key: key, data, expiry: Date.now() + expiry }, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  delete = async (key: string) => {
    return new Promise<void>((resolve, reject) => {
      const tx = this._db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

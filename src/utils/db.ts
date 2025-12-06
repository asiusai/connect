const STORE_NAME = 'connect'

export class DB {
  _db!: IDBDatabase
  init = async () => {
    if (this._db) return this

    this._db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoCache', 1)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return this
  }
  get = async <T extends string | Blob>(key: string) => {
    return new Promise<T | undefined>((resolve) => {
      const tx = this._db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(undefined)
    })
  }
  set = async <T extends string | Blob>(key: string, blob: T) => {
    return new Promise<void>((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(blob, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

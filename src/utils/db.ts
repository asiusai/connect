type StoreName = 'logs'

export class DB {
  constructor(
    public _db: IDBDatabase,
    public storeName: StoreName,
  ) {}
  static init = async (storeName: StoreName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(storeName, 1)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return new DB(db, storeName)
  }
  get = async <T extends string | Blob>(key: string) => {
    return new Promise<T | undefined>((resolve) => {
      const tx = this._db.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(undefined)
    })
  }
  set = async <T extends string | Blob>(key: string, blob: T) => {
    return new Promise<void>((resolve, reject) => {
      const tx = this._db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const request = store.put(blob, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

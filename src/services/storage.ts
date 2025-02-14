// Using IndexedDB for file storage
const DB_NAME = 'content_db';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { 
          keyPath: 'id',
          autoIncrement: false
        });
      }
    };
  });
};

export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    onProgress?.(0);

    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    // Maximum file size (100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 100MB limit');
    }

    // Generate a unique ID for the file
    const fileId = crypto.randomUUID();

    // Read file as ArrayBuffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress?.(progress);
        }
      };
      reader.readAsArrayBuffer(file);
    });

    // Store file in IndexedDB
    const database = await initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put({
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    onProgress?.(100);
    return fileId;
  } catch (error) {
    console.error('Error storing file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to store file');
  }
};

export const getFile = async (fileId: string): Promise<Blob | null> => {
  try {
    const database = await initDB();
    const data = await new Promise<any>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!data) return null;

    return new Blob([data.data], { type: data.type });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return null;
  }
};

export const deleteAllExceptOne = async (): Promise<void> => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Get all files
    const files = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Sort by timestamp (newest first)
    files.sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the newest file
    const [newestFile, ...filesToDelete] = files;

    // Delete all other files
    for (const file of filesToDelete) {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(file.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Error deleting files:', error);
    throw new Error('Failed to delete files');
  }
};

export const getFileUrl = (fileId: string): string => {
  return `/content/${fileId}`;
};

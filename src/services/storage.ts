// Using IndexedDB for file storage
const DB_NAME = 'content_db';
const STORE_NAME = 'files';
const DB_VERSION = 2; // Increment version to force upgrade

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      // Delete the existing database to ensure clean state
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      
      deleteRequest.onerror = () => {
        console.error('Error deleting database:', deleteRequest.error);
      };
      
      deleteRequest.onsuccess = () => {
        console.log('Successfully deleted database');
        
        // Create new database
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          console.error('Database error:', request.error);
          reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
        };

        request.onupgradeneeded = (event) => {
          console.log('Creating new database...');
          const database = (event.target as IDBOpenDBRequest).result;
          
          // Create the object store
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { 
              keyPath: 'id',
              autoIncrement: false
            });
            console.log('Object store created successfully');
          }
        };

        request.onsuccess = () => {
          db = request.result;
          console.log('Database initialized successfully');
          resolve(db);
        };
      };
    } catch (error) {
      console.error('Critical database error:', error);
      reject(new Error('Failed to initialize database. Please refresh the page and try again.'));
    }
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

    // Initialize database
    const database = await initDB();

    // Store file
    await new Promise<void>((resolve, reject) => {
      try {
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
      } catch (error) {
        reject(error);
      }
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
      try {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
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

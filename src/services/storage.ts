// Using IndexedDB for file storage
const DB_NAME = 'content_db';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      // Close any existing database connection
      if (db) {
        db.close();
        db = null;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Database error:', request.error);
        reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
      };

      request.onblocked = () => {
        console.error('Database blocked. Please close other tabs and try again.');
        reject(new Error('Database blocked. Please close other tabs and try again.'));
      };

      request.onupgradeneeded = (event) => {
        console.log('Upgrading database...');
        const database = (event.target as IDBOpenDBRequest).result;
        
        // Delete the old object store if it exists
        if (database.objectStoreNames.contains(STORE_NAME)) {
          database.deleteObjectStore(STORE_NAME);
        }

        // Create a new object store
        database.createObjectStore(STORE_NAME, { 
          keyPath: 'id',
          autoIncrement: false
        });
        console.log('Object store created successfully');
      };

      request.onsuccess = () => {
        db = request.result;

        // Handle database connection errors
        db.onerror = (event) => {
          console.error('Database error:', (event.target as IDBDatabase).error);
        };

        // Verify object store exists
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close();
          // Increment version to trigger upgrade
          const reopenRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);
          
          reopenRequest.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            database.createObjectStore(STORE_NAME, { 
              keyPath: 'id',
              autoIncrement: false
            });
          };
          
          reopenRequest.onsuccess = () => {
            db = reopenRequest.result;
            resolve(db);
          };
          
          reopenRequest.onerror = () => {
            console.error('Failed to upgrade database:', reopenRequest.error);
            reject(new Error(`Failed to upgrade database: ${reopenRequest.error?.message || 'Unknown error'}`));
          };
        } else {
          resolve(db);
        }
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

    // Initialize database with retry mechanism
    let database: IDBDatabase | null = null;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries && !database) {
      try {
        database = await initDB();
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error('Failed to initialize database after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!database) {
      throw new Error('Failed to initialize database');
    }

    // Store file with retry mechanism
    retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database!.transaction([STORE_NAME], 'readwrite');
          
          transaction.onerror = () => {
            console.error('Transaction error:', transaction.error);
            reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`));
          };
          
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
        
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

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
      
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(new Error(`Failed to retrieve file: ${transaction.error?.message || 'Unknown error'}`));
      };
      
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
    
    transaction.onerror = () => {
      console.error('Transaction error:', transaction.error);
      throw new Error(`Failed to delete files: ${transaction.error?.message || 'Unknown error'}`);
    };
    
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

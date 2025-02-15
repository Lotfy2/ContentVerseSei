import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { deleteAllExceptOne } from '../services/storage';

interface Content {
  id: string;
  title: string;
  creator: string;
  type: string;
  name: string;
  timestamp: number;
}

const Home = () => {
  const { address } = useWallet();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const initializeDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('content_db', 2); // Match the version in storage.ts

        request.onerror = () => {
          console.error('Database error:', request.error);
          reject(new Error('Failed to open database'));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };
      } catch (error) {
        console.error('Critical database error:', error);
        reject(error);
      }
    });
  };

  const fetchContent = async () => {
    try {
      setError(null);
      const db = await initializeDB();
      
      // Verify the object store exists
      if (!db.objectStoreNames.contains('files')) {
        console.log('Files store not found, creating empty content list');
        setContent([]);
        setLoading(false);
        return;
      }

      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const allContent = await new Promise<Content[]>((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          console.error('Error fetching content:', request.error);
          reject(new Error('Failed to fetch content'));
        };
      });

      const sortedContent = allContent.sort((a, b) => b.timestamp - a.timestamp);
      setContent(sortedContent);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content. Please try again.');
      
      // Retry logic
      if (retryCount < 3) {
        console.log(`Retrying fetch attempt ${retryCount + 1}/3`);
        setRetryCount(prev => prev + 1);
        setTimeout(fetchContent, 1000); // Retry after 1 second
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [retryCount]);

  const handleDeleteFiles = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await deleteAllExceptOne();
      await fetchContent();
    } catch (err) {
      console.error('Error deleting files:', err);
      setError('Failed to delete files. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    fetchContent();
  };

  if (loading || isDeleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sei-primary" />
        <p className="mt-2 text-white">
          {isDeleting ? 'Deleting files...' : 'Loading content...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold sei-gradient-text">
          Multilingual Content Platform on Sei
        </h1>
        <p className="text-xl text-white max-w-2xl mx-auto">
          Create once, reach globally with AI-powered translations
        </p>
        {!address && (
          <p className="text-white animate-pulse">
            Connect your wallet to upload and manage content
          </p>
        )}
      </div>

      {content.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={handleDeleteFiles}
            className="sei-button !bg-gradient-to-r !from-red-500 !to-red-600"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete All Except Newest
          </button>
        </div>
      )}

      {error ? (
        <div className="sei-card p-8 text-center space-y-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="sei-button !bg-gradient-to-r !from-red-500 !to-red-600"
          >
            Retry
          </button>
        </div>
      ) : content.length === 0 ? (
        <div className="sei-card p-12 text-center space-y-6">
          <p className="text-white text-lg mb-4">No content available yet</p>
          {address && (
            <Link to="/upload" className="sei-button inline-flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Your First Content
            </Link>
          )}
        </div>
      ) : (
        <div className="sei-content-grid">
          {content.map((item) => (
            <Link
              key={item.id}
              to={`/content/${item.id}`}
              className="sei-content-card group"
            >
              <div className="aspect-video bg-gradient-to-br from-sei-surface to-sei-dark-lighter rounded-xl flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
                {item.type.includes('video') ? (
                  <Play className="h-12 w-12 text-sei-primary group-hover:text-sei-accent transition-colors" />
                ) : (
                  <FileText className="h-12 w-12 text-sei-primary group-hover:text-sei-accent transition-colors" />
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  {item.type.includes('video') ? (
                    <Play className="h-5 w-5 text-sei-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-sei-primary" />
                  )}
                  <h3 className="text-lg font-semibold text-white truncate">
                    {item.title || item.name}
                  </h3>
                </div>
                <p className="text-sm text-white">
                  Type: {item.type.split('/')[0]}
                </p>
                <p className="text-xs text-white">
                  Uploaded: {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;

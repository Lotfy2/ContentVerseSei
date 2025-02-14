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

  const fetchContent = async () => {
    try {
      const request = indexedDB.open('content_db', 1);
      
      request.onerror = () => {
        setError('Failed to load content. Please try again.');
        setLoading(false);
      };

      request.onsuccess = async () => {
        const db = request.result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const allContent = await new Promise<Content[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const sortedContent = allContent.sort((a, b) => b.timestamp - a.timestamp);
        setContent(sortedContent);
        setLoading(false);
      };
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleDeleteFiles = async () => {
    try {
      setIsDeleting(true);
      await deleteAllExceptOne();
      await fetchContent();
    } catch (err) {
      console.error('Error deleting files:', err);
      setError('Failed to delete files. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || isDeleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sei-primary" />
        <p className="mt-2 text-black">
          {isDeleting ? 'Deleting files...' : 'Loading content...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-black">
          Multilingual Content Platform on Sei
        </h1>
        <p className="text-xl text-black max-w-2xl mx-auto">
          Create once, reach globally with AI-powered translations
        </p>
        {!address && (
          <p className="text-black animate-pulse">
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
        <div className="sei-card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="sei-button !bg-gradient-to-r !from-red-500 !to-red-600"
          >
            Retry
          </button>
        </div>
      ) : content.length === 0 ? (
        <div className="sei-card p-12 text-center space-y-6">
          <p className="text-black text-lg mb-4">No content available yet</p>
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
                  <h3 className="text-lg font-semibold text-black truncate">
                    {item.title || item.name}
                  </h3>
                </div>
                <p className="text-sm text-black">
                  Type: {item.type.split('/')[0]}
                </p>
                <p className="text-xs text-black">
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
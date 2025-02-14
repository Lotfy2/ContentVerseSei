import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileText, Film, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../services/storage';

const Upload = () => {
  const { address, registerContent } = useWallet();
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<'video' | 'text'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguages, setTargetLanguages] = useState({
    spanish: false,
    chinese: false,
    japanese: false,
    korean: false,
    french: false
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: contentType === 'video' 
      ? { 'video/*': ['.mp4', '.mov', '.avi'] }
      : { 'text/*': ['.txt', '.md'] },
    maxSize: 100 * 1024 * 1024, // 100MB max size
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Upload file to local storage with progress tracking
      const fileId = await uploadFile(file, (progress) => {
        setUploadProgress(progress * 0.7); // File upload is 70% of total progress
      });

      // Get selected languages
      const selectedLanguages = Object.entries(targetLanguages)
        .filter(([_, selected]) => selected)
        .map(([lang]) => lang);

      if (selectedLanguages.length === 0) {
        throw new Error('Please select at least one target language');
      }

      setUploadProgress(75); // Starting blockchain registration

      // Register content on Sei blockchain
      const txHash = await registerContent({
        title,
        description,
        contentType,
        contentHash: fileId, // Using local storage ID instead of IPFS hash
        targetLanguages: selectedLanguages,
      });

      setUploadProgress(100);
      alert('Content uploaded successfully!');
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error uploading content:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6">
      <h1 className="text-2xl font-bold text-black mb-6">Upload Content</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">Content Type</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => {
                setContentType('video');
                setFile(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                contentType === 'video'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-black'
              }`}
            >
              <Film className="h-5 w-5" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContentType('text');
                setFile(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                contentType === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-black'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Text</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black"
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black"
            rows={4}
            required
            maxLength={500}
          />
        </div>

        <div {...getRootProps()} className="space-y-2">
          <label className="block text-sm font-medium text-black">Content File</label>
          <input {...getInputProps()} />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500">
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-black">
              {isDragActive
                ? "Drop the file here"
                : `Drag and drop your ${contentType} file here, or click to select`}
            </p>
            {file && (
              <p className="mt-2 text-sm text-indigo-600">{file.name}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-black">
            Target Languages for Translation
          </label>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(targetLanguages).map(([lang, checked]) => (
              <label key={lang} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setTargetLanguages(prev => ({
                      ...prev,
                      [lang]: e.target.checked
                    }))
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-black capitalize">{lang}</span>
              </label>
            ))}
          </div>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-black text-center">
              {uploadProgress < 70 ? 'Storing file locally...' : 'Registering on Sei...'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || !file || !title || !description}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            'Upload Content'
          )}
        </button>
      </form>
    </div>
  );
};

export default Upload;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Loader2, Languages, Shield, Copyright } from 'lucide-react';
import { translateContent } from '../services/translation';
import { useWallet } from '../context/WalletContext';

const ContentView = () => {
  const { id } = useParams();
  const { address } = useWallet();
  const [content, setContent] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Arabic');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const languages = [
    'Arabic',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean'
  ];

  useEffect(() => {
    const loadContent = async () => {
      if (!id) return;

      try {
        const request = indexedDB.open('content_db', 1);
        
        request.onsuccess = async () => {
          const db = request.result;
          const transaction = db.transaction(['files'], 'readonly');
          const store = transaction.objectStore('files');
          
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              setContent(getRequest.result);
              const blob = new Blob([getRequest.result.data], { type: getRequest.result.type });
              setFileUrl(URL.createObjectURL(blob));
            }
          };
        };

        request.onerror = () => {
          setError('Failed to load content');
        };
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load content');
      }
    };

    loadContent();
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [id]);

  const handleTranslate = async () => {
    if (!content || selectedLanguage === 'Arabic') return;

    setIsTranslating(true);
    setError(null);

    try {
      let textToTranslate = '';
      if (content.type.includes('text')) {
        const response = await fetch(fileUrl!);
        textToTranslate = await response.text();
      } else {
        textToTranslate = content.description || '';
      }

      const translated = await translateContent({
        text: textToTranslate,
        targetLanguage: selectedLanguage
      });

      setTranslatedText(translated);
    } catch (err) {
      console.error('Translation error:', err);
      setError('Failed to translate content');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (selectedLanguage !== 'Arabic') {
      handleTranslate();
    } else {
      setTranslatedText(null);
    }
  }, [selectedLanguage]);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-2 text-black">Loading content...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-black">
                {content.title || content.name}
              </h1>
              <p className="text-sm text-black">
                Uploaded: {new Date(content.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-black" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="form-select rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-black"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          {isTranslating ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
              <span className="text-black">Translating...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              {content.type.includes('video') && fileUrl && (
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <video controls className="w-full rounded-lg">
                    <source src={fileUrl} type={content.type} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              <div className="prose max-w-none text-black">
                {content.type.includes('text') ? (
                  selectedLanguage === 'Arabic' ? (
                    <div className="whitespace-pre-wrap">
                      <iframe
                        src={fileUrl}
                        className="w-full min-h-[400px] border-0"
                        title="Text content"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {translatedText}
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-black">Description</h2>
                    <p>{selectedLanguage === 'Arabic' ? content.description : translatedText}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {address && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Languages className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-black">Translation Information</h2>
            </div>
            <div className="space-y-2 text-sm text-black">
              <p>
                <strong>Original Language:</strong> Arabic
              </p>
              <p>
                <strong>Current Translation:</strong> {selectedLanguage}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-black">IP Rights & Copyright</h2>
            </div>
            <div className="space-y-4 text-sm text-black">
              <div className="flex items-center space-x-2">
                <Copyright className="h-4 w-4 text-indigo-600" />
                <p><strong>Copyright Owner:</strong> {content.owner || address}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-semibold">Content Verification</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Registered on Sei Blockchain</li>
                    <li>Content Hash Verified</li>
                    <li>Timestamp Authenticated</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Rights Management</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Original Content Rights</li>
                    <li>Translation Rights Tracked</li>
                    <li>Smart Contract Protected</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-600">
                  Content ID: {id}<br />
                  Registration Time: {new Date(content.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentView;
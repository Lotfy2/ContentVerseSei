import { NFTStorage, File as NFTFile } from 'nft.storage';

const token = import.meta.env.VITE_WEB3_STORAGE_TOKEN;

if (!token) {
  throw new Error('Missing VITE_WEB3_STORAGE_TOKEN environment variable');
}

const client = new NFTStorage({ token });

export const uploadToIPFS = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Start progress indication
    onProgress?.(0);

    // Validate file
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

    // Progress simulation for better UX
    const progressInterval = setInterval(() => {
      onProgress?.(Math.min((currentProgress += 10), 90));
    }, 1000);
    let currentProgress = 0;

    try {
      // Create NFT.Storage File object
      const nftFile = new NFTFile(
        [file],
        file.name,
        { type: file.type }
      );

      // Upload to IPFS through NFT.Storage
      const metadata = await client.store({
        name: file.name,
        description: 'Uploaded via ContentVerse',
        properties: {
          type: file.type,
          size: file.size
        },
        image: nftFile
      });

      clearInterval(progressInterval);
      onProgress?.(100);
      
      // Return the IPFS CID
      return metadata.ipnft;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your NFT.Storage API key configuration.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Failed to upload content to IPFS');
  }
};

export const getIPFSUrl = (cid: string): string => {
  if (!cid) {
    throw new Error('Invalid CID');
  }
  return `https://nftstorage.link/ipfs/${cid}`;
};
# ContentVerse - Multilingual Content Platform on Sei

ContentVerse is a decentralized content platform built on the Sei blockchain that enables creators to upload video or text content and have it translated into multiple languages. The platform ensures proper tracking of IP rights, copyright, and metadata for royalty management.

## Features

- **Content Upload**
  - Support for video and text content
  - Drag-and-drop file upload interface
  - Local storage with IndexedDB
  - File size limit: 100MB

- **Translation System**
  - Multiple language support
  - Arabic as source language
  - Target languages include:
    - Spanish
    - French
    - German
    - Italian
    - Portuguese
    - Chinese
    - Japanese
    - Korean and any other language.

- **Blockchain Integration**
  - Built on Sei Network
  - Smart contract for content registration
  - IP rights and copyright tracking
  - Translation rights management

- **User Interface**
  - Modern, responsive design
  - Tailwind CSS styling
  - Lucide React icons
  - Progress tracking for uploads
  - Content preview functionality

## Tech Stack

- **Frontend**
  - React 18
  - TypeScript
  - Vite
  - Tailwind CSS
  - Lucide React

- **Blockchain**
  - Sei Network
  - CosmWasm (Rust)
  - Keplr Wallet integration

- **Storage**
  - IndexedDB for local storage
  - File handling with ArrayBuffer


## Project Structure

```
contentverse/
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/        # React context providers
│   ├── pages/          # Page components
│   ├── services/       # Business logic and API calls
│   └── contracts/      # Smart contract code
├── public/             # Static assets
└── ...config files
```

## Smart Contract

The platform uses a CosmWasm smart contract for:
- Content registration with metadata
- Translation tracking system
- Owner verification
- Query functionality for content retrieval
- Translation management

## Security Features

- Row-level security for content access
- Content ownership verification
- Translation rights tracking
- Smart contract-based protection
- Content hash verification

## License

This project is licensed under the MIT License - see the LICENSE file for details.
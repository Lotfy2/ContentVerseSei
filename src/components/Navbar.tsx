import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Globe2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Navbar = () => {
  const { address, connect, disconnect } = useWallet();

  return (
    <nav className="sei-card border-b backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Globe2 className="h-8 w-8 text-[#4C35E6]" />
            <span className="text-xl font-bold sei-gradient-text">ContentVerse</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              to="/upload"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span>Upload</span>
            </Link>
            
            {address ? (
              <div className="flex items-center space-x-4">
                <div className="px-4 py-2 sei-card text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <button
                  onClick={disconnect}
                  className="sei-button !px-4 !py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connect} className="sei-button">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
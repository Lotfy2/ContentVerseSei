import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import ContentView from './pages/ContentView';
import { WalletProvider } from './context/WalletContext';

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-sei-dark to-sei-dark-light text-white">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/content/:id" element={<ContentView />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
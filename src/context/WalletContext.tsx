import React, { createContext, useContext, useState } from 'react';
import { getSigningCosmWasmClient, getQueryClient } from '@sei-js/core';
import { Window as KeplrWindow } from "@keplr-wallet/types";
import { Coin } from '@cosmjs/stargate';

declare global {
  interface Window extends KeplrWindow {}
}

interface WalletContextType {
  address: string | null;
  client: any;
  connect: () => Promise<void>;
  disconnect: () => void;
  registerContent: (contentData: ContentRegistration) => Promise<string>;
}

interface ContentRegistration {
  title: string;
  description: string;
  contentType: 'video' | 'text';
  contentHash: string;
  targetLanguages: string[];
}

// Using a valid Sei testnet contract address format
const CONTRACT_ADDRESS = 'sei14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9sh9m79m';

const WalletContext = createContext<WalletContextType>({
  address: null,
  client: null,
  connect: async () => {},
  disconnect: () => {},
  registerContent: async () => '',
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);

  const connect = async () => {
    try {
      if (!window.keplr) {
        throw new Error('Keplr wallet not found. Please install Keplr extension.');
      }

      const chainId = 'atlantic-2';
      
      try {
        await window.keplr.enable(chainId);
      } catch (enableError) {
        console.error('Failed to enable chain:', enableError);
        throw new Error('Failed to enable Sei chain in Keplr. Please check your wallet connection.');
      }

      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      
      if (!offlineSigner) {
        throw new Error('Failed to get offline signer from Keplr.');
      }

      const accounts = await offlineSigner.getAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in Keplr wallet.');
      }

      try {
        const signingClient = await getSigningCosmWasmClient(
          'https://rpc.atlantic-2.seinetwork.io',
          offlineSigner,
          {
            gasPrice: {
              amount: "0.1",
              denom: "usei"
            }
          }
        );

        const queryClient = await getQueryClient('https://rpc.atlantic-2.seinetwork.io');

        setAddress(accounts[0].address);
        setClient({ signingClient, queryClient });
      } catch (clientError) {
        console.error('Failed to connect client:', clientError);
        throw new Error('Failed to connect to Sei network. Please check your network connection and try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while connecting wallet';
      console.error('Error connecting wallet:', errorMessage);
      alert(errorMessage);
      disconnect();
    }
  };

  const disconnect = () => {
    setAddress(null);
    setClient(null);
  };

  const registerContent = async (contentData: ContentRegistration): Promise<string> => {
    if (!client?.signingClient || !address) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      if (!CONTRACT_ADDRESS.startsWith('sei1') && !CONTRACT_ADDRESS.startsWith('sei14')) {
        throw new Error('Invalid contract address format');
      }

      // Updated message format to match the contract's expected structure
      const msg = {
        deposit: {  // Using 'deposit' instead of 'register_content'
          content: {
            owner: address,
            title: contentData.title,
            description: contentData.description,
            content_type: contentData.contentType,
            content_hash: contentData.contentHash,
            languages: contentData.targetLanguages,
          }
        }
      };

      const fee = {
        amount: [{ amount: "1000", denom: "usei" }] as Coin[],
        gas: "1000000"
      };

      const response = await client.signingClient.execute(
        address,
        CONTRACT_ADDRESS,
        msg,
        fee,
        "",
        [] as Coin[]
      );

      if (!response?.transactionHash) {
        throw new Error('Transaction failed: No transaction hash returned');
      }

      return response.transactionHash;
    } catch (error) {
      console.error('Error registering content:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds to execute transaction. Please ensure you have enough SEI tokens.');
        }
        if (error.message.includes('not found')) {
          throw new Error('Contract not found. Please verify the contract address.');
        }
        if (error.message.includes('unauthorized')) {
          throw new Error('Unauthorized. Please ensure you have the correct permissions.');
        }
        throw new Error(`Failed to register content: ${error.message}`);
      }
      
      throw new Error('Failed to register content. Please try again.');
    }
  };

  return (
    <WalletContext.Provider value={{ 
      address, 
      client, 
      connect, 
      disconnect, 
      registerContent 
    }}>
      {children}
    </WalletContext.Provider>
  );
};
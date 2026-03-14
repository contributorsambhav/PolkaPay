'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID);
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME;
const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://blockscout-testnet.polkadot.io';
const CURRENCY_NAME = process.env.NEXT_PUBLIC_CURRENCY_NAME || NETWORK_NAME || 'Token';
export function LoginForm() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  useEffect(() => {
    checkMetaMaskInstallation();
    checkConnectionStatus();
    setupEthereumListeners();
  }, []);

  const checkMetaMaskInstallation = () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setIsMetaMaskInstalled(true);
    }
  };

  const setupEthereumListeners = () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          setAddress(accounts[0]);
        }
      });

      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        setIsCorrectNetwork(newChainId === CHAIN_ID);
      });
    }
  };

  const checkConnectionStatus = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);

          const chainIdHex = await (window as any).ethereum.request({
            method: 'eth_chainId',
          });
          const chainId = parseInt(chainIdHex, 16);
          setIsCorrectNetwork(chainId === CHAIN_ID);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    }
  };

  const handleConnect = async () => {
    if (!(window as any).ethereum) {
      setConnectionError('MetaMask is not installed');
      setTimeout(() => {
        window.open('https://metamask.io/download/', '_blank');
      }, 1000);
      return;
    }

    try {
      setIsProcessing(true);
      setConnectionError('');
      console.log('Attempting to connect wallet...');

      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        await handleAddAndSwitchNetwork();
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      if (error.message?.includes('User rejected')) {
        setConnectionError('Connection request rejected by user');
      } else {
        setConnectionError(error.message || 'Failed to connect wallet');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAndSwitchNetwork = async () => {
    if (!(window as any).ethereum) {
      setConnectionError('MetaMask is not available');
      return;
    }

    try {
      setIsAddingNetwork(true);
      setConnectionError('');

      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
        setIsCorrectNetwork(true);
      } catch (switchError: any) {
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: NETWORK_NAME,
                rpcUrls: [RPC_URL],
                blockExplorerUrls: [EXPLORER_URL],
                nativeCurrency: {
                  name: CURRENCY_NAME,
                  symbol: SYMBOL,
                  decimals: 18,
                },
              },
            ],
          });

          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });

          setIsCorrectNetwork(true);
        } else {
          throw switchError;
        }
      }
    } catch (error: any) {
      console.error('Failed to add/switch network:', error);
      if (error.message?.includes('User rejected') || error.message?.includes('denied')) {
        setConnectionError('Network request rejected by user');
      } else {
        setConnectionError(error.message || 'Failed to add network');
      }
    } finally {
      setIsAddingNetwork(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('Disconnecting wallet...');
      setAddress(null);
      setIsConnected(false);
      setIsCorrectNetwork(false);
      setConnectionError('');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleContinue = () => {
    window.location.reload();
  };

  const formatAddress = (addr: string | null) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-full shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-balance bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            RemitPay Dashboard
          </h1>
          <p className="text-muted-foreground text-pretty">
            Secure KYC-enabled financial platform for global remittances
          </p>
        </div>

        {/* MetaMask Not Installed Alert */}
        {!isMetaMaskInstalled && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-2">
                <p className="font-medium">MetaMask Required</p>
                <p className="text-sm">MetaMask is not installed. Install it to continue.</p>
                <Button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="w-full mt-2 bg-orange-600 hover:bg-orange-700"
                >
                  Install MetaMask
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {isConnected && address && (
          <div className="space-y-3">
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <span>Wallet Connected</span>
                  <span className="text-xs font-mono">{formatAddress(address)}</span>
                </div>
              </AlertDescription>
            </Alert>

            {/* Network Status */}
            {!isCorrectNetwork && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="space-y-2">
                    <p>Wrong network detected. Please switch to {NETWORK_NAME}.</p>
                    <Button
                      onClick={handleAddAndSwitchNetwork}
                      disabled={isAddingNetwork}
                      size="sm"
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isAddingNetwork ? 'Adding Network...' : `Add & Switch to ${NETWORK_NAME}`}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error Display */}
        {connectionError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Main Login Card */}
        <Card className="shadow-lg border-0 ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              {isConnected && isCorrectNetwork
                ? 'Ready to Use'
                : isConnected
                  ? 'Network Error'
                  : 'Connect Wallet'}
            </CardTitle>
            <CardDescription>
              {isConnected && isCorrectNetwork
                ? 'Your wallet is connected to the correct network. The dashboard will load automatically.'
                : isConnected
                  ? `Switch to ${NETWORK_NAME} to continue`
                  : 'Connect your MetaMask wallet to access the dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isProcessing || !isMetaMaskInstalled}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isProcessing ? 'Setting Up...' : `Connect & Add ${NETWORK_NAME}`}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-800">Connected</span>
                  </div>
                  <div className="text-xs text-green-700 font-mono mt-1">{address}</div>
                </div>
                {!isCorrectNetwork && (
                  <Button
                    onClick={handleAddAndSwitchNetwork}
                    disabled={isAddingNetwork}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isAddingNetwork ? 'Adding Network...' : `Switch to ${NETWORK_NAME}`}
                  </Button>
                )}
                {isCorrectNetwork && (
                  <Button
                    onClick={handleContinue}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Continue
                  </Button>
                )}
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  Disconnect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="bg-blue-100 p-3 rounded-full mx-auto w-fit">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground">KYC Verified</p>
          </div>
          <div className="space-y-2">
            <div className="bg-green-100 p-3 rounded-full mx-auto w-fit">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground">Daily Limits</p>
          </div>
          <div className="space-y-2">
            <div className="bg-purple-100 p-3 rounded-full mx-auto w-fit">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground">Secure Wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
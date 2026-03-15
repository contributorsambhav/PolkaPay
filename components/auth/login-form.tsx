'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  WarningCircleIcon,
  ShieldIcon,
  TrendUpIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID as string);
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
    <div className="flex min-h-svh min-w-0 items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md min-w-0 space-y-6">
        {/* Header */}
        <header className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ShieldIcon className="h-7 w-7 shrink-0" size={28} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              RemitPay Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Secure KYC-enabled financial platform for global remittances
            </p>
          </div>
        </header>

        {/* MetaMask Not Installed Alert */}
        {!isMetaMaskInstalled && (
          <Alert className="border-border bg-warning/10">
            <WarningCircleIcon className="h-4 w-4 text-warning-foreground" size={16} />
            <AlertDescription className="text-foreground">
              <div className="space-y-2">
                <p className="font-medium">MetaMask required</p>
                <p className="text-sm text-muted-foreground">
                  Install MetaMask to connect your wallet and continue.
                </p>
                <Button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="mt-2 w-full"
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
            <Alert className="border-border bg-success/10">
              <ShieldIcon className="h-4 w-4 text-success" size={16} />
              <AlertDescription className="text-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Wallet connected</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatAddress(address)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>

            {/* Network Status */}
            {!isCorrectNetwork && (
              <Alert className="border-border bg-warning/10">
                <WarningCircleIcon className="h-4 w-4 text-warning-foreground" size={16} />
                <AlertDescription className="text-foreground">
                  <div className="space-y-2">
                    <p className="text-sm">
                      Wrong network. Switch to {NETWORK_NAME} to continue.
                    </p>
                    <Button
                      onClick={handleAddAndSwitchNetwork}
                      disabled={isAddingNetwork}
                      size="sm"
                      className="w-full"
                    >
                      {isAddingNetwork ? 'Adding network…' : `Add & switch to ${NETWORK_NAME}`}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error Display */}
        {connectionError && (
          <Alert className="border-border bg-destructive/10">
            <WarningCircleIcon className="h-4 w-4 text-destructive" size={16} />
            <AlertDescription className="text-foreground">{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Main Login Card */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <WalletIcon className="h-5 w-5 text-primary" size={20} />
              {isConnected && isCorrectNetwork
                ? 'Ready to use'
                : isConnected
                  ? 'Network error'
                  : 'Connect wallet'}
            </CardTitle>
            <CardDescription>
              {isConnected && isCorrectNetwork
                ? 'Your wallet is on the correct network. Continue to load the dashboard.'
                : isConnected
                  ? `Switch to ${NETWORK_NAME} to continue.`
                  : 'Connect your MetaMask wallet to access the dashboard.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isProcessing || !isMetaMaskInstalled}
                className="w-full"
                size="lg"
              >
                <WalletIcon className="h-4 w-4 shrink-0" size={16} />
                {isProcessing ? 'Setting up…' : `Connect & add ${NETWORK_NAME}`}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium text-foreground">Connected</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{address}</p>
                </div>
                {!isCorrectNetwork && (
                  <Button
                    onClick={handleAddAndSwitchNetwork}
                    disabled={isAddingNetwork}
                    className="w-full"
                  >
                    {isAddingNetwork ? 'Adding network…' : `Switch to ${NETWORK_NAME}`}
                  </Button>
                )}
                {isCorrectNetwork && (
                  <Button onClick={handleContinue} className="w-full">
                    Continue
                  </Button>
                )}
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  Disconnect wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
          <div className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary">
              <ShieldIcon className="h-4 w-4 shrink-0" size={16} />
            </div>
            <p className="text-xs text-muted-foreground">KYC verified</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary">
              <TrendUpIcon className="h-4 w-4 shrink-0" size={16} />
            </div>
            <p className="text-xs text-muted-foreground">Daily limits</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary">
              <WalletIcon className="h-4 w-4 shrink-0" size={16} />
            </div>
            <p className="text-xs text-muted-foreground">Secure wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
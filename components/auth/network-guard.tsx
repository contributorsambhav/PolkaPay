'use client';

import { useAccount, useChainId } from 'wagmi';
import { LoginForm } from './login-form';
import { useEffect, useState } from 'react';
import type React from 'react';
import { CHAIN_ID } from '@/lib/constants';

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Force network switch effect
  useEffect(() => {
    if (mounted && isConnected && chainId !== CHAIN_ID) {
      const switchNetwork = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
            });
          } catch (err: any) {
            console.error('Auto switch failed', err);
          }
        }
      };
      switchNetwork();
    }
  }, [mounted, isConnected, chainId]);

  if (!mounted) return null;

  const isCorrectNetwork = chainId === CHAIN_ID;

  if (!isConnected || !isCorrectNetwork) {
    return <LoginForm />;
  }

  return <>{children}</>;
}

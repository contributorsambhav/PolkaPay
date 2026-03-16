'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useAccount } from 'wagmi';

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x4E5E5586F554Ff37F7839F5d70f849D03D5B6dEB';
interface User {
  address: string;
  role: 'admin' | 'user';
  mode: 'admin' | 'user';
  isConnected: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  toggleMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<'admin' | 'user' | null>(null);
  const { address: connectedAddress, isConnected } = useAccount();

  useEffect(() => {
    const savedMode = localStorage.getItem('remitpay_mode') as 'admin' | 'user' | null;
    if (savedMode) {
      setCurrentMode(savedMode);
    }
  }, []);

  const determineRole = (address: string): 'admin' | 'user' => {
    if (!address) return 'user';
    const lowerAddress = address.toLowerCase();
    const adminAddress = ADMIN_ADDRESS.toLowerCase();
    return lowerAddress === adminAddress ? 'admin' : 'user';
  };

  useEffect(() => {
    setIsLoading(true);
    if (isConnected && connectedAddress) {
      const role = determineRole(connectedAddress);
      
      // Default mode to role if no mode set or if existing mode is admin but role is user
      let mode: 'admin' | 'user' = role;
      if (role === 'admin' && currentMode) {
        mode = currentMode;
      } else {
        localStorage.removeItem('remitpay_mode');
      }

      setUser({
        address: connectedAddress,
        role,
        mode,
        isConnected: true
      });
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [isConnected, connectedAddress, currentMode]);

  const toggleMode = () => {
    if (user?.role !== 'admin') return;
    const newMode = user.mode === 'admin' ? 'user' : 'admin';
    setCurrentMode(newMode);
    localStorage.setItem('remitpay_mode', newMode);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('remitpay_mode');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    logout,
    toggleMode
  };
  console.log('Auth context value:', value);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

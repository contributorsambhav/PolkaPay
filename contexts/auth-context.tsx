'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useAccount } from 'wagmi';

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x4E5E5586F554Ff37F7839F5d70f849D03D5B6dEB';
interface User {
  address: string;
  role: 'admin' | 'user';
  isConnected: boolean;
}
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address: connectedAddress, isConnected } = useAccount();
  const determineRole = (address: string): 'admin' | 'user' => {
    if (!address) return 'user';
    const lowerAddress = address.toLowerCase();
    const adminAddress = ADMIN_ADDRESS.toLowerCase();
    console.log('Checking role for address:', lowerAddress);
    console.log('Admin address:', adminAddress);
    console.log('Is admin?', lowerAddress === adminAddress);
    return lowerAddress === adminAddress ? 'admin' : 'user';
  };
  useEffect(() => {
    console.log('Auth context effect triggered');
    console.log('isConnected:', isConnected);
    console.log('connectedAddress:', connectedAddress);
    setIsLoading(true);
    if (isConnected && connectedAddress) {
      const role = determineRole(connectedAddress);
      console.log('Setting user with role:', role);
      setUser({
        address: connectedAddress,
        role,
        isConnected: true
      });
    } else {
      console.log('No connection, clearing user');
      setUser(null);
    }
    setIsLoading(false);
  }, [isConnected, connectedAddress]);
  const logout = () => {
    console.log('Logging out');
    setUser(null);
  };
  const value: AuthContextType = {
    user,
    isLoading,
    logout
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

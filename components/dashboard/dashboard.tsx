'use client';

import { LogOut, Shield, User } from 'lucide-react';
import { useState, useEffect } from 'react';

import { AdminDashboard } from './admin-dashboard';
import { Button } from '@/components/ui/button';
import { UserDashboard } from './user-dashboard';
import { useAuth } from '@/contexts/auth-context';
import { useDisconnect } from 'wagmi';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { disconnect } = useDisconnect();
  const [viewMode, setViewMode] = useState<'admin' | 'user'>('user');

  // Initialize view mode based on role
  useEffect(() => {
    if (user?.role === 'admin') {
      setViewMode('admin');
    } else {
      setViewMode('user');
    }
  }, [user?.role]);

  console.log('Dashboard rendering with user:', user, 'viewMode:', viewMode);
  
  if (!user) return null;

  const handleLogout = async () => {
    try {
      if (user.isConnected) {
        await disconnect();
      }
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
    }
  };

  const formatAddress = (addr: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-blue-200 shadow-lg">
                {viewMode === 'admin' ? (
                  <Shield className="h-6 w-6 text-white" />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    {viewMode === 'admin' ? 'Admin Central' : 'User Station'} 
                  </h1>
                  {user.role === 'admin' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      Internal Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md inline-block mt-1">
                  {formatAddress(user.address)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Role Toggle for Admin */}
              {user.role === 'admin' && (
                <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-inner">
                  <button
                    onClick={() => setViewMode('admin')}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      viewMode === 'admin' 
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => setViewMode('user')}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      viewMode === 'user' 
                        ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>User</span>
                  </button>
                </div>
              )}

              <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>

              <div className="flex items-center space-x-4">
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-emerald-200 shadow-md animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Live</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Polkadot Hub</span>
                </div>
                
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  size="sm" 
                  className="group flex items-center space-x-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors px-4"
                >
                  <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="font-medium">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {viewMode === 'admin' ? <AdminDashboard /> : <UserDashboard />}
      </main>
    </div>
  );
}

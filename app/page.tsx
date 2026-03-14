'use client';

import { Dashboard } from '@/components/dashboard/dashboard';
import { useAuth } from '@/contexts/auth-context';

function AppContent() {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }
  return <Dashboard />;
}

export default function Page() {
  return <AppContent />;
}

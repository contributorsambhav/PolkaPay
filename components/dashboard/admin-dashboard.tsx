'use client';

import { Activity, FileCheck, LogOut, Settings, Shield, TrendingUp, Users } from 'lucide-react';

import { AdminKYCManagement } from '@/components/kyc/admin-kyc-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OverviewTab } from '@/components/tabs/admin/overview-tab';
import { SettingsTab } from '@/components/tabs/admin/settings-tab';
import { TransactionAnalytics } from '@/components/analytics/transaction-analytics';
import { UsersTab } from '@/components/tabs/admin/users-tab';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  if (!user) return null;
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return <OverviewTab onTabChange={setSelectedTab} />;
      case 'kyc':
        return <AdminKYCManagement />;
      case 'users':
        return <UsersTab />;
      case 'transactions':
        return <TransactionAnalytics />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab onTabChange={setSelectedTab} />;
    }
  };
  return (
    <div className="bg-background pt-2">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'kyc', label: 'KYC Management', icon: FileCheck },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: TrendingUp },
            { id: 'settings', label: 'System Settings', icon: Settings }
          ].map((tab) => (
            <Button key={tab.id} variant={selectedTab === tab.id ? 'default' : 'ghost'} onClick={() => setSelectedTab(tab.id)} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

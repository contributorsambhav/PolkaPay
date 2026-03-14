'use client';

import { Activity, BarChart3, Download, FileCheck, LogOut, Send, Shield, User } from 'lucide-react';
import { KYCTab, OverviewTab, ProfileTab, ReceiveTab, SendTab, TransactionsTab } from '@/components/tabs/user';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
export function UserDashboard() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  if (!user) return null;
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TIER3':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TIER2':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TIER1':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const tabsConfig = [
    { id: 'overview', label: 'Overview', icon: Activity, component: OverviewTab },
    { id: 'send', label: 'Send Money', icon: Send, component: SendTab },
    { id: 'receive', label: 'Receive', icon: Download, component: ReceiveTab },
    { id: 'kyc', label: 'KYC Verification', icon: FileCheck, component: KYCTab },
    { id: 'transactions', label: 'My Transactions', icon: BarChart3, component: TransactionsTab },
    { id: 'profile', label: 'Profile', icon: User, component: ProfileTab }
  ];
  const activeTab = tabsConfig.find((tab) => tab.id === selectedTab);
  const ActiveComponent = activeTab?.component;
  return (
    <div className="bg-background pt-2">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b">
          {tabsConfig.map((tab) => (
            <Button key={tab.id} variant={selectedTab === tab.id ? 'default' : 'ghost'} onClick={() => setSelectedTab(tab.id)} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        {/* Active Tab Content */}
        {ActiveComponent && <ActiveComponent onTabChange={setSelectedTab} />}
      </div>
    </div>
  );
}

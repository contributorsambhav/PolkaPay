'use client';

import { useState } from 'react';
import { SendMoneyForm } from '@/components/contract/send-money-form';
import { ClaimFundsForm } from '@/components/contract/claim-funds-form';
import { StablecoinSendForm } from '@/components/contract/stablecoin-send-form';
import { StablecoinClaimForm } from '@/components/contract/stablecoin-claim-form';
import { cn } from '@/lib/utils';

type TransferMode = 'send' | 'claim' | 'stablecoin-send' | 'stablecoin-claim';

const TABS: { id: TransferMode; label: string; description: string }[] = [
  { id: 'send', label: 'Send', description: 'Send native tokens' },
  { id: 'claim', label: 'Claim', description: 'Claim received funds' },
  { id: 'stablecoin-send', label: 'Send Stablecoin', description: 'Send ERC-20 stablecoins' },
  { id: 'stablecoin-claim', label: 'Claim Stablecoin', description: 'Claim stablecoin funds' },
];

export function TransferTab() {
  const [activeMode, setActiveMode] = useState<TransferMode>('send');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Transfers</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Send and claim funds — native tokens or ERC-20 stablecoins</p>
      </header>

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/80 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMode(tab.id)}
            className={cn(
              'flex-1 min-w-[120px] rounded-md px-3 py-2 text-sm font-medium transition-all',
              activeMode === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeMode === 'send' && <SendMoneyForm />}
        {activeMode === 'claim' && <ClaimFundsForm />}
        {activeMode === 'stablecoin-send' && <StablecoinSendForm />}
        {activeMode === 'stablecoin-claim' && <StablecoinClaimForm />}
      </div>
    </div>
  );
}

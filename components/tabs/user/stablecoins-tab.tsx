'use client';

import { StablecoinSendForm } from '@/components/contract/stablecoin-send-form';
import { StablecoinClaimForm } from '@/components/contract/stablecoin-claim-form';

export function StablecoinsTab() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Stablecoins</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Send and claim ERC-20 stablecoin remittances on Polkadot</p>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StablecoinSendForm />
        <StablecoinClaimForm />
      </div>
    </div>
  );
}

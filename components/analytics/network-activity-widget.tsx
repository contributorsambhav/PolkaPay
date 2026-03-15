'use client';

import { Activity, ArrowUpDown, BarChart3, Clock, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEther, parseAbi } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getContractAddress, CHAIN_ID } from '@/lib/constants';

const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL;

const REMITTANCE_ABI = parseAbi([
  'function getTotalTransactions() external view returns (uint256)',
  'function getMyTransactions() external view returns ((address,address,uint256,uint256,uint256,uint256)[] memory)',
]);

interface DailyStats {
  myTransactions24h: number;
  myVolume24h: number;
  mySent24h: number;
  myReceived24h: number;
  totalNetworkTxns: number;
  peakHour: string;
  avgTxSize24h: number;
}

export function NetworkActivityWidget() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [stats, setStats] = useState<DailyStats>({
    myTransactions24h: 0,
    myVolume24h: 0,
    mySent24h: 0,
    myReceived24h: 0,
    totalNetworkTxns: 0,
    peakHour: '--',
    avgTxSize24h: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setContractAddress(getContractAddress());
  }, []);

  // Get total network transactions
  const { data: totalTransactions, isLoading: loadingTotal } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getTotalTransactions',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected,
    },
  });

  // Get user's own transactions
  const { data: myTransactions, isLoading: loadingMyTxns } = useReadContract({
    address: contractAddress,
    abi: REMITTANCE_ABI,
    functionName: 'getMyTransactions',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: !!contractAddress && isConnected && !!address,
    },
  });

  useEffect(() => {
    if (loadingTotal || loadingMyTxns) {
      setIsLoading(true);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    let my24hCount = 0;
    let my24hVolume = 0;
    let my24hSent = 0;
    let my24hReceived = 0;
    const hourBuckets: Record<number, number> = {};

    if (myTransactions && Array.isArray(myTransactions) && address) {
      for (const tx of myTransactions) {
        const timestamp = Number(tx[4]);
        if (timestamp > oneDayAgo) {
          my24hCount++;
          const amount = Number(formatEther(tx[2] as bigint));
          const sender = (tx[0] as string).toLowerCase();
          const isSent = sender === address.toLowerCase();

          my24hVolume += amount;
          if (isSent) {
            my24hSent += amount;
          } else {
            my24hReceived += amount;
          }

          // Track peak hour
          const hour = new Date(timestamp * 1000).getHours();
          hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
        }
      }
    }

    // Find peak hour
    let peakHour = '--';
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourBuckets)) {
      if (count > maxCount) {
        maxCount = count;
        const h = parseInt(hour);
        peakHour = `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      }
    }

    setStats({
      myTransactions24h: my24hCount,
      myVolume24h: my24hVolume,
      mySent24h: my24hSent,
      myReceived24h: my24hReceived,
      totalNetworkTxns: totalTransactions ? Number(totalTransactions) : 0,
      peakHour,
      avgTxSize24h: my24hCount > 0 ? my24hVolume / my24hCount : 0,
    });

    setIsLoading(false);
  }, [totalTransactions, myTransactions, loadingTotal, loadingMyTxns, address]);

  if (!isConnected || !contractAddress) {
    return null;
  }

  const volumeLevel =
    stats.myVolume24h > 100 ? 'high' : stats.myVolume24h > 10 ? 'moderate' : stats.myVolume24h > 0 ? 'low' : 'none';

  const volumeColor = {
    high: 'text-success',
    moderate: 'text-blue-600',
    low: 'text-yellow-600',
    none: 'text-muted-foreground',
  }[volumeLevel];

  const volumeBadge = {
    high: 'bg-green-100 text-green-800 border-green-200',
    moderate: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    none: 'bg-gray-100 text-gray-800 border-gray-200',
  }[volumeLevel];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            24h Activity Snapshot
          </CardTitle>
          <Badge className={volumeBadge}>
            {volumeLevel === 'none' ? 'No Activity' : `${volumeLevel.charAt(0).toUpperCase() + volumeLevel.slice(1)} Activity`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* My 24h Transactions */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="h-3 w-3" />
              My Transactions
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-xl font-bold">{stats.myTransactions24h}</p>
            )}
            <p className="text-xs text-muted-foreground">last 24 hours</p>
          </div>

          {/* My 24h Volume */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              My Volume
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className={`text-xl font-bold ${volumeColor}`}>
                {stats.myVolume24h.toFixed(2)} {SYMBOL}
              </p>
            )}
            <p className="text-xs text-muted-foreground">combined in/out</p>
          </div>

          {/* Network Total */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Network Total
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-bold">{stats.totalNetworkTxns}</p>
            )}
            <p className="text-xs text-muted-foreground">all-time txns</p>
          </div>

          {/* Avg Size / Peak Hour */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {stats.myTransactions24h > 0 ? 'Avg Size' : 'Peak Hour'}
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : stats.myTransactions24h > 0 ? (
              <p className="text-xl font-bold">
                {stats.avgTxSize24h.toFixed(2)} {SYMBOL}
              </p>
            ) : (
              <p className="text-xl font-bold text-muted-foreground">--</p>
            )}
            <p className="text-xs text-muted-foreground">
              {stats.myTransactions24h > 0 ? 'per transaction' : 'no recent activity'}
            </p>
          </div>
        </div>

        {/* Sent vs Received bar */}
        {stats.myVolume24h > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-destructive font-medium">
                Sent: {stats.mySent24h.toFixed(2)} {SYMBOL}
              </span>
              <span className="text-success font-medium">
                Received: {stats.myReceived24h.toFixed(2)} {SYMBOL}
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-destructive transition-all duration-500"
                style={{
                  width: `${stats.myVolume24h > 0 ? (stats.mySent24h / stats.myVolume24h) * 100 : 50}%`,
                }}
              />
              <div
                className="bg-success transition-all duration-500"
                style={{
                  width: `${stats.myVolume24h > 0 ? (stats.myReceived24h / stats.myVolume24h) * 100 : 50}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

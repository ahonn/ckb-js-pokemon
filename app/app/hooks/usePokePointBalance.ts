import { useState, useEffect, useCallback } from 'react';
import { ccc } from '@ckb-ccc/core';
import { fetchPokePointBalance } from '../utils/pokepoint';

interface UsePokePointBalanceReturn {
  balance: number;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

interface UsePokePointBalanceOptions {
  signer?: ccc.Signer;
  client?: ccc.Client;
  autoLoad?: boolean;
}

export function usePokePointBalance({ 
  signer, 
  client, 
  autoLoad = true 
}: UsePokePointBalanceOptions): UsePokePointBalanceReturn {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    if (!signer || !client) {
      setBalance(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const addressObjs = await signer.getAddressObjs();
      const lockScript = addressObjs[0].script;
      const points = await fetchPokePointBalance(client, lockScript);

      setBalance(Number(points));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  }, [signer, client]);

  useEffect(() => {
    if (autoLoad && signer && client) {
      loadBalance();
    }
  }, [signer, client, loadBalance, autoLoad]);

  // Reload balance when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && signer && client) {
        loadBalance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBalance, signer, client]);

  return {
    balance,
    loading,
    error,
    refreshBalance: loadBalance,
  };
}
"use client";

import { useState, useEffect, useCallback } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { fetchPokePointBalance } from "../utils/pokepoint";

interface PokePointBalanceProps {
  signer?: ccc.Signer;
  client: ccc.Client;
}

export default function PokePointBalance({ signer, client }: PokePointBalanceProps) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!signer) return;
    
    setLoading(true);
    try {
      const addressObjs = await signer.getAddressObjs();
      const lockScript = addressObjs[0].script;
      const points = await fetchPokePointBalance(client, lockScript);
      setBalance(points);
    } catch (error) {
      console.error("Failed to load PokePoint balance:", error);
    } finally {
      setLoading(false);
    }
  }, [signer, client]);

  useEffect(() => {
    loadBalance();
  }, [signer, loadBalance]);

  if (!signer) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your PokePoint Balance</h2>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-blue-600">
            {loading ? "..." : balance.toString()}
          </p>
          <p className="text-sm text-gray-500">PokePoints</p>
        </div>
        
        <button
          onClick={loadBalance}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "../context";
import { useState, useEffect, useCallback } from "react";
import { formatString } from "../utils";
import { fetchPokePointBalance } from "../utils/pokepoint";
import Modal from "./Modal";
import { PokePointExchange } from "./PokePointExchange";

export function Navigation() {
  const pathname = usePathname();
  const { signer } = useApp();
  const { open, client } = ccc.useCcc();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [showExchangeModal, setShowExchangeModal] = useState(false);

  const navItems: { href: string; label: string; description: string }[] = [];

  const loadBalance = useCallback(async () => {
    if (!signer || !client) return;

    try {
      setLoading(true);
      const signerAddress = await signer.getRecommendedAddress();
      setAddress(signerAddress);

      // Use the proper fetchPokePointBalance function that searches by type script
      const addressObjs = await signer.getAddressObjs();
      const lockScript = addressObjs[0].script;
      const points = await fetchPokePointBalance(client, lockScript);
      
      setBalance(Number(points));
    } catch (error) {
      console.error("Failed to load balance:", error);
    } finally {
      setLoading(false);
    }
  }, [signer, client]);

  useEffect(() => {
    if (signer && client) {
      loadBalance();
    }
  }, [signer, client, loadBalance]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              CKB Pokemon
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {signer ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">PokePoints</div>
                    <div className="font-bold text-lg">
                      {loading ? "..." : balance.toLocaleString()} PP
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExchangeModal(true)}
                    className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
                  >
                    Recharge
                  </button>
                </div>
                <div className="border-l border-gray-300 pl-4">
                  <div className="text-sm text-gray-600">Connected</div>
                  <div className="font-mono text-sm">
                    {formatString(address, 8, 6)}
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={open}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        title="Recharge PokePoints"
      >
        <PokePointExchange 
          onSuccess={() => {
            setShowExchangeModal(false);
            loadBalance(); // Refresh balance after successful exchange
          }}
        />
      </Modal>
    </nav>
  );
}

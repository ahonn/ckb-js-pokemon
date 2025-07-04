'use client';

import Link from 'next/link';
import { ccc } from '@ckb-ccc/connector-react';
import { useApp } from '../context';
import { useState, useEffect } from 'react';
import { formatString } from '../utils';
import { usePokePointBalance } from '../hooks/usePokePointBalance';
import Modal from './Modal';
import { PokePointExchange } from './PokePointExchange';

export function Navigation() {
  const { wallet } = useApp();
  const { open, client, disconnect } = ccc.useCcc();
  const [address, setAddress] = useState<string>('');
  const [showExchangeModal, setShowExchangeModal] = useState(false);

  // Use the custom hook for balance management
  const {
    balance,
    loading: balanceLoading,
    refreshBalance,
  } = usePokePointBalance({
    signer: wallet.signer,
    client,
  });

  useEffect(() => {
    if (wallet.signer) {
      wallet.signer.getRecommendedAddress().then(setAddress);
    }
  }, [wallet.signer]);

  const handleExchangeSuccess = () => {
    setShowExchangeModal(false);
    refreshBalance();
  };

  return (
    <>
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-white/50 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between px-6 py-3">
            <NavBrand />
            <NavActions
              signer={wallet.signer}
              balance={balance}
              balanceLoading={balanceLoading}
              address={address}
              onRecharge={() => setShowExchangeModal(true)}
              onConnect={open}
              onDisconnect={disconnect}
            />
          </div>
        </div>
      </nav>

      <ExchangeModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        onSuccess={handleExchangeSuccess}
      />
    </>
  );
}

// Extract sub-components for better organization and readability
function NavBrand() {
  return (
    <div className="flex items-center gap-6">
      <Link
        href="/"
        className="text-lg font-bold text-gray-800 hover:text-blue-600 transition-colors"
      >
        Pokemon
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
        >
          Shop
        </Link>
        <Link
          href="/my-pokemon"
          className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
        >
          My Pokemon
        </Link>
      </div>
    </div>
  );
}

interface NavActionsProps {
  signer?: ccc.Signer;
  balance: number;
  balanceLoading: boolean;
  address: string;
  onRecharge: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function NavActions({
  signer,
  balance,
  balanceLoading,
  address,
  onRecharge,
  onConnect,
  onDisconnect,
}: NavActionsProps) {
  if (!signer) {
    return (
      <button
        onClick={onConnect}
        className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 border border-red-700"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <BalanceDisplay balance={balance} loading={balanceLoading} onRecharge={onRecharge} />
      <AddressDisplay address={address} />
      <DisconnectButton onDisconnect={onDisconnect} />
    </div>
  );
}

interface BalanceDisplayProps {
  balance: number;
  loading: boolean;
  onRecharge: () => void;
}

function BalanceDisplay({ balance, loading, onRecharge }: BalanceDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="font-bold text-sm text-gray-800">
          {loading ? '...' : balance.toLocaleString()} PP
        </div>
      </div>
      <button
        onClick={onRecharge}
        className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 text-xs rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 border border-yellow-600"
      >
        Recharge
      </button>
    </div>
  );
}

interface AddressDisplayProps {
  address: string;
}

function AddressDisplay({ address }: AddressDisplayProps) {
  return (
    <div className="border-l border-gray-300 pl-3">
      <div className="font-bold text-sm text-gray-800">{formatString(address, 6, 4)}</div>
    </div>
  );
}

interface DisconnectButtonProps {
  onDisconnect: () => void;
}

function DisconnectButton({ onDisconnect }: DisconnectButtonProps) {
  return (
    <button
      onClick={onDisconnect}
      className="px-3 py-1.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs rounded-full hover:from-gray-500 hover:to-gray-600 transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 border border-gray-600"
      title="Disconnect Wallet"
    >
      Disconnect
    </button>
  );
}

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ExchangeModal({ isOpen, onClose, onSuccess }: ExchangeModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recharge PokePoints">
      <PokePointExchange onSuccess={onSuccess} onClose={onClose} />
    </Modal>
  );
}

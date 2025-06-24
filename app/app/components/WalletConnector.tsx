'use client';

import { ccc } from '@ckb-ccc/connector-react';
import { useEffect, useState } from 'react';

function WalletIcon({
  wallet,
  className,
}: {
  wallet: ccc.Wallet;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallet.icon}
      alt={wallet.name}
      className={`rounded-full ${className}`}
      style={{ width: "1rem", height: "1rem" }}
    />
  );
}

function formatString(str: string, start: number, end: number) {
  if (str.length <= start + end) {
    return str;
  }
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export function WalletConnector() {
  const { wallet, signerInfo, open, disconnect } = ccc.useCcc();
  const [address, setAddress] = useState<string>("");

  const signer = signerInfo?.signer;

  useEffect(() => {
    signer?.getInternalAddress().then((a) => setAddress(a));
  }, [signer]);

  if (signer && address) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-100 rounded-lg">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-800">Connected</span>
          <div className="flex items-center text-xs text-green-600 font-mono">
            {wallet && <WalletIcon wallet={wallet} className="mr-2" />}
            {formatString(address, 8, 6)}
          </div>
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
      <span className="text-sm text-gray-600">Wallet not connected</span>
      <button
        onClick={open}
        className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Connect Wallet
      </button>
    </div>
  );
}
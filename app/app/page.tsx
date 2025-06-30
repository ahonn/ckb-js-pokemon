"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "./context";
import { PokePointExchange } from "./components/PokePointExchange";
import PokePointBalance from "./components/PokePointBalance";

export default function Home() {
  const { signer } = useApp();
  const { open, client } = ccc.useCcc();

  if (signer) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center">CKB Pokemon NFT Game</h1>
        <div className="text-center">
          <p className="text-green-600 font-semibold">✅ Wallet Connected!</p>
          <p className="text-gray-600 mt-1">You can now interact with CKB blockchain.</p>
        </div>
        
        <div className="grid gap-6 w-full">
          <PokePointBalance signer={signer} client={client} />
          
          <div className="grid gap-6 md:grid-cols-2 w-full">
            <PokePointExchange />
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Pokemon Collection</h2>
              <p className="text-gray-500 text-center py-8">
                Coming soon! Purchase Pokemon NFTs with your PokePoints.
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Pokemon Management</h2>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold text-gray-400 mb-2">Pokemon Features (Coming Soon)</h3>
              <p className="text-sm text-gray-500">
                Create, transfer, trade, and manage your Pokemon NFT collection on the CKB blockchain.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">CKB Pokemon NFT Game</h1>
      <button
        onClick={open}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Connect Wallet
      </button>
    </div>
  );
}

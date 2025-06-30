"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "./context";
import { PokePointExchange } from "./components/PokePointExchange";
import PokePointBalance from "./components/PokePointBalance";
import PokemonShop from "./components/PokemonShop";

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
          </div>
          
          <PokemonShop signer={signer} client={client} />
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

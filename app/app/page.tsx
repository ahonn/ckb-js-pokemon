"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "./context";
import PokemonShop from "./components/PokemonShop";
import AvailablePokemon from "./components/AvailablePokemon";

export default function Home() {
  const { signer } = useApp();
  const { client } = ccc.useCcc();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto p-4">
      <div className="grid gap-6 w-full">
        {!signer ? (
          <>
            <div className="text-center">
              <p className="text-gray-600 mb-4">Browse available Pokemon or connect your wallet to purchase</p>
            </div>
            <AvailablePokemon />
          </>
        ) : (
          <PokemonShop signer={signer} client={client} />
        )}
      </div>
    </div>
  );
}

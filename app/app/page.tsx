"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "./context";
import PokemonShop from "./components/PokemonShop";

export default function Home() {
  const { wallet } = useApp();
  const { client } = ccc.useCcc();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-full mx-auto p-4">
      <div className="grid gap-6 w-full">
        <PokemonShop signer={wallet.signer} client={client} />
      </div>
    </div>
  );
}

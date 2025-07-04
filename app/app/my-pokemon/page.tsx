"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "../context";
import MyPokemon from "../components/MyPokemon";

export default function MyPokemonPage() {
  const { wallet } = useApp();
  const { client, signerInfo } = ccc.useCcc();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-full mx-auto p-4">
      <div className="grid gap-6 w-full">
        <MyPokemon signer={signerInfo?.signer || wallet.signer || null} client={client} />
      </div>
    </div>
  );
}
'use client';

import { ccc } from '@ckb-ccc/core';
import { ccc as cccReact } from '@ckb-ccc/connector-react';
import { usePokemonData, Pokemon } from '../hooks/usePokemonData';
import { usePokemonPurchase } from '../hooks/usePokemonPurchase';
import { PokemonCard } from './PokemonCard';
import { LoadingGrid } from './LoadingGrid';
import { EmptyState } from './EmptyState';

interface PokemonShopProps {
  signer?: ccc.Signer;
  client: ccc.Client;
  onPurchase?: (pokemonId: number) => void;
}

export default function PokemonShop({ signer, client, onPurchase }: PokemonShopProps) {
  const { availablePokemon, loading, error, refreshPokemon } = usePokemonData({ client });
  const { open } = cccReact.useCcc();
  
  const { purchasing, purchaseError, purchasePokemon } = usePokemonPurchase({
    onPurchaseSuccess: onPurchase,
    onPurchaseComplete: refreshPokemon,
  });

  const handlePurchase = (pokemon: Pokemon) => {
    if (!signer) {
      // Open CCC wallet connection dialog
      open();
      return;
    }
    purchasePokemon(pokemon);
  };

  if (loading) {
    return (
      <div className="p-6 w-full max-w-none">
        <ShopHeader />
        <LoadingGrid />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 w-full max-w-none">
        <ShopHeader />
        <EmptyState
          icon="⚠️"
          title="Error Loading Pokemon"
          description={error}
          actionText="Try Again"
          onAction={refreshPokemon}
        />
      </div>
    );
  }

  if (availablePokemon.length === 0) {
    return (
      <div className="p-6 w-full max-w-none">
        <ShopHeader />
        <EmptyState
          icon="🔍"
          title="No Pokemon Found"
          description="No Pokemon NFTs are currently available for purchase from this issuer. Pokemon need to be issued first using the issue-pokemon.js script."
          actionText="Refresh"
          onAction={refreshPokemon}
        />
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-none">
      <ShopHeader />
      
      {purchaseError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Purchase Failed:</strong> {purchaseError}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-4">
        {availablePokemon.map((pokemon) => (
          <PokemonCard
            key={pokemon.id}
            pokemon={pokemon}
            onPurchase={handlePurchase}
            purchasing={purchasing === pokemon.id}
          />
        ))}
      </div>
    </div>
  );
}

// Extract header as a separate component for better organization
function ShopHeader() {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Pokemon Shop</h2>
      <p className="text-gray-700 mb-6 text-center font-medium">
        Purchase Pokemon NFTs with your PokePoints
      </p>
    </>
  );
}
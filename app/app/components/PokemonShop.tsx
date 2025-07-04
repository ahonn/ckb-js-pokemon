'use client';

import { useRef, useEffect } from 'react';
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
  const { 
    availablePokemon, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    refreshPokemon,
  } = usePokemonData({ client });
  const { open } = cccReact.useCcc();
  
  const { purchasing, purchaseError, purchasePokemon } = usePokemonPurchase({
    onPurchaseSuccess: onPurchase,
    onPurchaseComplete: refreshPokemon,
    signer,
    client,
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
            key={`${pokemon.cellId?.txHash}-${pokemon.cellId?.index}` || pokemon.id}
            pokemon={pokemon}
            onPurchase={handlePurchase}
            purchasing={purchasing === pokemon.id}
          />
        ))}
      </div>
      
      {/* Infinite Scroll Loading */}
      <InfiniteScrollTrigger
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
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

interface InfiniteScrollTriggerProps {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function InfiniteScrollTrigger({ hasMore, loadingMore, onLoadMore }: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => {
      if (triggerRef.current) {
        observer.unobserve(triggerRef.current);
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  if (!hasMore && !loadingMore) {
    return (
      <div className="mt-8 text-center text-gray-500">
        <p>No more Pokemon to load</p>
      </div>
    );
  }

  return (
    <div ref={triggerRef} className="mt-8 flex justify-center">
      {loadingMore ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Loading more Pokemon...</span>
        </div>
      ) : hasMore ? (
        <button
          onClick={onLoadMore}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Load More Pokemon
        </button>
      ) : null}
    </div>
  );
}
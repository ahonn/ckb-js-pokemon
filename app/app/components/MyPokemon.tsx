'use client';

import { useRef, useEffect, useState } from 'react';
import { ccc } from '@ckb-ccc/core';
import { useOwnedPokemon } from '../hooks/useOwnedPokemon';
import { OwnedPokemonCard } from './OwnedPokemonCard';
import { LoadingGrid } from './LoadingGrid';
import { EmptyState } from './EmptyState';

interface MyPokemonProps {
  signer: ccc.Signer | null;
  client: ccc.Client;
}

export default function MyPokemon({ signer, client }: MyPokemonProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { 
    ownedPokemon, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    refreshPokemon,
  } = useOwnedPokemon({ client, signer });

  // Handle initial loading state to avoid showing "wallet not connected" flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 500); // Wait 500ms for wallet to initialize

    return () => clearTimeout(timer);
  }, []);

  // Reset initializing state when signer becomes available or changes
  useEffect(() => {
    if (signer) {
      setIsInitializing(false);
    }
  }, [signer]);

  // Show loading during initial setup or data loading
  if (isInitializing || loading) {
    return (
      <div className="p-6 w-full max-w-none">
        <MyPokemonHeader />
        <div className="max-w-7xl mx-auto">
          <LoadingGrid className="gap-8 no-padding" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 w-full max-w-none">
        <MyPokemonHeader />
        <EmptyState
          icon="⚠️"
          title="Error Loading Your Pokemon"
          description={error}
          actionText="Try Again"
          onAction={refreshPokemon}
        />
      </div>
    );
  }

  if (!signer) {
    return (
      <div className="p-6 w-full max-w-none">
        <MyPokemonHeader />
        <EmptyState
          icon="🔒"
          title="Wallet Not Connected"
          description="Please connect your wallet to view your Pokemon collection."
        />
      </div>
    );
  }

  if (ownedPokemon.length === 0) {
    return (
      <div className="p-6 w-full max-w-none">
        <MyPokemonHeader />
        <EmptyState
          icon="📦"
          title="No Pokemon Found"
          description="You don't own any Pokemon yet. Visit the shop to start your collection!"
        />
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-none">
      <MyPokemonHeader />
      
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {ownedPokemon.map((pokemon) => (
            <OwnedPokemonCard
              key={`${pokemon.cellId?.txHash}-${pokemon.cellId?.index}` || pokemon.id}
              pokemon={pokemon}
            />
          ))}
        </div>
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
function MyPokemonHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold mb-3 text-gray-900 tracking-tight">
        My Pokemon Collection
      </h1>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Discover and manage your unique Pokemon NFT collection
      </p>
    </div>
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
    return null;
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
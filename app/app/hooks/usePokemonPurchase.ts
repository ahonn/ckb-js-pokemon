import { useState, useCallback } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { Pokemon } from './usePokemonData';
import { buildPokemonPurchaseTransaction } from '../utils/pokemon';

interface UsePokemonPurchaseReturn {
  purchasing: number | null;
  purchaseError: string | null;
  purchasePokemon: (pokemon: Pokemon) => Promise<void>;
}

interface UsePokemonPurchaseOptions {
  onPurchaseSuccess?: (pokemonId: number) => void;
  onPurchaseComplete?: () => Promise<void>;
  signer?: ccc.Signer;
  client?: ccc.Client;
}

export function usePokemonPurchase({ 
  onPurchaseSuccess, 
  onPurchaseComplete,
  signer,
  client,
}: UsePokemonPurchaseOptions = {}): UsePokemonPurchaseReturn {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const purchasePokemon = useCallback(async (pokemon: Pokemon) => {
    if (!signer || !client) {
      setPurchaseError('Signer or client not available');
      return;
    }

    try {
      setPurchasing(pokemon.id);
      setPurchaseError(null);

      // Find the Pokemon cell to purchase
      if (!pokemon.cellId) {
        throw new Error('Pokemon cell ID not found');
      }

      // Get the Pokemon cell
      const pokemonCell = await client.getCell(ccc.OutPoint.from({
        txHash: pokemon.cellId.txHash,
        index: BigInt(pokemon.cellId.index),
      }));

      if (!pokemonCell) {
        throw new Error('Pokemon cell not found');
      }

      // Build the purchase transaction
      const tx = await buildPokemonPurchaseTransaction(
        client,
        signer,
        pokemon,
        pokemonCell
      );

      // Sign and send the transaction
      const signedTx = await signer.signTransaction(tx);
      const txHash = await client.sendTransaction(signedTx);

      // Wait for confirmation
      await client.waitTransaction(txHash);

      if (onPurchaseSuccess) {
        onPurchaseSuccess(pokemon.id);
      }

      // Refresh data after purchase
      if (onPurchaseComplete) {
        await onPurchaseComplete();
      }
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  }, [signer, client, onPurchaseSuccess, onPurchaseComplete]);

  return {
    purchasing,
    purchaseError,
    purchasePokemon,
  };
}
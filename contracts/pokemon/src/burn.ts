import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import { loadPokemonData } from './utils';

export function validateBurnTransaction(): number {
  log.debug('Validating burn transaction - allowing owners to burn their Pokemon');

  // In a burn transaction, we only have Pokemon inputs and no Pokemon outputs
  // We only need to validate that the Pokemon data is valid
  // No ownership check needed since CKB's lock script already ensures only the owner can spend the cell
  
  let inputIndex = 0;
  const burnedPokemonIds = new Set<bigint>();

  while (true) {
    try {
      // Try to load Pokemon data from each input
      const pokemonData = loadPokemonData(inputIndex, bindings.SOURCE_GROUP_INPUT);
      log.debug(`Burning Pokemon - index: ${inputIndex}, pokemonId: ${pokemonData.pokemonId}, price: ${pokemonData.price}`);

      // Validate Pokemon ID is not zero
      if (pokemonData.pokemonId === 0n) {
        log.debug(`Invalid Pokemon ID (zero) at input ${inputIndex}`);
        return 1;
      }

      // Track burned Pokemon IDs (for logging purposes)
      burnedPokemonIds.add(pokemonData.pokemonId);

      inputIndex++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        // No more inputs to process
        break;
      } else {
        // Other error, propagate it
        throw error;
      }
    }
  }

  // Ensure we have at least one Pokemon input to burn
  if (inputIndex === 0) {
    log.debug('No Pokemon inputs found to burn');
    return 1;
  }

  log.debug(`Burn transaction validation successful - burned ${inputIndex} Pokemon NFTs`);
  return 0;
}
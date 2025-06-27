import * as bindings from '@ckb-js-std/bindings';
import { log, HighLevel } from '@ckb-js-std/core';
import { loadPokemonData, ensureOnlyOne } from './utils';

export function validateTransferTransaction(): number {
  log.debug('Validating transfer transaction');

  // Ensure only one Pokemon input and output
  ensureOnlyOne(bindings.SOURCE_GROUP_INPUT);
  ensureOnlyOne(bindings.SOURCE_GROUP_OUTPUT);

  // Load Pokemon data from input and output
  const inputPokemonData = loadPokemonData(0, bindings.SOURCE_GROUP_INPUT);
  const outputPokemonData = loadPokemonData(0, bindings.SOURCE_GROUP_OUTPUT);

  log.debug(
    `Input Pokemon - pokemonId: ${inputPokemonData.pokemonId}, price: ${inputPokemonData.price}`,
  );
  log.debug(
    `Output Pokemon - pokemonId: ${outputPokemonData.pokemonId}, price: ${outputPokemonData.price}`,
  );

  // Validate Pokemon data integrity (pokemonId and price must remain unchanged)
  if (
    inputPokemonData.pokemonId !== outputPokemonData.pokemonId ||
    inputPokemonData.price !== outputPokemonData.price
  ) {
    log.debug('Pokemon data has been modified during transfer');
    return 1;
  }

  // Validate that the owner actually changed (prevent no-op transfers)
  if (!validateOwnershipChange()) {
    log.debug('Invalid transfer: ownership did not change');
    return 1;
  }

  log.debug('Transfer transaction validation successful');
  return 0;
}

/**
 * Validate that the Pokemon ownership actually changed
 */
function validateOwnershipChange(): boolean {
  try {
    // Get input and output lock script hashes
    const inputLockHash = HighLevel.loadCellLockHash(0, bindings.SOURCE_GROUP_INPUT);
    const outputLockHash = HighLevel.loadCellLockHash(0, bindings.SOURCE_GROUP_OUTPUT);

    if (!inputLockHash || !outputLockHash) {
      log.debug('Failed to load lock script hashes');
      return false;
    }

    const inputLockHashArray = new Uint8Array(inputLockHash);
    const outputLockHashArray = new Uint8Array(outputLockHash);

    log.debug(`Input lock hash length: ${inputLockHashArray.length}`);
    log.debug(`Output lock hash length: ${outputLockHashArray.length}`);

    // Check if lock hashes are different (ownership changed)
    if (areHashesEqual(inputLockHashArray, outputLockHashArray)) {
      log.debug('Lock script hashes are the same - no ownership change');
      return false;
    }

    log.debug('Ownership change validated successfully');
    return true;
  } catch (error: any) {
    log.debug(`Error validating ownership change: ${error.message || error}`);
    return false;
  }
}

/**
 * Compare two hash arrays for equality
 */
function areHashesEqual(hash1: Uint8Array, hash2: Uint8Array): boolean {
  if (hash1.length !== hash2.length) {
    return false;
  }

  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      return false;
    }
  }

  return true;
}

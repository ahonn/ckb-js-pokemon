import * as bindings from '@ckb-js-std/bindings';
import { log, HighLevel } from '@ckb-js-std/core';
import { loadPokemonData, loadIssuerLockHash, ensureOnlyOne } from './utils';

export function validateIssueTransaction(): number {
  log.debug('Validating issue transaction');

  // Validate issuer authorization first
  const expectedIssuerLockHash = loadIssuerLockHash();
  const actualIssuerLockHash = getInputLockCodeHash();

  log.debug(`Expected issuer lock hash length: ${expectedIssuerLockHash.length}`);
  log.debug(`Actual issuer lock hash length: ${actualIssuerLockHash.length}`);

  // Compare issuer lock hashes
  if (!areHashesEqual(expectedIssuerLockHash, actualIssuerLockHash)) {
    log.debug('Unauthorized issuer: lock hash mismatch');
    return 1;
  }

  // Validate all Pokemon outputs (support batch issuance)
  let outputIndex = 0;
  const usedPokemonIds = new Set<bigint>();

  while (true) {
    try {
      // Try to load Pokemon data from each output
      const pokemonData = loadPokemonData(outputIndex, bindings.SOURCE_GROUP_OUTPUT);
      log.debug(`Pokemon data - index: ${outputIndex}, pokemonId: ${pokemonData.pokemonId}, price: ${pokemonData.price}`);

      // Validate Pokemon ID is not zero
      if (pokemonData.pokemonId === 0n) {
        log.debug(`Pokemon ID cannot be zero at output ${outputIndex}`);
        return 1;
      }

      // Validate price is not zero
      if (pokemonData.price === 0n) {
        log.debug(`Price cannot be zero at output ${outputIndex}`);
        return 1;
      }

      // Validate Pokemon ID is unique in this transaction
      if (usedPokemonIds.has(pokemonData.pokemonId)) {
        log.debug(`Duplicate Pokemon ID ${pokemonData.pokemonId} at output ${outputIndex}`);
        return 1;
      }
      usedPokemonIds.add(pokemonData.pokemonId);

      outputIndex++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        // No more outputs to process
        break;
      } else {
        // Other error, propagate it
        throw error;
      }
    }
  }

  // Ensure we have at least one Pokemon output
  if (outputIndex === 0) {
    log.debug('No Pokemon outputs found');
    return 1;
  }

  log.debug(`Issue transaction validation successful - processed ${outputIndex} Pokemon outputs`);
  return 0;
}

/**
 * Get the lock script hash from the first input cell (issuer's input)
 */
function getInputLockCodeHash(): Uint8Array {
  const lockHash = HighLevel.loadCellLockHash(0, bindings.SOURCE_INPUT);
  return new Uint8Array(lockHash);
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

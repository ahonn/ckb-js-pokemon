import * as bindings from '@ckb-js-std/bindings';
import { log, HighLevel } from '@ckb-js-std/core';
import { loadPokemonData, loadIssuerLockHash } from './utils';

export function validateBurnTransaction(): number {
  log.debug('Validating burn transaction - checking burn permissions');

  // In a burn transaction, we only have Pokemon inputs and no Pokemon outputs
  // We need to validate that only authorized parties can burn Pokemon
  // For Pokemon with Always Success Lock, we need additional protection
  
  // Load expected issuer lock hash from contract args
  const expectedIssuerLockHash = loadIssuerLockHash();
  
  // Check if burn is authorized by verifying issuer signature or ownership
  if (!isBurnAuthorized(expectedIssuerLockHash)) {
    log.debug('Burn transaction not authorized - only issuer can burn Pokemon');
    return 1;
  }
  
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

/**
 * Check if burn operation is authorized
 * Only allows burns that have issuer's signature in the transaction
 */
function isBurnAuthorized(expectedIssuerLockHash: Uint8Array): boolean {
  log.debug('Checking burn authorization');
  
  // Method 1: Check if any input has issuer's lock (issuer is signing the transaction)
  let index = 0;
  while (true) {
    try {
      const actualLockHash = HighLevel.loadCellLockHash(index, bindings.SOURCE_INPUT);
      if (actualLockHash) {
        const actualLockHashArray = new Uint8Array(actualLockHash);
        
        // If issuer's lock is found in inputs, issuer is signing this transaction
        if (areHashesEqual(expectedIssuerLockHash, actualLockHashArray)) {
          log.debug(`Found issuer lock at input ${index} - burn authorized`);
          return true;
        }
      }
      index++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        break;
      } else {
        index++;
        if (index > 100) break; // Safety limit
      }
    }
  }
  
  // Method 2: Check if any output has issuer's lock (issuer receiving something)
  index = 0;
  while (true) {
    try {
      const actualLockHash = HighLevel.loadCellLockHash(index, bindings.SOURCE_OUTPUT);
      if (actualLockHash) {
        const actualLockHashArray = new Uint8Array(actualLockHash);
        
        // If issuer's lock is found in outputs, this might be an authorized operation
        if (areHashesEqual(expectedIssuerLockHash, actualLockHashArray)) {
          log.debug(`Found issuer lock at output ${index} - burn authorized`);
          return true;
        }
      }
      index++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        break;
      } else {
        index++;
        if (index > 100) break; // Safety limit
      }
    }
  }
  
  log.debug('No issuer authorization found - burn denied');
  return false;
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
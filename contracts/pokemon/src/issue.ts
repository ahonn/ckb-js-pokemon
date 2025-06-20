import * as bindings from '@ckb-js-std/bindings';
import { log, HighLevel } from '@ckb-js-std/core';
import { loadPokemonData, loadIssuerLockHash, ensureOnlyOne } from './utils';

export function validateIssueTransaction(): number {
  log.debug('Validating issue transaction');

  // Ensure only one Pokemon output
  ensureOnlyOne(bindings.SOURCE_GROUP_OUTPUT);

  // Load Pokemon data from the single output
  const pokemonData = loadPokemonData(0, bindings.SOURCE_GROUP_OUTPUT);
  log.debug(`Pokemon data - price: ${pokemonData.price}, pointAmount: ${pokemonData.pointAmount}`);

  // Validate price is not zero
  if (pokemonData.price === 0n) {
    log.debug('Price cannot be zero');
    return 1;
  }

  // Validate pointAmount is not zero
  if (pokemonData.pointAmount === 0n) {
    log.debug('Point amount cannot be zero');
    return 1;
  }

  // Validate issuer authorization
  const expectedIssuerLockHash = loadIssuerLockHash();
  // Get the lock script code hash of the transaction input
  const actualIssuerLockHash = getInputLockCodeHash();

  log.debug(`Expected issuer lock hash length: ${expectedIssuerLockHash.length}`);
  log.debug(`Actual issuer lock hash length: ${actualIssuerLockHash.length}`);

  // Compare issuer lock hashes
  if (!areHashesEqual(expectedIssuerLockHash, actualIssuerLockHash)) {
    log.debug('Unauthorized issuer: lock hash mismatch');
    return 1;
  }

  log.debug('Issue transaction validation successful');
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

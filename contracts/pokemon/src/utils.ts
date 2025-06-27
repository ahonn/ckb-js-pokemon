import * as bindings from '@ckb-js-std/bindings';
import { numFromBytes, HighLevel, log } from '@ckb-js-std/core';

/**
 * Pokemon cell data structure
 */
export interface PokemonData {
  pokemonId: bigint; // uint128 (16 bytes)
  price: bigint; // uint16 (2 bytes)
}

/**
 * Load Pokemon Cell's data (pokemonId + price)
 * Format: pokemonId(uint128, 16 bytes) + price(uint16, 2 bytes) = 18 bytes total
 */
export function loadPokemonData(index: number, source: bindings.SourceType): PokemonData {
  const data = bindings.loadCellData(index, source);
  if (data.byteLength !== 18) {
    throw new Error(`Invalid Pokemon data length: expected 18, got ${data.byteLength}`);
  }

  // Parse pokemonId (uint128, first 16 bytes)
  const pokemonIdBuffer = data.slice(0, 16);
  const pokemonId = numFromBytes(pokemonIdBuffer);

  // Parse price (uint16, next 2 bytes)
  const priceBuffer = data.slice(16, 18);
  const price = numFromBytes(priceBuffer);

  return { pokemonId, price };
}

/**
 * Get issuer lock hash from script args
 * Args structure: vmArgs(2) + codeHash(32) + hashType(1) + issuerLockHash(32) + pokePointTypeHash(32)
 */
export function loadIssuerLockHash(): Uint8Array {
  const script = HighLevel.loadScript();
  const argsArray = new Uint8Array(script.args);

  if (argsArray.length < 99) {
    // 2 + 32 + 1 + 32 + 32 = 99
    throw new Error(`Script args too short: expected at least 99 bytes, got ${argsArray.length}`);
  }

  // issuerLockHash is at bytes 35-66 (32 bytes)
  return argsArray.slice(35, 67);
}

/**
 * Get PokePoint type hash from script args
 * Args structure: vmArgs(2) + codeHash(32) + hashType(1) + issuerLockHash(32) + pokePointTypeHash(32)
 */
export function loadPokePointTypeHash(): Uint8Array {
  const script = HighLevel.loadScript();
  const argsArray = new Uint8Array(script.args);

  if (argsArray.length < 99) {
    // 2 + 32 + 1 + 32 + 32 = 99
    throw new Error(`Script args too short: expected at least 99 bytes, got ${argsArray.length}`);
  }

  // pokePointTypeHash is at bytes 67-98 (32 bytes)
  return argsArray.slice(67, 99);
}

/**
 * Transaction types
 */
export const TransactionType = {
  ISSUE: 'issue',
  PURCHASE: 'purchase',
  TRANSFER: 'transfer',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

/**
 * Check if this is a creation transaction (no Pokemon cells in inputs)
 */
export function isCreationTransaction(): boolean {
  try {
    HighLevel.loadCellTypeHash(0, bindings.SOURCE_GROUP_INPUT);
    return false;
  } catch (error: any) {
    if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
      return true;
    } else {
      throw error;
    }
  }
}

/**
 * Check if there are any Pokemon outputs
 */
function hasPokemonOutputs(): boolean {
  try {
    HighLevel.loadCellTypeHash(0, bindings.SOURCE_GROUP_OUTPUT);
    return true;
  } catch (error: any) {
    if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
      return false;
    } else {
      throw error;
    }
  }
}

/**
 * Get the transaction type based on inputs and outputs
 */
export function getTransactionType(): TransactionTypeValue {
  const hasInputs = !isCreationTransaction();
  const hasOutputs = hasPokemonOutputs();

  if (!hasInputs && hasOutputs) {
    return TransactionType.ISSUE;
  } else if (hasInputs && hasOutputs) {
    // Could be PURCHASE or TRANSFER - need to check for PokePoint inputs
    if (hasPokePointInputs()) {
      return TransactionType.PURCHASE;
    } else {
      return TransactionType.TRANSFER;
    }
  } else {
    throw new Error('Invalid transaction: no Pokemon inputs or outputs');
  }
}

/**
 * Check if there are PokePoint input cells
 */
function hasPokePointInputs(): boolean {
  const expectedPokePointTypeHash = loadPokePointTypeHash();
  log.debug(`Expected PokePoint type hash length: ${expectedPokePointTypeHash.length}`);
  
  let index = 0;
  while (true) {
    try {
      // Try to load each input cell's type hash
      const actualTypeHash = HighLevel.loadCellTypeHash(index, bindings.SOURCE_INPUT);
      if (actualTypeHash) {
        const actualTypeHashArray = new Uint8Array(actualTypeHash);
        log.debug(`Input ${index} type hash length: ${actualTypeHashArray.length}`);
        
        // Compare with expected PokePoint type hash
        if (areHashesEqual(expectedPokePointTypeHash, actualTypeHashArray)) {
          log.debug(`Found matching PokePoint at input ${index}`);
          return true;
        }
      }
      index++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        break;
      } else {
        // Other errors, continue to next cell
        index++;
        if (index > 100) break; // Safety limit
      }
    }
  }
  
  log.debug('No PokePoint inputs found');
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

/**
 * Ensure there's only one cell of the specified type
 */
export function ensureOnlyOne(source: bindings.SourceType): void {
  try {
    HighLevel.loadCellTypeHash(1, source);
    throw new Error(`More than one cell found in ${source} source`);
  } catch (error: any) {
    if (error.errorCode !== bindings.INDEX_OUT_OF_BOUND) {
      throw error;
    }
  }
}

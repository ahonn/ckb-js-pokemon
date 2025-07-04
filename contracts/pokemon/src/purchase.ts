import * as bindings from '@ckb-js-std/bindings';
import { log, HighLevel, numFromBytes } from '@ckb-js-std/core';
import { loadPokemonData, loadPokePointTypeHash, loadIssuerLockHash, ensureOnlyOne } from './utils';

export function validatePurchaseTransaction(): number {
  log.debug('Validating purchase transaction');

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
    log.debug('Pokemon data has been modified during purchase');
    return 1;
  }

  // Validate PokePoint consumption is correct
  const requiredPoints = inputPokemonData.price;
  const inputPokePoints = calculateTotalPokePointsFromSource(bindings.SOURCE_INPUT);
  const outputPokePoints = calculateTotalPokePointsFromSource(bindings.SOURCE_OUTPUT);

  log.debug(
    `Required points: ${requiredPoints}, Input points: ${inputPokePoints}, Output points: ${outputPokePoints}`,
  );

  // Validate buyer has sufficient input points
  if (inputPokePoints < requiredPoints) {
    log.debug('Insufficient PokePoints for purchase');
    return 1;
  }

  // For purchase validation, we don't use this old logic anymore
  // The new validation below will check that the issuer receives the required payment

  // Validate PokePoint type script hash matches contract args
  if (!validatePokePointTypeScript()) {
    log.debug('Invalid PokePoint type script hash');
    return 1;
  }

  // Validate that the required PokePoints are sent to the issuer
  if (!validateIssuerPayment(requiredPoints)) {
    log.debug('Required PokePoints not sent to issuer');
    return 1;
  }

  log.debug('Purchase transaction validation successful');
  return 0;
}

/**
 * Calculate total PokePoints from a specific source (INPUT or OUTPUT)
 */
function calculateTotalPokePointsFromSource(source: bindings.SourceType): bigint {
  const expectedPokePointTypeHash = loadPokePointTypeHash();
  let totalPoints = 0n;
  let index = 0;

  while (true) {
    try {
      const actualTypeHash = HighLevel.loadCellTypeHash(index, source);
      if (actualTypeHash) {
        const actualTypeHashArray = new Uint8Array(actualTypeHash);

        // Check if this is a PokePoint cell
        if (areHashesEqual(expectedPokePointTypeHash, actualTypeHashArray)) {
          const pokePointData = bindings.loadCellData(index, source);
          if (pokePointData.byteLength === 16) {
            // PokePoint amount is uint128 (16 bytes)
            const points = numFromBytes(pokePointData);
            totalPoints += points;
            const sourceStr = source === bindings.SOURCE_INPUT ? 'input' : 'output';
            log.debug(`Found PokePoint ${sourceStr} at index ${index}: ${points} points`);
          }
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

  return totalPoints;
}

/**
 * Validate PokePoint type script hash
 */
function validatePokePointTypeScript(): boolean {
  const expectedPokePointTypeHash = loadPokePointTypeHash();
  let index = 0;

  while (true) {
    try {
      const actualTypeHash = HighLevel.loadCellTypeHash(index, bindings.SOURCE_INPUT);
      if (actualTypeHash) {
        const actualTypeHashArray = new Uint8Array(actualTypeHash);

        // Check if this is a PokePoint cell
        if (areHashesEqual(expectedPokePointTypeHash, actualTypeHashArray)) {
          return true; // Found at least one valid PokePoint cell
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

  return false; // No valid PokePoint cells found
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
 * Validate that the required PokePoints are sent to the issuer
 */
function validateIssuerPayment(requiredPoints: bigint): boolean {
  const expectedIssuerLockHash = loadIssuerLockHash();
  const expectedPokePointTypeHash = loadPokePointTypeHash();
  
  log.debug(`Expected issuer lock hash length: ${expectedIssuerLockHash.length}`);
  log.debug(`Required payment to issuer: ${requiredPoints} points`);
  
  let issuerPayment = 0n;
  let index = 0;

  // Check all outputs for PokePoint cells sent to the issuer
  while (true) {
    try {
      // Load output cell lock hash
      const actualLockHash = HighLevel.loadCellLockHash(index, bindings.SOURCE_OUTPUT);
      if (actualLockHash) {
        const actualLockHashArray = new Uint8Array(actualLockHash);
        
        // Check if this output is sent to the issuer
        if (areHashesEqual(expectedIssuerLockHash, actualLockHashArray)) {
          // Check if this is a PokePoint cell
          const actualTypeHash = HighLevel.loadCellTypeHash(index, bindings.SOURCE_OUTPUT);
          if (actualTypeHash) {
            const actualTypeHashArray = new Uint8Array(actualTypeHash);
            
            if (areHashesEqual(expectedPokePointTypeHash, actualTypeHashArray)) {
              // This is a PokePoint cell sent to the issuer
              const pokePointData = bindings.loadCellData(index, bindings.SOURCE_OUTPUT);
              if (pokePointData.byteLength === 16) {
                const points = numFromBytes(pokePointData);
                issuerPayment += points;
                log.debug(`Found issuer payment at output ${index}: ${points} points`);
              }
            }
          }
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

  log.debug(`Total issuer payment: ${issuerPayment}, required: ${requiredPoints}`);
  
  // Validate that the issuer receives exactly the required payment
  return issuerPayment >= requiredPoints;
}

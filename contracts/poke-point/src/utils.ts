import * as bindings from '@ckb-js-std/bindings';
import { numFromBytes, numToBytes, HighLevel } from '@ckb-js-std/core';

/**
 * Load PokePoint Cell's amount data (uint128)
 */
export function loadPokePointAmount(index: number, source: bindings.SourceType): bigint {
  const data = bindings.loadCellData(index, source);
  if (data.byteLength !== 16) {
    throw new Error(`Invalid PokePoint amount data length: expected 16, got ${data.byteLength}`);
  }
  return numFromBytes(data);
}

/**
 * Convert amount to uint128 byte array
 */
export function amountToBytes(amount: bigint): Uint8Array {
  return new Uint8Array(numToBytes(amount, 16));
}

/**
 * Parse CKB amount from ckbPerPoint byte array
 */
export function parseCkbPerPoint(ckbPerPointBytes: Uint8Array): bigint {
  // ckbPerPoint must be exactly 8 bytes (uint64)
  // CKB uses little-endian format for integer serialization
  if (ckbPerPointBytes.byteLength !== 8) {
    throw new Error(`Invalid ckbPerPoint length: expected 8, got ${ckbPerPointBytes.byteLength}`);
  }
  // Convert to ArrayBuffer for numFromBytes
  const buffer = ckbPerPointBytes.buffer.slice(ckbPerPointBytes.byteOffset, ckbPerPointBytes.byteOffset + ckbPerPointBytes.byteLength);
  return numFromBytes(buffer);
}

/**
 * Get ckbPerPoint from current script args (from byte 67 onwards)
 * Args structure: vmArgs(2) + codeHash(32) + hashType(1) + targetLockHash(32) + ckbPerPoint(8)
 */
export function loadCkbPerPoint(): bigint {
  const script = HighLevel.loadScript();
  const argsArray = new Uint8Array(script.args);

  if (argsArray.length < 75) { // 67 + 8 bytes
    throw new Error(`Script args too short: expected at least 75 bytes, got ${argsArray.length}`);
  }
  const ckbPerPointBytes = argsArray.slice(67, 75);
  return parseCkbPerPoint(ckbPerPointBytes);
}

/**
 * Check if this is a creation transaction (no cells of the same type in inputs)
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

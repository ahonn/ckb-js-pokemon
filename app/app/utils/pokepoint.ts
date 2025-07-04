import { ccc } from '@ckb-ccc/connector-react';
import {
  POKEPOINT_TYPE_ID,
  POKEPOINT_DEP_GROUP_TX_HASH,
  CKB_JS_VM_CODE_HASH,
  CKB_JS_VM_HASH_TYPE,
  CKB_JS_VM_TX_HASH,
  CKB_PER_POINT,
  MIN_POINTS_FOR_CELL,
} from '../config/contracts';

export interface PokePointTypeScriptConfig {
  targetLockHash: string;
  ckbPerPoint: bigint;
}

export function createPokePointTypeScript(config: PokePointTypeScriptConfig): ccc.ScriptLike {
  const { targetLockHash, ckbPerPoint } = config;

  // Construct script args: vmArgs + codeHash + hashType + targetLockHash + ckbPerPoint
  const vmArgs = '0000'; // 2 bytes
  const jsCodeHash = POKEPOINT_TYPE_ID.slice(2); // 32 bytes, remove 0x prefix (PokePoint contract code)
  const jsHashType = '01'; // 1 byte, "type" = 1
  const targetHash = targetLockHash.slice(2); // 32 bytes, remove 0x prefix
  const ckbPerPointBytes = bigIntToLittleEndianHex(ckbPerPoint, 8); // 8 bytes

  const args = ('0x' +
    vmArgs +
    jsCodeHash +
    jsHashType +
    targetHash +
    ckbPerPointBytes) as `0x${string}`;

  return {
    codeHash: CKB_JS_VM_CODE_HASH, // Use CKB-JS-VM as the executor
    hashType: CKB_JS_VM_HASH_TYPE, // CKB-JS-VM hash type
    args,
  };
}

export function pointsToHex(points: bigint): string {
  // Convert points to 16-byte (uint128) hex string in little endian
  return '0x' + bigIntToLittleEndianHex(points, 16);
}

export function bigIntToLittleEndianHex(value: bigint, byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  let val = value;

  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number(val & 0xffn);
    val = val >> 8n;
  }

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function calculatePointsFromCKB(ckbAmount: bigint): bigint {
  return ckbAmount / CKB_PER_POINT;
}

export function calculateRequiredCKB(points: bigint): bigint {
  // With exact capacity validation, cell capacity must exactly match points cost
  // Ensure minimum points to satisfy cell storage requirements
  const actualPoints = points < MIN_POINTS_FOR_CELL ? MIN_POINTS_FOR_CELL : points;
  return actualPoints * CKB_PER_POINT;
}

export function addPokePointCellDeps(tx: ccc.Transaction): void {
  // Add CKB-JS-VM cell dep
  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: CKB_JS_VM_TX_HASH,
      index: 0n,
    }),
    depType: 'code',
  }));

  // Add PokePoint contract cell dep
  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: POKEPOINT_DEP_GROUP_TX_HASH,
      index: 0n,
    }),
    depType: 'depGroup',
  }));
}

export function hexToPoints(hex: string): bigint {
  // Convert 16-byte (uint128) hex string in little endian to points
  // Cell data can be longer than 16 bytes, we only need the first 16 bytes
  if (!hex.startsWith('0x') || hex.length < 34) {
    return 0n;
  }

  const bytes = new Uint8Array(16);
  const hexStr = hex.slice(2);

  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }

  let result = 0n;
  for (let i = 15; i >= 0; i--) {
    result = (result << 8n) + BigInt(bytes[i]);
  }

  return result;
}

export async function fetchPokePointBalance(
  client: ccc.Client,
  lockScript: ccc.Script,
): Promise<bigint> {
  try {
    const lockHash = lockScript.hash();

    // Create the PokePoint type script for this user
    const typeScript = createPokePointTypeScript({
      targetLockHash: lockHash,
      ckbPerPoint: CKB_PER_POINT,
    });

    // Find cells with this type script and lock script using pagination
    let totalPoints = 0n;
    let after: string | undefined;

    // Iterate through all pages until no more data
    while (true) {
      const result = await client.findCellsPaged(
        {
          script: typeScript,
          scriptType: 'type',
          scriptSearchMode: 'exact',
          filter: {
            script: lockScript,
          },
        },
        'asc', // order
        '0x64', // limit: 100 cells per page
        after // after cursor
      );

      // Process cells in this page
      if (result.cells && Array.isArray(result.cells)) {
        for (const cell of result.cells) {
          if (cell.cellOutput.type && cell.outputData) {
            // Parse the points from the cell data (16-byte uint128 in little endian)
            const points = hexToPoints(cell.outputData);
            totalPoints += points;
          }
        }
      }

      // Check if there are more pages - if lastCursor is the same as current cursor, we're done
      if (!result.lastCursor || result.lastCursor === after) {
        break; // No more pages or same cursor (indicates no new data)
      }

      after = result.lastCursor;
    }

    return totalPoints;
  } catch {
    return 0n;
  }
}

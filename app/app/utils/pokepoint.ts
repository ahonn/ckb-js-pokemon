import { ccc, HashType } from '@ckb-ccc/connector-react';

// Constants from deployment information
export const POKEPOINT_TYPE_ID =
  '0xee71850b11443115045505c2b30499e1744482438c726c21b483a6e11c40b1d6';
export const POKEPOINT_TX_HASH =
  '0xa518abeb17383007390875d5bee1926f1ee8682fe2ef8e4f903b3f326e7ac672';
export const POKEPOINT_DEP_GROUP_TX_HASH =
  '0x7070e374417463427846ecff9d90f2399263163ff86b9c955745c138de4b3af4';

// CKB-JS-VM Constants (testnet deployment)
export const CKB_JS_VM_CODE_HASH =
  '0x3e9b6bead927bef62fcb56f0c79f4fbd1b739f32dd222beac10d346f2918bed7';
export const CKB_JS_VM_HASH_TYPE: HashType = 'type';
export const CKB_JS_VM_TX_HASH =
  '0x9f6558e91efa7580bfe97830d11cd94ca5d614bbf4a10b36f3a5b9d092749353';

// Contract configuration
export const CKB_PER_POINT = 1000000000n; // 10 CKB in Shannon
export const MIN_CELL_CAPACITY = 6100000000n; // 61 CKB minimum
export const POKEPOINT_CELL_MIN_CAPACITY = 20000000000n; // 200 CKB minimum for PokePoint cell

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
  // PokePoint cell needs more capacity to hold the type script and data
  const pointsCost = points * CKB_PER_POINT;
  return pointsCost > POKEPOINT_CELL_MIN_CAPACITY ? pointsCost : POKEPOINT_CELL_MIN_CAPACITY;
}

export function addPokePointCellDeps(tx: ccc.Transaction): void {
  // Add CKB-JS-VM cell dep
  tx.cellDeps.push({
    outPoint: {
      txHash: CKB_JS_VM_TX_HASH,
      index: 0n,
    },
    depType: 'code',
  });

  // Add PokePoint contract cell dep
  tx.cellDeps.push({
    outPoint: {
      txHash: POKEPOINT_DEP_GROUP_TX_HASH,
      index: 0n,
    },
    depType: 'depGroup',
  });
}

export function hexToPoints(hex: string): bigint {
  // Convert 16-byte (uint128) hex string in little endian to points
  if (!hex.startsWith('0x') || hex.length !== 34) {
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

    // Find cells with this type script and lock script
    const cells = client.findCells({
      script: typeScript,
      scriptType: 'type',
      scriptSearchMode: 'exact',
      filter: {
        script: lockScript,
      },
    });

    let totalPoints = 0n;

    for await (const cell of cells) {
      if (cell.cellOutput.type && cell.outputData) {
        // Parse the points from the cell data (16-byte uint128 in little endian)
        const points = hexToPoints(cell.outputData);
        totalPoints += points;
      }
    }

    return totalPoints;
  } catch (error) {
    console.error('Error fetching PokePoint balance:', error);
    return 0n;
  }
}

import { hexFrom, Transaction, hashTypeToBytes, numToBytes, Script } from '@ckb-ccc/core';
import { readFileSync } from 'fs';
import {
  Resource,
  Verifier,
  DEFAULT_SCRIPT_ALWAYS_SUCCESS,
  DEFAULT_SCRIPT_CKB_JS_VM,
} from 'ckb-testtool';

/**
 * Create PokePoint Type Script Args
 * @param jsCodeHash - JavaScript code cell's code_hash
 * @param jsHashType - JavaScript code cell's hash_type
 * @param targetLockHash - Target lock hash
 * @param ckbPerPoint - CKB amount required per point (in Shannon)
 */
function createPokePointArgs(
  jsCodeHash: string,
  jsHashType: number,
  targetLockHash: string,
  ckbPerPoint: bigint,
): string {
  const vmArgs = '0000';
  const codeHash = jsCodeHash.slice(2);
  const hashType = hexFrom(hashTypeToBytes(jsHashType)).slice(2);
  const targetHash = targetLockHash.slice(2);
  const ckbPerPointBytes = hexFrom(numToBytes(ckbPerPoint, 8)).slice(2);
  return '0x' + vmArgs + codeHash + hashType + targetHash + ckbPerPointBytes;
}

/**
 * Convert points amount to uint128 byte array
 */
function pointsToBytes(points: bigint): `0x${string}` {
  return hexFrom(numToBytes(points, 16));
}

describe('PokePoint Contract Tests', () => {
  let resource: Resource;
  let ckbJsVmScript: any;
  let alwaysSuccessScript: any;
  let pokePointJsScript: any;

  beforeEach(() => {
    resource = Resource.default();
  });

  // Helper function to deploy all required scripts
  function deployScripts(tx: Transaction) {
    ckbJsVmScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
    alwaysSuccessScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
      tx,
      false,
    );
    pokePointJsScript = resource.deployCell(hexFrom(readFileSync('./dist/index.bc')), tx, false);
  }

  function createPokePointTypeScript(ckbPerPoint: bigint) {
    const targetLockHash = alwaysSuccessScript.codeHash;
    return Script.from({
      codeHash: ckbJsVmScript.codeHash,
      hashType: ckbJsVmScript.hashType,
      args: createPokePointArgs(
        pokePointJsScript.codeHash,
        pokePointJsScript.hashType,
        targetLockHash,
        ckbPerPoint,
      ),
    });
  }

  function addInputCell(tx: Transaction, capacity: bigint) {
    const inputCell = resource.mockCell(alwaysSuccessScript, undefined, '0x', capacity);
    tx.inputs.push(Resource.createCellInput(inputCell));
    return capacity;
  }

  function addPokePointOutput(tx: Transaction, typeScript: any, capacity: bigint, points: bigint) {
    const pokePointCell = Resource.createCellOutput(alwaysSuccessScript, typeScript, capacity);
    tx.outputs.push(pokePointCell);
    tx.outputsData.push(pointsToBytes(points));
    return capacity;
  }

  function addChangeOutput(tx: Transaction, changeCapacity: bigint) {
    const changeCell = Resource.createCellOutput(alwaysSuccessScript, undefined, changeCapacity);
    tx.outputs.push(changeCell);
    tx.outputsData.push(hexFrom('0x'));
  }

  describe('Minting Transaction Tests', () => {
    test('should succeed with valid minting parameters', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      addInputCell(tx, 20000000000n);
      addPokePointOutput(tx, typeScript, 10000000000n, 10n);
      addChangeOutput(tx, 10000000000n);

      const verifier = Verifier.from(resource, tx);
      verifier.verifySuccess(true);
    });

    test('should fail with invalid amount (zero points)', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      addInputCell(tx, 20000000000n);
      addPokePointOutput(tx, typeScript, 10000000000n, 0n); // 0 points should fail
      addChangeOutput(tx, 10000000000n);

      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });

    test('should fail with insufficient capacity for points', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      addInputCell(tx, 20000000000n);
      addPokePointOutput(tx, typeScript, 5000000000n, 100n); // Only 50 CKB for 100 points (need 1000 CKB)
      addChangeOutput(tx, 15000000000n);

      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });

    test('should fail with multiple PokePoint outputs', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      // Add input with enough capacity for two outputs
      addInputCell(tx, 30000000000n);

      // Create TWO PokePoint output cells (should fail - only one allowed)
      const pokePointCapacity = 10000000000n;
      const points = 10n;

      addPokePointOutput(tx, typeScript, pokePointCapacity, points);
      addPokePointOutput(tx, typeScript, pokePointCapacity, points); // Second output causes failure

      // Change output
      addChangeOutput(tx, 30000000000n - pokePointCapacity * 2n);

      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });

    test('should fail with invalid cell data format', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      addInputCell(tx, 20000000000n);

      // Create PokePoint output with invalid data format
      const pokePointCapacity = 10000000000n;
      const pokePointCell = Resource.createCellOutput(
        alwaysSuccessScript,
        typeScript,
        pokePointCapacity,
      );
      tx.outputs.push(pokePointCell);

      // Invalid cell data: only 8 bytes instead of 16 (uint128)
      tx.outputsData.push(hexFrom('0x0a00000000000000')); // 8 bytes instead of 16

      addChangeOutput(tx, 20000000000n - pokePointCapacity);

      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });

    test('should fail when not a creation transaction (has inputs)', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(1000000000n);

      // Create an existing PokePoint cell as input (simulating transfer, not mint)
      const existingPokePointCell = resource.mockCell(
        alwaysSuccessScript,
        typeScript,
        pointsToBytes(5n),
        5000000000n, // 50 CKB
      );
      tx.inputs.push(Resource.createCellInput(existingPokePointCell));

      addInputCell(tx, 15000000000n);

      // Create PokePoint output (this should fail because it's not a creation - has PokePoint input)
      addPokePointOutput(tx, typeScript, 10000000000n, 10n);

      addChangeOutput(tx, 15000000000n + 5000000000n - 10000000000n);

      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });

    test('should fail with capacity exactly matching points but below minimum cell capacity', async () => {
      const tx = Transaction.default();
      deployScripts(tx);
      const typeScript = createPokePointTypeScript(100000000n); // 1 CKB per point

      addInputCell(tx, 20000000000n);
      addPokePointOutput(tx, typeScript, 5000000000n, 50n); // 50 CKB for 50 points (below minimum)
      addChangeOutput(tx, 15000000000n);

      // Verify transaction should fail (below minimum cell capacity)
      const verifier = Verifier.from(resource, tx);
      expect(() => verifier.verifySuccess(true)).toThrow();
    });
  });
});

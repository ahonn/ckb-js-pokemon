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
export function createPokePointArgs(
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
export function pointsToBytes(points: bigint): `0x${string}` {
  return hexFrom(numToBytes(points, 16));
}

/**
 * Test setup helper
 */
export interface TestContext {
  resource: Resource;
  ckbJsVmScript: any;
  alwaysSuccessScript: any;
  pokePointJsScript: any;
}

export function setupTestContext(): TestContext {
  const resource = Resource.default();
  return {
    resource,
    ckbJsVmScript: null,
    alwaysSuccessScript: null,
    pokePointJsScript: null,
  };
}

/**
 * Deploy all required scripts
 */
export function deployScripts(tx: Transaction, context: TestContext) {
  context.ckbJsVmScript = context.resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
  context.alwaysSuccessScript = context.resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)), tx, false);
  context.pokePointJsScript = context.resource.deployCell(hexFrom(readFileSync('./dist/index.bc')), tx, false);
}

/**
 * Create PokePoint Type Script
 */
export function createPokePointTypeScript(ckbPerPoint: bigint, context: TestContext): Script {
  const targetLockHash = context.alwaysSuccessScript.codeHash;
  return Script.from({
    codeHash: context.ckbJsVmScript.codeHash,
    hashType: context.ckbJsVmScript.hashType,
    args: createPokePointArgs(
      context.pokePointJsScript.codeHash,
      context.pokePointJsScript.hashType,
      targetLockHash,
      ckbPerPoint,
    ),
  });
}

/**
 * Add regular CKB input cell
 */
export function addInputCell(tx: Transaction, capacity: bigint, context: TestContext): bigint {
  const inputCell = context.resource.mockCell(context.alwaysSuccessScript, undefined, '0x', capacity);
  tx.inputs.push(Resource.createCellInput(inputCell));
  return capacity;
}

/**
 * Add PokePoint output cell
 */
export function addPokePointOutput(
  tx: Transaction,
  typeScript: Script,
  capacity: bigint,
  points: bigint,
  context: TestContext,
): bigint {
  const pokePointCell = Resource.createCellOutput(context.alwaysSuccessScript, typeScript, capacity);
  tx.outputs.push(pokePointCell);
  tx.outputsData.push(pointsToBytes(points));
  return capacity;
}

/**
 * Add change output cell
 */
export function addChangeOutput(tx: Transaction, changeCapacity: bigint, context: TestContext) {
  const changeCell = Resource.createCellOutput(context.alwaysSuccessScript, undefined, changeCapacity);
  tx.outputs.push(changeCell);
  tx.outputsData.push(hexFrom('0x'));
}
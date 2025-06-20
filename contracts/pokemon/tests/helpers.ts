import { hexFrom, Transaction, hashTypeToBytes, numToBytes, Script } from '@ckb-ccc/core';
import { readFileSync } from 'fs';
import { Resource, DEFAULT_SCRIPT_ALWAYS_SUCCESS, DEFAULT_SCRIPT_CKB_JS_VM } from 'ckb-testtool';

/**
 * Create Pokemon Type Script Args
 * Args structure: vmArgs(2) + codeHash(32) + hashType(1) + issuerLockHash(32) + pokePointTypeHash(32)
 */
export function createPokemonArgs(
  jsCodeHash: string,
  jsHashType: number,
  issuerLockHash: string,
  pokePointTypeHash: string,
): string {
  const vmArgs = '0000';
  const codeHash = jsCodeHash.slice(2);
  const hashType = hexFrom(hashTypeToBytes(jsHashType)).slice(2);
  const issuerHash = issuerLockHash.slice(2);
  const pokePointHash = pokePointTypeHash.slice(2);
  return '0x' + vmArgs + codeHash + hashType + issuerHash + pokePointHash;
}

/**
 * Convert Pokemon data (price + pointAmount) to bytes
 */
export function pokemonDataToBytes(price: number, pointAmount: bigint): `0x${string}` {
  // price as uint16 (2 bytes) + pointAmount as uint128 (16 bytes)
  const priceBytes = numToBytes(BigInt(price), 2);
  const pointAmountBytes = numToBytes(pointAmount, 16);

  // Combine: price + pointAmount
  const combined = new Uint8Array(18);
  combined.set(new Uint8Array(priceBytes), 0);
  combined.set(new Uint8Array(pointAmountBytes), 2);

  return hexFrom(combined);
}

/**
 * Test setup helper
 */
export interface TestContext {
  resource: Resource;
  ckbJsVmScript: any;
  alwaysSuccessScript: any;
  pokemonJsScript: any;
  pokePointJsScript: any;
}

export function setupTestContext(): TestContext {
  const resource = Resource.default();
  return {
    resource,
    ckbJsVmScript: null,
    alwaysSuccessScript: null,
    pokemonJsScript: null,
    pokePointJsScript: null,
  };
}

/**
 * Deploy all required scripts
 */
export function deployScripts(tx: Transaction, context: TestContext) {
  context.ckbJsVmScript = context.resource.deployCell(
    hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)),
    tx,
    false,
  );
  context.alwaysSuccessScript = context.resource.deployCell(
    hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
    tx,
    false,
  );
  context.pokemonJsScript = context.resource.deployCell(
    hexFrom(readFileSync('./dist/index.bc')),
    tx,
    false,
  );
  // Deploy the real PokePoint contract
  context.pokePointJsScript = context.resource.deployCell(
    hexFrom(readFileSync('../poke-point/dist/index.bc')),
    tx,
    false,
  );
}

/**
 * Create Pokemon Type Script
 */
export function createPokemonTypeScript(
  issuerLockHash: string,
  pokePointTypeHash: string,
  context: TestContext,
): Script {
  return Script.from({
    codeHash: context.ckbJsVmScript.codeHash,
    hashType: context.ckbJsVmScript.hashType,
    args: createPokemonArgs(
      context.pokemonJsScript.codeHash,
      context.pokemonJsScript.hashType,
      issuerLockHash,
      pokePointTypeHash,
    ),
  });
}

/**
 * Add regular CKB input cell
 */
export function addInputCell(tx: Transaction, capacity: bigint, context: TestContext): bigint {
  const inputCell = context.resource.mockCell(
    context.alwaysSuccessScript,
    undefined,
    '0x',
    capacity,
  );
  tx.inputs.push(Resource.createCellInput(inputCell));
  return capacity;
}

/**
 * Add Pokemon output cell
 */
export function addPokemonOutput(
  tx: Transaction,
  typeScript: Script,
  capacity: bigint,
  price: number,
  pointAmount: bigint,
  context: TestContext,
): bigint {
  const pokemonCell = Resource.createCellOutput(context.alwaysSuccessScript, typeScript, capacity);
  tx.outputs.push(pokemonCell);
  tx.outputsData.push(pokemonDataToBytes(price, pointAmount));
  return capacity;
}

/**
 * Add change output cell
 */
export function addChangeOutput(tx: Transaction, changeCapacity: bigint, context: TestContext) {
  const changeCell = Resource.createCellOutput(
    context.alwaysSuccessScript,
    undefined,
    changeCapacity,
  );
  tx.outputs.push(changeCell);
  tx.outputsData.push(hexFrom('0x'));
}

/**
 * Create real PokePoint Type Script Args
 * Args structure from poke-point: vmArgs(2) + codeHash(32) + hashType(1) + targetLockHash(32) + ckbPerPoint(8)
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
 * Create real PokePoint Type Script using the deployed poke-point contract
 */
export function createRealPokePointTypeScript(context: TestContext): Script {
  const targetLockHash = context.alwaysSuccessScript.hash(); // Use script hash, not code hash
  const ckbPerPoint = 1000000000n; // 10 CKB per point

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

import { hexFrom, Transaction, Script } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokemonTypeScript,
  addInputCell,
  addChangeOutput,
  pokemonDataToBytes,
  TestContext,
} from './helpers';

describe('Pokemon Transfer Transaction Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed when transferring Pokemon with valid data', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonPrice = 100n;
    const pokemonPointAmount = 50n;

    // Add input Pokemon cell (owned by original owner)
    const originalOwnerPokemonCell = context.resource.mockCell(
      createOwnerLockScript(context, '0x01'), // Original owner
      typeScript,
      pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(originalOwnerPokemonCell));

    addInputCell(tx, 5000000000n, context);

    // Add output Pokemon cell (owned by new owner)
    const newOwnerPokemonCell = Resource.createCellOutput(
      createOwnerLockScript(context, '0x02'), // New owner
      typeScript,
      10000000000n,
    );
    tx.outputs.push(newOwnerPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount));

    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when trying to modify Pokemon data during transfer', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonPrice = 100n;
    const pokemonPointAmount = 50n;

    const originalOwnerPokemonCell = context.resource.mockCell(
      createOwnerLockScript(context, '0x01'),
      typeScript,
      pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(originalOwnerPokemonCell));

    addInputCell(tx, 5000000000n, context);

    const newOwnerPokemonCell = Resource.createCellOutput(
      createOwnerLockScript(context, '0x02'),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(newOwnerPokemonCell);
    // Modify Pokemon data during transfer (change price from 100 to 200)
    tx.outputsData.push(pokemonDataToBytes(200, pokemonPointAmount));

    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when trying to modify Pokemon pointAmount during transfer', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonPrice = 100n;
    const pokemonPointAmount = 50n;

    const originalOwnerPokemonCell = context.resource.mockCell(
      createOwnerLockScript(context, '0x01'),
      typeScript,
      pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(originalOwnerPokemonCell));

    addInputCell(tx, 5000000000n, context);

    const newOwnerPokemonCell = Resource.createCellOutput(
      createOwnerLockScript(context, '0x02'),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(newOwnerPokemonCell);
    // Modify Pokemon data during transfer (change pointAmount from 50 to 100)
    tx.outputsData.push(pokemonDataToBytes(Number(pokemonPrice), 100n));

    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with invalid data format during transfer', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonPrice = 100n;
    const pokemonPointAmount = 50n;

    const originalOwnerPokemonCell = context.resource.mockCell(
      createOwnerLockScript(context, '0x01'),
      typeScript,
      pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(originalOwnerPokemonCell));

    addInputCell(tx, 5000000000n, context);

    const newOwnerPokemonCell = Resource.createCellOutput(
      createOwnerLockScript(context, '0x02'),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(newOwnerPokemonCell);
    // Invalid data format (only 8 bytes instead of 18)
    tx.outputsData.push(hexFrom('0x0123456789abcdef'));

    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when transferring to same owner (no-op transfer)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonPrice = 100n;
    const pokemonPointAmount = 50n;

    const ownerLockScript = createOwnerLockScript(context, '0x01');

    // Input and output have the same owner (no-op transfer)
    const inputPokemonCell = context.resource.mockCell(
      ownerLockScript,
      typeScript,
      pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(inputPokemonCell));

    addInputCell(tx, 5000000000n, context);

    const outputPokemonCell = Resource.createCellOutput(
      ownerLockScript, // Same owner
      typeScript,
      10000000000n,
    );
    tx.outputs.push(outputPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(Number(pokemonPrice), pokemonPointAmount));

    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});

function createOwnerLockScript(context: TestContext, ownerArgs: string): Script {
  return Script.from({
    codeHash: context.alwaysSuccessScript.codeHash,
    hashType: context.alwaysSuccessScript.hashType,
    args: ownerArgs,
  });
}
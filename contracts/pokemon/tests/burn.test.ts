import { hexFrom, Transaction } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokemonTypeScript,
  addPokemonInput,
  addChangeOutput,
  TestContext,
} from './helpers';

describe('Pokemon Burn Transaction Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed when owner burns a single Pokemon NFT', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script
    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add Pokemon input to burn (Pikachu #25)
    const pokemonId = 25n;
    const price = 1000;
    addPokemonInput(tx, typeScript, 10000000000n, pokemonId, price, context);

    // Add regular cell output (Pokemon becomes regular cell = burned)
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed when owner burns multiple Pokemon NFTs', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add multiple Pokemon inputs to burn
    addPokemonInput(tx, typeScript, 10000000000n, 1n, 1500, context); // Bulbasaur
    addPokemonInput(tx, typeScript, 10000000000n, 4n, 1500, context); // Charmander
    addPokemonInput(tx, typeScript, 10000000000n, 7n, 1500, context); // Squirtle

    // No outputs = pure burn transaction

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when trying to burn Pokemon with invalid data format', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Create Pokemon input with invalid data (only 8 bytes instead of 18)
    const pokemonCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      hexFrom('0x0123456789abcdef'), // Only 8 bytes, should be 18
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(pokemonCell));
    tx.witnesses.push('0x');

    // No outputs for burn transaction

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when trying to burn Pokemon with zero ID', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add Pokemon input with zero ID (should fail)
    addPokemonInput(tx, typeScript, 10000000000n, 0n, 1000, context);

    // No outputs for burn transaction

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when no Pokemon inputs are provided for burning', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Add only regular input (no Pokemon inputs)
    const regularCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      undefined, // No type script
      '0x',
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(regularCell));
    tx.witnesses.push('0x');

    // No outputs for burn transaction

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});
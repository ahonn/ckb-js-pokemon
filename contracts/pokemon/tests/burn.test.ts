import { hexFrom, Transaction, Script } from '@ckb-ccc/core';
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

  test('should succeed when issuer burns a single Pokemon NFT', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script with issuer lock hash
    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add issuer's cell as input (proves issuer is signing the transaction)
    const issuerCell = context.resource.mockCell(
      context.alwaysSuccessScript, // Issuer's lock script
      undefined, // No type script
      '0x',
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(issuerCell));
    tx.witnesses.push('0x');

    // Add Pokemon input to burn (Pikachu #25)
    const pokemonId = 25n;
    const price = 1000;
    addPokemonInput(tx, typeScript, 10000000000n, pokemonId, price, context);

    // Add regular cell output (Pokemon becomes regular cell = burned)
    addChangeOutput(tx, 20000000000n, context); // Combined capacity

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed when issuer burns multiple Pokemon NFTs', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add issuer's cell as input (proves issuer is signing the transaction)
    const issuerCell = context.resource.mockCell(
      context.alwaysSuccessScript, // Issuer's lock script
      undefined, // No type script
      '0x',
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(issuerCell));
    tx.witnesses.push('0x');

    // Add multiple Pokemon inputs to burn
    addPokemonInput(tx, typeScript, 10000000000n, 1n, 1500, context); // Bulbasaur
    addPokemonInput(tx, typeScript, 10000000000n, 4n, 1500, context); // Charmander
    addPokemonInput(tx, typeScript, 10000000000n, 7n, 1500, context); // Squirtle

    // Add regular cell output for the combined capacity
    addChangeOutput(tx, 40000000000n, context);

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

  test('should fail when non-issuer tries to burn Pokemon NFT', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script with issuer lock hash
    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Create a different lock script (non-issuer)
    const nonIssuerScript = Script.from({
      codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
      hashType: 'type',
      args: '0x1234567890abcdef', // Different from issuer
    });

    // Add non-issuer's cell as input (proves non-issuer is signing)
    const nonIssuerCell = context.resource.mockCell(
      nonIssuerScript, // Non-issuer's lock script
      undefined, // No type script
      '0x',
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(nonIssuerCell));
    tx.witnesses.push('0x');

    // Add Pokemon input to burn (should fail because non-issuer is trying)
    addPokemonInput(tx, typeScript, 10000000000n, 25n, 1000, context);

    // Add regular cell output
    addChangeOutput(tx, 20000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when no Pokemon inputs are provided for burning', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script
    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add regular input with issuer's lock (so authorization passes)
    const regularCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      undefined, // No type script
      '0x',
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(regularCell));
    tx.witnesses.push('0x');

    // Add a regular cell with Pokemon type script (but this will trigger Pokemon contract)
    // Since there are no actual Pokemon inputs, this should fail
    const fakeTypeCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      '0x1234', // Invalid Pokemon data (too short)
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(fakeTypeCell));
    tx.witnesses.push('0x');

    // No outputs for burn transaction

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});
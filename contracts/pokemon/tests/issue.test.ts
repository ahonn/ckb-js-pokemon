import { hexFrom, Transaction } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokemonTypeScript,
  addInputCell,
  addPokemonOutput,
  addChangeOutput,
  TestContext,
} from './helpers';

describe('Pokemon Issue Transaction Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed when issuer creates Pokemon with valid data', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script with issuer lock hash
    // Use the correct lock script hash for the always success script
    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add input with sufficient capacity
    addInputCell(tx, 20000000000n, context);

    // Create Pokemon output with pokemonId=25 (Pikachu), price=1000
    const pokemonId = 25n; // uint128 - Pikachu's ID
    const price = 1000; // uint16
    addPokemonOutput(tx, typeScript, 10000000000n, pokemonId, price, context);

    // Add change output
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when non-issuer tries to create Pokemon', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    // Create Pokemon type script with DIFFERENT issuer lock hash (not matching actual input)
    const differentIssuerLockHash =
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(differentIssuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 20000000000n, context);
    addPokemonOutput(tx, typeScript, 10000000000n, 6n, 1000, context); // Charizard
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with invalid data format (wrong length)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 20000000000n, context);

    // Create Pokemon output with invalid data (only 8 bytes instead of 18)
    const pokemonCell = Resource.createCellOutput(
      context.alwaysSuccessScript,
      typeScript,
      10000000000n,
    );
    tx.outputs.push(pokemonCell);
    tx.outputsData.push(hexFrom('0x0123456789abcdef')); // Only 8 bytes, should be 18

    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with zero price', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 20000000000n, context);

    // Create Pokemon with price=0 (should fail)
    addPokemonOutput(tx, typeScript, 10000000000n, 1n, 0, context); // Bulbasaur with 0 price
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with zero pokemon ID', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 20000000000n, context);

    // Create Pokemon with pokemonId=0 (should fail)
    addPokemonOutput(tx, typeScript, 10000000000n, 0n, 1000, context); // Invalid Pokemon ID
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should succeed when issuer creates multiple Pokemon with valid data (batch issuance)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    // Add input with sufficient capacity for multiple Pokemon
    addInputCell(tx, 50000000000n, context);

    // Create multiple Pokemon outputs
    addPokemonOutput(tx, typeScript, 10000000000n, 1n, 1500, context); // Bulbasaur
    addPokemonOutput(tx, typeScript, 10000000000n, 4n, 1500, context); // Charmander  
    addPokemonOutput(tx, typeScript, 10000000000n, 7n, 1500, context); // Squirtle

    // Add change output
    addChangeOutput(tx, 20000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when issuer creates multiple Pokemon with duplicate IDs', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 40000000000n, context);

    // Create Pokemon outputs with duplicate IDs (should fail)
    addPokemonOutput(tx, typeScript, 10000000000n, 25n, 1000, context); // Pikachu
    addPokemonOutput(tx, typeScript, 10000000000n, 25n, 1500, context); // Duplicate Pikachu

    addChangeOutput(tx, 20000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});

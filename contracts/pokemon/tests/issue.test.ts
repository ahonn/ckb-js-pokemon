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

    // Create Pokemon output with price=1000, point_amount=50
    const price = 1000; // uint16
    const pointAmount = 50n; // uint128
    addPokemonOutput(tx, typeScript, 10000000000n, price, pointAmount, context);

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
    addPokemonOutput(tx, typeScript, 10000000000n, 1000, 50n, context);
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
    addPokemonOutput(tx, typeScript, 10000000000n, 0, 50n, context);
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with zero point amount', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();
    const pokePointTypeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    addInputCell(tx, 20000000000n, context);

    // Create Pokemon with point_amount=0 (should fail)
    addPokemonOutput(tx, typeScript, 10000000000n, 1000, 0n, context);
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});

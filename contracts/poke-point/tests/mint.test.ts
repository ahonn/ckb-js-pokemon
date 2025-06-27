import { hexFrom, Transaction } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokePointTypeScript,
  addInputCell,
  addPokePointOutput,
  addChangeOutput,
  pointsToBytes,
  TestContext,
} from './helpers';

describe('Minting Transaction Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed with valid minting parameters', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    addInputCell(tx, 20000000000n, context);
    addPokePointOutput(tx, typeScript, 10000000000n, 10n, context);
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail with invalid amount (zero points)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    addInputCell(tx, 20000000000n, context);
    addPokePointOutput(tx, typeScript, 10000000000n, 0n, context); // 0 points should fail
    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with insufficient capacity for points', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    addInputCell(tx, 20000000000n, context);
    addPokePointOutput(tx, typeScript, 5000000000n, 100n, context); // Only 50 CKB for 100 points (need 1000 CKB)
    addChangeOutput(tx, 15000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with multiple PokePoint outputs', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    // Add input with enough capacity for two outputs
    addInputCell(tx, 30000000000n, context);

    // Create TWO PokePoint output cells (should fail - only one allowed)
    const pokePointCapacity = 10000000000n;
    const points = 10n;

    addPokePointOutput(tx, typeScript, pokePointCapacity, points, context);
    addPokePointOutput(tx, typeScript, pokePointCapacity, points, context); // Second output causes failure

    // Change output
    addChangeOutput(tx, 30000000000n - pokePointCapacity * 2n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with invalid cell data format', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    addInputCell(tx, 20000000000n, context);

    // Create PokePoint output with invalid data format
    const pokePointCapacity = 10000000000n;
    const pokePointCell = Resource.createCellOutput(
      context.alwaysSuccessScript,
      typeScript,
      pokePointCapacity,
    );
    tx.outputs.push(pokePointCell);

    // Invalid cell data: only 8 bytes instead of 16 (uint128)
    tx.outputsData.push(hexFrom('0x0a00000000000000')); // 8 bytes instead of 16

    addChangeOutput(tx, 20000000000n - pokePointCapacity, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should succeed with multiple input cells (cell aggregation)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Add multiple input cells to simulate cell aggregation
    addInputCell(tx, 5000000000n, context); // 50 CKB
    addInputCell(tx, 3000000000n, context); // 30 CKB
    addInputCell(tx, 7000000000n, context); // 70 CKB
    // Total input: 150 CKB

    // Create PokePoint output with 10 points (needs 100 CKB)
    addPokePointOutput(tx, typeScript, 10000000000n, 10n, context); // 100 CKB for 10 points

    // Change output: 150 - 100 = 50 CKB
    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed with many small input cells', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Add many small input cells (simulating fragmented CKB)
    for (let i = 0; i < 8; i++) {
      addInputCell(tx, 2500000000n, context); // 25 CKB each
    }
    // Total input: 8 × 25 = 200 CKB

    // Create PokePoint output with 15 points (needs 150 CKB)
    addPokePointOutput(tx, typeScript, 15000000000n, 15n, context); // 150 CKB for 15 points

    // Change output: 200 - 150 = 50 CKB
    addChangeOutput(tx, 5000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when not a creation transaction (has inputs)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context);

    // Create an existing PokePoint cell as input (simulating transfer, not mint)
    const existingPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(5n),
      5000000000n, // 50 CKB
    );
    tx.inputs.push(Resource.createCellInput(existingPokePointCell));

    addInputCell(tx, 15000000000n, context);

    // Create PokePoint output (this should fail because it's not a creation - has PokePoint input)
    addPokePointOutput(tx, typeScript, 10000000000n, 10n, context);

    addChangeOutput(tx, 15000000000n + 5000000000n - 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail with mismatched capacity (195 CKB for 20 points)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    addInputCell(tx, 25000000000n, context);
    
    // 195 CKB capacity with 20 points should fail (need exactly 200 CKB for 20 points)
    addPokePointOutput(tx, typeScript, 19500000000n, 20n, context); // 195 CKB capacity, 20 points
    addChangeOutput(tx, 5500000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should succeed with exact capacity match (190 CKB for 19 points)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    addInputCell(tx, 25000000000n, context);
    
    // 190 CKB capacity with exactly 19 points should succeed
    addPokePointOutput(tx, typeScript, 19000000000n, 19n, context); // 190 CKB capacity, 19 points
    addChangeOutput(tx, 6000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail with excess capacity (195 CKB for 19 points)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    addInputCell(tx, 25000000000n, context);
    
    // 195 CKB capacity with 19 points should fail (need exactly 190 CKB for 19 points)
    addPokePointOutput(tx, typeScript, 19500000000n, 19n, context); // 195 CKB capacity, 19 points
    addChangeOutput(tx, 5500000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});

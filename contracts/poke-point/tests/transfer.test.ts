import { Transaction } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokePointTypeScript,
  addPokePointOutput,
  pointsToBytes,
  TestContext,
} from './helpers';

describe('Transfer Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed with simple transfer (1 input -> 1 output)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (10 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(10n),
      10000000000n, // 100 CKB (10 points × 10 CKB per point)
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output (10 points - same amount)
    addPokePointOutput(tx, typeScript, 10000000000n, 10n, context); // 100 CKB for 10 points

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed with split transfer (1 input -> 3 outputs)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (15 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(15n),
      15000000000n, // 150 CKB (15 points × 10 CKB per point)
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create 3 PokePoint outputs (5 + 3 + 7 = 15 points total)
    addPokePointOutput(tx, typeScript, 5000000000n, 5n, context);   // 50 CKB for 5 points
    addPokePointOutput(tx, typeScript, 3000000000n, 3n, context);   // 30 CKB for 3 points  
    addPokePointOutput(tx, typeScript, 7000000000n, 7n, context);   // 70 CKB for 7 points

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed with merge transfer (3 inputs -> 1 output)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create 3 existing PokePoint cells as inputs (4 + 6 + 2 = 12 points total)
    const inputCell1 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(4n),
      4000000000n, // 40 CKB (4 points × 10 CKB per point)
    );
    const inputCell2 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(6n),
      6000000000n, // 60 CKB (6 points × 10 CKB per point)
    );
    const inputCell3 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(2n),
      2000000000n, // 20 CKB (2 points × 10 CKB per point)
    );
    
    tx.inputs.push(Resource.createCellInput(inputCell1));
    tx.inputs.push(Resource.createCellInput(inputCell2));
    tx.inputs.push(Resource.createCellInput(inputCell3));

    // Create single PokePoint output (12 points total)
    addPokePointOutput(tx, typeScript, 12000000000n, 12n, context); // 120 CKB for 12 points

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed with complex multi-to-multi transfer (3 inputs -> 2 outputs)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create 3 existing PokePoint cells as inputs (5 + 8 + 7 = 20 points total)
    const inputCell1 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(5n),
      5000000000n, // 50 CKB (5 points × 10 CKB per point)
    );
    const inputCell2 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(8n),
      8000000000n, // 80 CKB (8 points × 10 CKB per point)
    );
    const inputCell3 = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(7n),
      7000000000n, // 70 CKB (7 points × 10 CKB per point)
    );
    
    tx.inputs.push(Resource.createCellInput(inputCell1));
    tx.inputs.push(Resource.createCellInput(inputCell2));
    tx.inputs.push(Resource.createCellInput(inputCell3));

    // Create 2 PokePoint outputs (13 + 7 = 20 points total)
    addPokePointOutput(tx, typeScript, 13000000000n, 13n, context); // 130 CKB for 13 points
    addPokePointOutput(tx, typeScript, 7000000000n, 7n, context);   // 70 CKB for 7 points

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when input/output amounts do not match', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (10 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(10n),
      10000000000n, // 100 CKB
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output with different amount (8 points) - should fail
    addPokePointOutput(tx, typeScript, 8000000000n, 8n, context); // 80 CKB for 8 points

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when output has zero amount', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (5 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(5n),
      5000000000n, // 50 CKB
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output with zero amount - should fail
    addPokePointOutput(tx, typeScript, 1000000000n, 0n, context); // 10 CKB for 0 points

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when output has insufficient capacity', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (10 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(10n),
      10000000000n, // 100 CKB
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output with insufficient capacity (10 points need 100 CKB but only have 50)
    addPokePointOutput(tx, typeScript, 5000000000n, 10n, context); // 50 CKB for 10 points - insufficient

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should fail when output has too many points for capacity (over-allocation)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (19 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(19n),
      19000000000n, // 190 CKB
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output with 195 CKB capacity but 20 points (max should be 19)
    addPokePointOutput(tx, typeScript, 19500000000n, 20n, context); // 195 CKB for 20 points - over-allocation

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should succeed with maximum allowed points for capacity in transfer', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (19 points)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(19n),
      19000000000n, // 190 CKB
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Create PokePoint output with 195 CKB capacity and exactly 19 points (max allowed)
    addPokePointOutput(tx, typeScript, 19500000000n, 19n, context); // 195 CKB for 19 points - exactly at limit

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });
});
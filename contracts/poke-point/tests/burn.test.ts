import { Transaction } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokePointTypeScript,
  addInputCell,
  addChangeOutput,
  pointsToBytes,
  TestContext,
} from './helpers';

describe('Burn Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed with simple burn (1 input -> 0 outputs)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create existing PokePoint cell as input (5 points to burn)
    const inputPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pointsToBytes(5n),
      5000000000n, // 50 CKB (5 points × 10 CKB per point)
    );
    tx.inputs.push(Resource.createCellInput(inputPokePointCell));

    // Add a regular CKB input cell (needed for fees)
    addInputCell(tx, 10000000000n, context); // 100 CKB

    // Add change output to return the burned CKB value plus remaining
    addChangeOutput(tx, 15000000000n, context); // 150 CKB total (50 from burned + 100 input)

    // No PokePoint outputs - this makes it a burn transaction

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed with multiple burn (3 inputs -> 0 outputs)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);
    const typeScript = createPokePointTypeScript(1000000000n, context); // 10 CKB per point

    // Create 3 existing PokePoint cells as inputs to burn (4 + 6 + 2 = 12 points total)
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

    // Add a regular CKB input cell (needed for fees)
    addInputCell(tx, 5000000000n, context); // 50 CKB

    // Add change output to return the burned CKB value plus remaining
    // Total: 40 + 60 + 20 + 50 = 170 CKB
    addChangeOutput(tx, 17000000000n, context); // 170 CKB total

    // No PokePoint outputs - this makes it a burn transaction

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });
});
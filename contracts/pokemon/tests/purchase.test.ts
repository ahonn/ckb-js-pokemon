import { hexFrom, Transaction, Script } from '@ckb-ccc/core';
import { Resource, Verifier } from 'ckb-testtool';
import {
  setupTestContext,
  deployScripts,
  createPokemonTypeScript,
  addInputCell,
  addChangeOutput,
  pokemonDataToBytes,
  createRealPokePointTypeScript,
  TestContext,
} from './helpers';

describe('Pokemon Purchase Transaction Tests', () => {
  let context: TestContext;

  beforeEach(() => {
    context = setupTestContext();
  });

  test('should succeed when buyer has exact PokePoints needed', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();

    // Create a real PokePoint type script using the deployed poke-point contract
    const buyerPokePointTypeScript = createRealPokePointTypeScript(context);
    const pokePointTypeHash = buyerPokePointTypeScript.hash();

    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonId = 25n; // Pikachu
    const pokemonPrice = 100;

    const existingPokemonCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pokemonDataToBytes(pokemonId, pokemonPrice),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(existingPokemonCell));

    // Use exactly the required amount of PokePoints (no change)
    const buyerPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      buyerPokePointTypeScript,
      pointsToBytes(100n), // Exactly the price, no remainder
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(buyerPokePointCell));

    addInputCell(tx, 5000000000n, context);

    const buyerPokemonCell = Resource.createCellOutput(
      createBuyerLockScript(context),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(buyerPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(pokemonId, pokemonPrice));

    // No PokePoint output - all points are burned for the purchase
    addChangeOutput(tx, 15000000000n, context); // Increased change to account for no PokePoint output

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should succeed when buyer has more PokePoints than needed (overpayment allowed)', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();

    // Create a real PokePoint type script using the deployed poke-point contract
    const buyerPokePointTypeScript = createRealPokePointTypeScript(context);
    const pokePointTypeHash = buyerPokePointTypeScript.hash();

    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonId = 150n; // Mewtwo
    const pokemonPrice = 100;

    const existingPokemonCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pokemonDataToBytes(pokemonId, pokemonPrice),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(existingPokemonCell));

    // Use more than the required amount of PokePoints (all burned, overpayment)
    const buyerPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      buyerPokePointTypeScript,
      pointsToBytes(150n), // More than needed, but all burned
      15000000000n,
    );
    tx.inputs.push(Resource.createCellInput(buyerPokePointCell));

    addInputCell(tx, 5000000000n, context);

    const buyerPokemonCell = Resource.createCellOutput(
      createBuyerLockScript(context),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(buyerPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(pokemonId, pokemonPrice));

    // No PokePoint output - all points are burned (including overpayment)
    addChangeOutput(tx, 20000000000n, context); // Increased change to account for no PokePoint output

    const verifier = Verifier.from(context.resource, tx);
    verifier.verifySuccess(true);
  });

  test('should fail when buyer has insufficient PokePoints', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();

    // Create a real PokePoint type script using the deployed poke-point contract
    const buyerPokePointTypeScript = createRealPokePointTypeScript(context);
    const pokePointTypeHash = buyerPokePointTypeScript.hash();

    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonId = 144n; // Articuno
    const pokemonPrice = 100;

    const existingPokemonCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pokemonDataToBytes(pokemonId, pokemonPrice),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(existingPokemonCell));

    const buyerPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      buyerPokePointTypeScript,
      pointsToBytes(50n),
      5000000000n,
    );
    tx.inputs.push(Resource.createCellInput(buyerPokePointCell));

    addInputCell(tx, 5000000000n, context);

    const buyerPokemonCell = Resource.createCellOutput(
      createBuyerLockScript(context),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(buyerPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(pokemonId, pokemonPrice));

    addChangeOutput(tx, 10000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });

  test('should succeed but be treated as transfer when no matching PokePoint found', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();

    // Create a wrong PokePoint type hash that doesn't match real PokePoint
    const wrongPokePointTypeHash =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Create Pokemon type script with the WRONG PokePoint type hash
    const typeScript = createPokemonTypeScript(issuerLockHash, wrongPokePointTypeHash, context);

    const pokemonId = 6n; // Charizard
    const pokemonPrice = 100;

    // Create Pokemon input from one owner
    const inputPokemonCell = context.resource.mockCell(
      createBuyerLockScript(context, '0x01'), // Owner 1
      typeScript,
      pokemonDataToBytes(pokemonId, pokemonPrice),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(inputPokemonCell));

    // Create PokePoint input that doesn't match expected type hash
    const realPokePointTypeScript = createRealPokePointTypeScript(context);
    const buyerPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      realPokePointTypeScript,
      pointsToBytes(150n),
      15000000000n,
    );
    tx.inputs.push(Resource.createCellInput(buyerPokePointCell));

    addInputCell(tx, 5000000000n, context);

    // Create Pokemon output to different owner (this makes it a valid transfer)
    const outputPokemonCell = Resource.createCellOutput(
      createBuyerLockScript(context, '0x02'), // Owner 2
      typeScript,
      10000000000n,
    );
    tx.outputs.push(outputPokemonCell);
    tx.outputsData.push(pokemonDataToBytes(pokemonId, pokemonPrice));

    addChangeOutput(tx, 20000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    // This should succeed as a transfer transaction since no matching PokePoints were found
    verifier.verifySuccess(true);
  });

  test('should fail when trying to modify Pokemon data during purchase', async () => {
    const tx = Transaction.default();
    deployScripts(tx, context);

    const issuerLockHash = context.alwaysSuccessScript.hash();

    // Create a real PokePoint type script using the deployed poke-point contract
    const buyerPokePointTypeScript = createRealPokePointTypeScript(context);
    const pokePointTypeHash = buyerPokePointTypeScript.hash();

    const typeScript = createPokemonTypeScript(issuerLockHash, pokePointTypeHash, context);

    const pokemonId = 9n; // Blastoise
    const pokemonPrice = 100;

    const existingPokemonCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      typeScript,
      pokemonDataToBytes(pokemonId, pokemonPrice),
      10000000000n,
    );
    tx.inputs.push(Resource.createCellInput(existingPokemonCell));

    const buyerPokePointCell = context.resource.mockCell(
      context.alwaysSuccessScript,
      buyerPokePointTypeScript,
      pointsToBytes(150n),
      15000000000n,
    );
    tx.inputs.push(Resource.createCellInput(buyerPokePointCell));

    addInputCell(tx, 5000000000n, context);

    const buyerPokemonCell = Resource.createCellOutput(
      createBuyerLockScript(context),
      typeScript,
      10000000000n,
    );
    tx.outputs.push(buyerPokemonCell);
    // Modify Pokemon data during purchase (change pokemonId from 9 to 50, and price from 100 to 50)
    tx.outputsData.push(pokemonDataToBytes(50n, 50));

    addChangeOutput(tx, 20000000000n, context);

    const verifier = Verifier.from(context.resource, tx);
    await verifier.verifyFailure();
  });
});

function pointsToBytes(points: bigint): `0x${string}` {
  const buffer = new Uint8Array(16);
  const view = new DataView(buffer.buffer);
  view.setBigUint64(0, points, true);
  return hexFrom(buffer);
}

function createBuyerLockScript(context: TestContext, args: string = '0x01'): Script {
  return Script.from({
    codeHash: context.alwaysSuccessScript.codeHash,
    hashType: context.alwaysSuccessScript.hashType,
    args: args,
  });
}

#!/usr/bin/env node

import { ccc } from '@ckb-ccc/core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration based on deployment
const CONFIG = {
  // CKB-JS-VM (executor for Pokemon contract) - same as PokePoint
  CKB_JS_VM_CODE_HASH: '0x3e9b6bead927bef62fcb56f0c79f4fbd1b739f32dd222beac10d346f2918bed7',
  CKB_JS_VM_HASH_TYPE: 'type',
  CKB_JS_VM_TX_HASH: '0x9f6558e91efa7580bfe97830d11cd94ca5d614bbf4a10b36f3a5b9d092749353',

  // Pokemon contract deployment info (updated with burn functionality)
  POKEMON_CODE_HASH: '0xaba2b6178730a3d543cc95f96f9fc669964e6b90fe100bccfca25db02b8b1caf',
  POKEMON_HASH_TYPE: 1, // "type" = 1
  POKEMON_TX_HASH: '0x1d3b9a0ed15bb9e6ac87a6f2c13ed25613ab28dab57392b46a2b77d9ccd469c1',
  POKEMON_DEP_GROUP_TX_HASH: '0x98962ccb7800483c780a86897c072df2f22cd526e701fd9e4465edd674e71464',

  // PokePoint type hash (required in Pokemon args)
  POKEPOINT_TYPE_HASH: '0xee71850b11443115045505c2b30499e1744482438c726c21b483a6e11c40b1d6',

  // Issuer lock args (the args from deployment, not the hash)
  ISSUER_LOCK_ARGS: '0xc13d8e949c0d6874a82ab2976ede9d036aa9a5e0',

  // CKB network configuration (testnet)
  RPC_URL: 'https://testnet.ckb.dev/rpc',

  // Default transaction parameters
  DEFAULT_BATCH_SIZE: 100,
  MIN_CAPACITY: 22000000000n, // 220 CKB in shannon

  // Data file paths
  POKEMON_DATA_FILE: path.join(__dirname, '..', 'pokemon-data.json'),
};

class PokemonIssuer {
  constructor(privateKey, rpcUrl = CONFIG.RPC_URL) {
    this.client = new ccc.ClientPublicTestnet();
    this.signer = new ccc.SignerCkbPrivateKey(this.client, privateKey);
  }

  /**
   * Load Pokemon data from the JSON file
   */
  loadPokemonData() {
    try {
      const data = fs.readFileSync(CONFIG.POKEMON_DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load Pokemon data: ${error.message}`);
      console.log(`Make sure to run 'node fetch-pokemon-data.js' first to generate the data file.`);
      process.exit(1);
    }
  }

  /**
   * Encode Pokemon cell data: pokemonId (uint128, 16 bytes) + price (uint16, 2 bytes)
   */
  encodePokemonData(pokemonId, price) {
    // Use CCC's numToBytes for proper encoding
    const pokemonIdBytes = ccc.numToBytes(BigInt(pokemonId), 16);
    const priceBytes = ccc.numToBytes(BigInt(price), 2);

    // Combine: pokemonId + price
    const combined = new Uint8Array(18);
    combined.set(new Uint8Array(pokemonIdBytes), 0);
    combined.set(new Uint8Array(priceBytes), 16);

    return combined;
  }

  /**
   * Create Pokemon Type Script Args
   * Args structure: vmArgs(2) + codeHash(32) + hashType(1) + issuerLockHash(32) + pokePointTypeHash(32)
   */
  createPokemonArgs(issuerLockHash) {
    const vmArgs = '0000';
    const codeHash = CONFIG.POKEMON_CODE_HASH.slice(2);
    const hashType = ccc.hexFrom(ccc.hashTypeToBytes(CONFIG.POKEMON_HASH_TYPE)).slice(2);
    const issuerHash = issuerLockHash.slice(2);
    const pokePointHash = CONFIG.POKEPOINT_TYPE_HASH.slice(2);
    return '0x' + vmArgs + codeHash + hashType + issuerHash + pokePointHash;
  }

  /**
   * Create Pokemon Type Script
   */
  createPokemonTypeScript(issuerLockHash) {
    return ccc.Script.from({
      codeHash: CONFIG.CKB_JS_VM_CODE_HASH,
      hashType: CONFIG.CKB_JS_VM_HASH_TYPE,
      args: this.createPokemonArgs(issuerLockHash),
    });
  }

  /**
   * Build transaction to issue Pokemon NFTs
   */
  async buildIssueTransaction(pokemonRange) {
    const pokemonData = this.loadPokemonData();

    console.log(
      `Building transaction for Pokemon IDs ${pokemonRange.start} to ${pokemonRange.end}`,
    );

    // Create transaction
    const tx = ccc.Transaction.from({
      inputs: [],
      outputs: [],
      outputsData: [],
      cellDeps: [],
      headerDeps: [],
      witnesses: [],
    });

    // Add CKB-JS-VM cell dep (same pattern as PokePoint)
    tx.cellDeps.push(
      ccc.CellDep.from({
        outPoint: ccc.OutPoint.from({
          txHash: CONFIG.CKB_JS_VM_TX_HASH,
          index: 0n,
        }),
        depType: 'code',
      }),
    );

    // Add Pokemon contract dep group
    tx.cellDeps.push(
      ccc.CellDep.from({
        outPoint: ccc.OutPoint.from({
          txHash: CONFIG.POKEMON_DEP_GROUP_TX_HASH,
          index: 0n,
        }),
        depType: 'depGroup',
      }),
    );

    // Get issuer address and lock script
    const issuerAddress = await this.signer.getInternalAddress();
    const addressObjs = await this.signer.getAddressObjs();
    const issuerLock = addressObjs[0].script;
    const issuerLockHash = issuerLock.hash();

    console.log(`Issuer address: ${issuerAddress}`);
    console.log(`Issuer lock hash: ${issuerLockHash}`);

    // Note: In production, you should verify the issuer
    // For testing, we'll proceed without strict verification
    console.log(`Using issuer with args: ${issuerLock.args}`);

    // Create Pokemon type script
    const pokemonTypeScript = this.createPokemonTypeScript(issuerLockHash);

    // Create Pokemon outputs
    for (let id = pokemonRange.start; id <= pokemonRange.end; id++) {
      const pokemon = pokemonData.find((p) => p.id === id);
      if (!pokemon) {
        console.warn(`Pokemon with ID ${id} not found in data file, skipping...`);
        continue;
      }

      // Create Pokemon cell output
      const pokemonCell = ccc.CellOutput.from({
        capacity: CONFIG.MIN_CAPACITY,
        lock: issuerLock,
        type: pokemonTypeScript,
      });

      // Encode Pokemon data
      const cellData = this.encodePokemonData(pokemon.id, pokemon.price);

      tx.outputs.push(pokemonCell);
      tx.outputsData.push(ccc.hexFrom(cellData));

      console.log(
        `Added Pokemon #${pokemon.id} (${pokemon.name}) - Price: ${pokemon.price} PokePoints`,
      );
    }

    // Complete transaction inputs to cover capacity
    await tx.completeInputsByCapacity(this.signer);

    // Complete transaction with fee
    await tx.completeFeeBy(this.signer);

    return tx;
  }

  /**
   * Issue Pokemon NFTs
   */
  async issuePokemon(startId, endId) {
    try {
      console.log(`\n🎮 Issuing Pokemon NFTs from ID ${startId} to ${endId}`);

      const pokemonRange = { start: startId, end: endId };
      const tx = await this.buildIssueTransaction(pokemonRange);

      console.log(`\n📝 Transaction built successfully`);
      console.log(`   Outputs: ${tx.outputs.length}`);
      console.log(`   Inputs: ${tx.inputs.length}`);

      // Sign and send transaction
      console.log(`\n✏️  Signing transaction...`);
      const signedTx = await this.signer.signTransaction(tx);

      console.log(`\n📤 Sending transaction...`);
      const txHash = await this.client.sendTransaction(signedTx);

      console.log(`\n✅ Transaction sent successfully!`);
      console.log(`   Transaction hash: ${txHash}`);
      console.log(`   Issued ${endId - startId + 1} Pokemon NFTs`);
      console.log(`   Note: Transaction is pending confirmation`);

      return txHash;
    } catch (error) {
      console.error(`\n❌ Failed to issue Pokemon NFTs: ${error.message}`);
      throw error;
    }
  }
}

// Command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    privateKey: null,
    start: 1,
    end: 100,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--private-key':
      case '-k':
        options.privateKey = args[++i];
        break;
      case '--start':
      case '-s':
        options.start = parseInt(args[++i]);
        break;
      case '--end':
      case '-e':
        options.end = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🎮 Pokemon NFT Issuer

Usage: node issue-pokemon.js [options]

Options:
  -k, --private-key <key>    Private key for signing transactions (required)
  -s, --start <id>           Starting Pokemon ID (default: 1)
  -e, --end <id>             Ending Pokemon ID (default: 100)
  -h, --help                 Show this help message

Examples:
  # Issue Pokemon #1 to #100
  node issue-pokemon.js --private-key 0x1234... --start 1 --end 100

  # Issue a single Pokemon
  node issue-pokemon.js --private-key 0x1234... --start 25 --end 25

  # Issue Pokemon #101 to #200
  node issue-pokemon.js --private-key 0x1234... --start 101 --end 200

Note: Make sure to run 'node fetch-pokemon-data.js' first to generate the Pokemon data file.
`);
}

function validateOptions(options) {
  if (!options.privateKey) {
    console.error('❌ Private key is required. Use --private-key option.');
    process.exit(1);
  }

  if (options.start < 1 || options.end < 1) {
    console.error('❌ Pokemon IDs must be positive numbers.');
    process.exit(1);
  }

  if (options.start > options.end) {
    console.error('❌ Start ID must be less than or equal to end ID.');
    process.exit(1);
  }

  if (options.end - options.start + 1 > CONFIG.DEFAULT_BATCH_SIZE) {
    console.error(
      `❌ Cannot issue more than ${CONFIG.DEFAULT_BATCH_SIZE} Pokemon in a single transaction.`,
    );
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    const options = parseArguments();
    validateOptions(options);

    console.log('🚀 Starting Pokemon NFT issuance...');
    console.log(`   Network: CKB Testnet`);
    console.log(`   Range: Pokemon #${options.start} to #${options.end}`);
    console.log(`   Count: ${options.end - options.start + 1} Pokemon`);

    const issuer = new PokemonIssuer(options.privateKey);
    const txHash = await issuer.issuePokemon(options.start, options.end);

    console.log(`\n🎉 Pokemon NFT issuance completed successfully!`);
    console.log(`   View transaction: https://pudge.explorer.nervos.org/transaction/${txHash}`);
  } catch (error) {
    console.error(`\n💥 Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { PokemonIssuer };

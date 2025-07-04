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

  // Pokemon contract deployment info (updated with newly deployed contracts) 
  POKEMON_CODE_HASH: '0xc9cbc70b438403829694f6a49930a261b861c80dd717b0cda24d67f950657d28',
  POKEMON_HASH_TYPE: 1, // "type" = 1
  POKEMON_TX_HASH: '0x6f25b8decdc74594926fd42380d5c811dfc9407e514a8acc34a0a4df5bc16a5a',
  POKEMON_DEP_GROUP_TX_HASH: '0x278412c1bd763762774c1385d3c103fedcd2086495dfb01e1c030fbfe3c7962b',

  // PokePoint type hash (required in Pokemon args)
  POKEPOINT_TYPE_HASH: '0xea20fed487aa51a17d92ad9b0cb5bdf34a20c7809554247d678053a7cfb1c159',

  // Issuer lock args (the args from deployment, not the hash)
  ISSUER_LOCK_ARGS: '0xa95d7caffda25859a126b4c9adf2b178231b3bd4',

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
    
    console.log('Pokemon args components:', {
      vmArgs,
      codeHash,
      hashType,
      issuerHash,
      pokePointHash,
    });
    
    const fullArgs = '0x' + vmArgs + codeHash + hashType + issuerHash + pokePointHash;
    console.log('Full Pokemon args:', fullArgs);
    console.log('Args length:', fullArgs.length, 'bytes:', (fullArgs.length - 2) / 2);
    
    return fullArgs;
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

    // Add always success script cell deps
    await tx.addCellDepsOfKnownScripts(this.client, ccc.KnownScript.AlwaysSuccess);

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
    console.log('Pokemon Type Script:', {
      codeHash: pokemonTypeScript.codeHash,
      hashType: pokemonTypeScript.hashType,
      args: pokemonTypeScript.args,
    });

    // Create Pokemon outputs
    for (let id = pokemonRange.start; id <= pokemonRange.end; id++) {
      console.log(`Processing Pokemon ID ${id}...`);
      const pokemon = pokemonData.find((p) => p.id === id);
      if (!pokemon) {
        console.warn(`Pokemon with ID ${id} not found in data file, skipping...`);
        continue;
      }
      console.log(`Found Pokemon: ${pokemon.name}`);

      // Create Pokemon cell output with always success lock as requested
      // This allows Pokemon to be transferred without issuer signature
      console.log('Getting always success script...');
      const alwaysSuccessScript = await this.client.getKnownScript(ccc.KnownScript.AlwaysSuccess);
      console.log('Always success script:', alwaysSuccessScript);
      
      // Create the lock script from the ScriptInfo
      const alwaysSuccessLock = ccc.Script.from({
        codeHash: alwaysSuccessScript.codeHash,
        hashType: alwaysSuccessScript.hashType,
        args: '0x',
      });
      
      console.log('Creating Pokemon cell...');
      const pokemonCell = ccc.CellOutput.from({
        capacity: CONFIG.MIN_CAPACITY,
        lock: alwaysSuccessLock,
        type: pokemonTypeScript,
      });
      console.log('Pokemon cell created successfully');

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

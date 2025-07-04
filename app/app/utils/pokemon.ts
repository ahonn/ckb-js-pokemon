import { ccc } from '@ckb-ccc/connector-react';
import { Pokemon } from '../hooks/usePokemonData';
import { 
  createPokePointTypeScript, 
  hexToPoints,
  pointsToHex,
} from './pokepoint';
import {
  POKEMON_TYPE_ID,
  POKEMON_DEP_GROUP_TX_HASH,
  CKB_JS_VM_CODE_HASH,
  CKB_JS_VM_HASH_TYPE,
  CKB_JS_VM_TX_HASH,
  POKEPOINT_DEP_GROUP_TX_HASH,
  CKB_PER_POINT,
  ISSUER_CONFIG,
  POKEPOINT_CONFIG,
} from '../config/contracts';

// Pure functions for Pokemon-related operations
export function formatPokemonNumber(id: number): string {
  return `#${id.toString().padStart(3, '0')}`;
}

export function getPokemonTypeColor(typeName: string): string {
  const typeColors: Record<string, string> = {
    normal: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md border border-gray-600',
    fire: 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-md border border-red-700',
    water: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border border-blue-700',
    electric: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 shadow-md border border-yellow-600',
    grass: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md border border-green-700',
    ice: 'bg-gradient-to-r from-cyan-300 to-blue-300 text-gray-800 shadow-md border border-cyan-500',
    fighting: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md border border-red-800',
    poison: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md border border-purple-700',
    ground: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-md border border-yellow-700',
    flying: 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white shadow-md border border-indigo-600',
    psychic: 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md border border-pink-700',
    bug: 'bg-gradient-to-r from-green-400 to-lime-500 text-white shadow-md border border-green-600',
    rock: 'bg-gradient-to-r from-amber-600 to-yellow-700 text-white shadow-md border border-amber-700',
    ghost: 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md border border-purple-800',
    dragon: 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md border border-indigo-800',
    dark: 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md border border-gray-900',
    steel: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md border border-gray-700',
    fairy: 'bg-gradient-to-r from-pink-300 to-rose-400 text-gray-800 shadow-md border border-pink-500',
  };
  
  return (
    typeColors[typeName.toLowerCase()] ||
    'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md border border-gray-600'
  );
}

export function getPokemonCardBackground(pokemon: Pokemon): string {
  const primaryType = pokemon.types?.[0]?.type.name.toLowerCase() || 'normal';
  const cardBgs: Record<string, string> = {
    normal: 'bg-gray-100/70 backdrop-blur-md border-gray-300/50',
    fire: 'bg-gradient-to-br from-red-100/70 to-orange-100/70 backdrop-blur-md border-red-300/50',
    water: 'bg-gradient-to-br from-blue-100/70 to-cyan-100/70 backdrop-blur-md border-blue-300/50',
    electric: 'bg-gradient-to-br from-yellow-100/70 to-yellow-200/70 backdrop-blur-md border-yellow-400/50',
    grass: 'bg-gradient-to-br from-green-100/70 to-lime-100/70 backdrop-blur-md border-green-400/50',
    ice: 'bg-gradient-to-br from-cyan-100/70 to-blue-100/70 backdrop-blur-md border-cyan-300/50',
    fighting: 'bg-gradient-to-br from-red-100/70 to-red-200/70 backdrop-blur-md border-red-400/50',
    poison: 'bg-gradient-to-br from-purple-100/70 to-purple-200/70 backdrop-blur-md border-purple-400/50',
    ground: 'bg-gradient-to-br from-yellow-100/70 to-orange-100/70 backdrop-blur-md border-yellow-400/50',
    flying: 'bg-gradient-to-br from-indigo-100/70 to-sky-100/70 backdrop-blur-md border-indigo-300/50',
    psychic: 'bg-gradient-to-br from-pink-100/70 to-purple-100/70 backdrop-blur-md border-pink-400/50',
    bug: 'bg-gradient-to-br from-green-100/70 to-lime-100/70 backdrop-blur-md border-green-400/50',
    rock: 'bg-gradient-to-br from-amber-100/70 to-yellow-100/70 backdrop-blur-md border-amber-400/50',
    ghost: 'bg-gradient-to-br from-purple-100/70 to-indigo-100/70 backdrop-blur-md border-purple-400/50',
    dragon: 'bg-gradient-to-br from-indigo-100/70 to-purple-100/70 backdrop-blur-md border-indigo-400/50',
    dark: 'bg-gradient-to-br from-gray-100/70 to-slate-100/70 backdrop-blur-md border-gray-400/50',
    steel: 'bg-gradient-to-br from-gray-100/70 to-slate-100/70 backdrop-blur-md border-slate-400/50',
    fairy: 'bg-gradient-to-br from-pink-100/70 to-rose-100/70 backdrop-blur-md border-pink-400/50',
  };
  
  return cardBgs[primaryType] || cardBgs.normal;
}

export function getPokemonStatValue(pokemon: Pokemon, statName: string): number {
  const stat = pokemon.stats?.find((s) => s.stat.name === statName);
  return stat?.base_stat || 0;
}

export function getStatBarColor(value: number, statType: string): string {
  const statColors = {
    hp: { low: 'bg-red-200', mid: 'bg-red-400', high: 'bg-red-500' },
    attack: { low: 'bg-orange-200', mid: 'bg-orange-400', high: 'bg-orange-500' },
    defense: { low: 'bg-blue-200', mid: 'bg-blue-400', high: 'bg-blue-500' },
    speed: { low: 'bg-green-200', mid: 'bg-green-400', high: 'bg-green-500' },
  };

  const colors = statColors[statType as keyof typeof statColors] || statColors.hp;

  if (value >= 80) return colors.high;
  if (value >= 50) return colors.mid;
  return colors.low;
}

export function getStatPercentage(value: number): number {
  return Math.min((value / 150) * 100, 100);
}

export function generatePokemonImageUrl(pokemon: Pokemon): string {
  // Priority order for image URLs
  if (pokemon.imageUrl) return pokemon.imageUrl;
  
  if (pokemon.sprites?.other?.['official-artwork']?.front_default) {
    return pokemon.sprites.other['official-artwork'].front_default;
  }
  
  if (pokemon.sprites?.front_default) {
    return pokemon.sprites.front_default;
  }
  
  // Fallback to PokeAPI sprite
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
}

export function generateFallbackImageUrl(pokemonName: string): string {
  return `https://via.placeholder.com/144x144/f0f0f0/999999?text=${pokemonName}`;
}

// Pokemon contract related functions
export function createPokemonTypeScript(issuerLockHash: string, pokePointTypeHash: string): ccc.ScriptLike {
  // Pokemon type script args: vmArgs(2) + codeHash(32) + hashType(1) + issuerLockHash(32) + pokePointTypeHash(32)
  // This must match the args structure used in issue-pokemon.js
  const vmArgs = '0000'; // 2 bytes
  const pokemonCodeHash = POKEMON_TYPE_ID.slice(2); // 32 bytes, remove 0x prefix
  const pokemonHashType = '01'; // 1 byte, "type" = 1
  const issuerHash = issuerLockHash.slice(2); // 32 bytes, remove 0x prefix
  const pokePointHash = pokePointTypeHash.slice(2); // 32 bytes, remove 0x prefix

  const args = ('0x' + vmArgs + pokemonCodeHash + pokemonHashType + issuerHash + pokePointHash) as `0x${string}`;

  return {
    codeHash: CKB_JS_VM_CODE_HASH, // Use CKB-JS-VM as the executor
    hashType: CKB_JS_VM_HASH_TYPE, // CKB-JS-VM hash type
    args,
  };
}

export function addPokemonCellDeps(tx: ccc.Transaction): void {
  // Add CKB-JS-VM cell dep
  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: CKB_JS_VM_TX_HASH,
      index: 0n,
    }),
    depType: 'code',
  }));

  // Add Pokemon contract cell dep
  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: POKEMON_DEP_GROUP_TX_HASH,
      index: 0n,
    }),
    depType: 'depGroup',
  }));
}

export async function buildPokemonPurchaseTransaction(
  client: ccc.Client,
  signer: ccc.Signer,
  pokemon: Pokemon,
  pokemonCell: ccc.CellLike,
): Promise<ccc.Transaction> {
  
  const buyerLock = await signer.getRecommendedAddressObj();
  const lockScript = buyerLock.script;
  const lockHash = lockScript.hash();

  
  // Create type scripts
  const pokePointTypeScript = createPokePointTypeScript({
    targetLockHash: lockHash,
    ckbPerPoint: CKB_PER_POINT,
  });

  // Create Pokemon type script with correct issuer lock hash and PokePoint type ID
  // Note: Pokemon type script must use the issuer's lock hash, not the buyer's
  // Note: Use PokePoint TYPE_ID, not the type script hash
  const pokemonTypeScript = createPokemonTypeScript(ISSUER_CONFIG.LOCK_HASH, POKEPOINT_CONFIG.TYPE_ID);

  // Create transaction
  const tx = ccc.Transaction.from({
    version: 0n,
    cellDeps: [],
    headerDeps: [],
    inputs: [],
    outputs: [],
    outputsData: [],
    witnesses: [],
  });

  // Verify all dependencies exist on the network
  try {
    await client.getTransaction(CKB_JS_VM_TX_HASH);
  } catch {
    throw new Error(`CKB-JS-VM transaction not found: ${CKB_JS_VM_TX_HASH}`);
  }

  try {
    await client.getTransaction(POKEPOINT_DEP_GROUP_TX_HASH);
  } catch {
    throw new Error(`PokePoint dep group transaction not found: ${POKEPOINT_DEP_GROUP_TX_HASH}`);
  }

  try {
    await client.getTransaction(POKEMON_DEP_GROUP_TX_HASH);
  } catch {
    throw new Error(`Pokemon dep group transaction not found: ${POKEMON_DEP_GROUP_TX_HASH}`);
  }

  // Add standard CKB lock script dependencies
  // This is required for verifying the lock scripts in the transaction
  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.Secp256k1Blake160);
  
  // Add always success script dependency for Pokemon cells
  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.AlwaysSuccess);

  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: CKB_JS_VM_TX_HASH,
      index: 0n,
    }),
    depType: 'code',
  }));

  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: POKEPOINT_DEP_GROUP_TX_HASH,
      index: 0n,
    }),
    depType: 'depGroup',
  }));

  tx.cellDeps.push(ccc.CellDep.from({
    outPoint: ccc.OutPoint.from({
      txHash: POKEMON_DEP_GROUP_TX_HASH,
      index: 0n,
    }),
    depType: 'depGroup',
  }));

  // Find user's PokePoint cells
  const requiredPoints = BigInt(pokemon.price);
  let totalPoints = 0n;
  let after: string | undefined;
  const pokePointCells: ccc.CellLike[] = [];

  // Find enough PokePoint cells to cover the purchase
  while (totalPoints < requiredPoints) {
    const result = await client.findCellsPaged(
      {
        script: pokePointTypeScript,
        scriptType: 'type',
        scriptSearchMode: 'exact',
        filter: {
          script: lockScript,
        },
      },
      'asc',
      '0x64',
      after
    );

    if (!result.cells || result.cells.length === 0) {
      throw new Error('Insufficient PokePoints for purchase');
    }

    for (const cell of result.cells) {
      if (cell.cellOutput.type && cell.outputData) {
        const points = hexToPoints(cell.outputData);
        if (points > 0n) {
          pokePointCells.push(cell);
          totalPoints += points;
          if (totalPoints >= requiredPoints) break;
        }
      }
    }

    if (!result.lastCursor || result.lastCursor === after) {
      break;
    }
    after = result.lastCursor;
  }

  if (totalPoints < requiredPoints) {
    throw new Error(`Insufficient PokePoints: have ${totalPoints}, need ${requiredPoints}`);
  }

  // Add buyer's PokePoint inputs first (these will be signed by the buyer)
  for (const cell of pokePointCells) {
    const outPoint = 'previousOutput' in cell 
      ? cell.previousOutput 
      : 'outPoint' in cell 
        ? (cell as { outPoint: { txHash: string; index: bigint } }).outPoint
        : { txHash: '0x', index: 0n };
    
    tx.inputs.push(ccc.CellInput.from({
      previousOutput: ccc.OutPoint.from({
        txHash: outPoint.txHash,
        index: outPoint.index,
      }),
      since: 0n,
    }));
  }

  // Add Pokemon input 
  // If it uses always success lock, no signature is needed
  // If it uses buyer's lock, it will be handled by the signer
  const pokemonOutPoint = 'previousOutput' in pokemonCell 
    ? pokemonCell.previousOutput 
    : 'outPoint' in pokemonCell 
      ? (pokemonCell as { outPoint: { txHash: string; index: bigint } }).outPoint
      : { txHash: '0x', index: 0n };
  
  tx.inputs.push(ccc.CellInput.from({
    previousOutput: ccc.OutPoint.from({
      txHash: pokemonOutPoint.txHash,
      index: pokemonOutPoint.index,
    }),
    since: 0n,
  }));

  // Add Pokemon output (transfer to buyer)
  tx.outputs.push(ccc.CellOutput.from({
    capacity: pokemonCell.cellOutput.capacity,
    lock: lockScript,
    type: pokemonTypeScript,
  }));
  tx.outputsData.push(pokemonCell.outputData! as `0x${string}`);

  // Add PokePoint payment to issuer (required by new contract validation)
  const paymentCapacity = requiredPoints * CKB_PER_POINT;
  const paymentData = pointsToHex(requiredPoints);
  
  // Create issuer lock script for payment using standard Secp256k1Blake160
  const issuerLockScript = ccc.Script.from({
    codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8', // Secp256k1Blake160
    hashType: 'type',
    args: ISSUER_CONFIG.LOCK_ARGS, // Issuer's lock args
  });
  
  // Verify the lock script hash matches the expected issuer lock hash
  const actualLockHash = issuerLockScript.hash();
  
  if (actualLockHash !== ISSUER_CONFIG.LOCK_HASH) {
    throw new Error(`Issuer lock hash mismatch: expected ${ISSUER_CONFIG.LOCK_HASH}, got ${actualLockHash}`);
  }
  
  tx.outputs.push(ccc.CellOutput.from({
    capacity: paymentCapacity,
    lock: issuerLockScript,
    type: pokePointTypeScript,
  }));
  tx.outputsData.push(paymentData as `0x${string}`);

  // Add PokePoint change output if there's overpayment
  const changePoints = totalPoints - requiredPoints;
  if (changePoints > 0n) {
    const changeCapacity = changePoints * CKB_PER_POINT;
    const changeData = pointsToHex(changePoints);
    
    tx.outputs.push(ccc.CellOutput.from({
      capacity: changeCapacity,
      lock: lockScript,
      type: pokePointTypeScript,
    }));
    tx.outputsData.push(changeData as `0x${string}`);
  }

  // Complete transaction fee
  await tx.completeFeeBy(signer, 1000n);

  // No special witness handling needed:
  // - Always success lock requires no signature
  // - Buyer's lock will be handled automatically by the signer

  return tx;
}
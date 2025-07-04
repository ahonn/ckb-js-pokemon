import { useState, useEffect, useCallback, useMemo } from 'react';
import { ccc } from '@ckb-ccc/core';
import Pokedex from 'pokedex-promise-v2';
import {
  CKB_JS_VM_CONFIG,
  POKEMON_CONFIG,
  POKEPOINT_CONFIG,
  ISSUER_CONFIG,
} from '../config/contracts';
import { Pokemon } from './usePokemonData';

interface UseOwnedPokemonReturn {
  ownedPokemon: Pokemon[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refreshPokemon: () => Promise<void>;
}

interface UseOwnedPokemonOptions {
  client: ccc.Client;
  signer: ccc.Signer | null;
  autoLoad?: boolean;
  pageSize?: number;
}

export function useOwnedPokemon({ client, signer, autoLoad = true, pageSize = 12 }: UseOwnedPokemonOptions): UseOwnedPokemonReturn {
  const [ownedPokemon, setOwnedPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  // Memoize Pokedex instance to prevent recreation on every render
  const pokedex = useMemo(() => new Pokedex(), []);

  const loadOwnedPokemonData = useCallback(async (isLoadMore = false) => {
    if (!signer) {
      setLoading(false);
      setOwnedPokemon([]);
      setError('No wallet connected');
      return;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        setOwnedPokemon([]);
        setNextCursor(undefined);
        setHasMore(true);
      }

      // Query owned Pokemon NFTs from blockchain with pagination
      const result = await queryOwnedPokemonCellsPaged(client, signer, pageSize, isLoadMore ? nextCursor : undefined);

      // Load detailed Pokemon data from PokeAPI
      const pokemonWithDetails = await Promise.all(
        result.pokemon.map(async (pokemon) => {
          try {
            // Get Pokemon data
            const pokemonData = await pokedex.getPokemonByName(pokemon.name);


            return {
              ...pokemon,
              types: pokemonData.types,
              stats: pokemonData.stats,
              sprites: pokemonData.sprites,
              imageUrl:
                pokemonData.sprites.other?.['official-artwork']?.front_default ||
                pokemonData.sprites.front_default ||
                null,
            };
          } catch {
            return { 
              ...pokemon, 
              imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` 
            };
          }
        }),
      );

      if (isLoadMore) {
        setOwnedPokemon(prev => [...prev, ...pokemonWithDetails]);
      } else {
        setOwnedPokemon(pokemonWithDetails);
      }
      
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load owned Pokemon data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [client, signer, pokedex, pageSize, nextCursor]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      return loadOwnedPokemonData(true);
    }
    return Promise.resolve();
  }, [loadOwnedPokemonData, loadingMore, hasMore]);

  useEffect(() => {
    if (autoLoad) {
      loadOwnedPokemonData();
    }
  }, [autoLoad]); // Remove loadOwnedPokemonData from deps to avoid infinite loop

  // Reload data when signer changes (wallet connects/disconnects)
  useEffect(() => {
    if (signer && autoLoad) {
      loadOwnedPokemonData();
    }
  }, [signer]);

  const refreshPokemon = useCallback(() => {
    return loadOwnedPokemonData(false);
  }, [loadOwnedPokemonData]);

  return {
    ownedPokemon,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refreshPokemon,
  };
}

// Use centralized configuration
const CONFIG = {
  CKB_JS_VM_CODE_HASH: CKB_JS_VM_CONFIG.CODE_HASH,
  CKB_JS_VM_HASH_TYPE: CKB_JS_VM_CONFIG.HASH_TYPE,
  POKEMON_CODE_HASH: POKEMON_CONFIG.TYPE_ID,
  POKEMON_HASH_TYPE: POKEMON_CONFIG.HASH_TYPE,
  POKEMON_TX_HASH: POKEMON_CONFIG.TX_HASH,
  POKEMON_DEP_GROUP_TX_HASH: POKEMON_CONFIG.DEP_GROUP_TX_HASH,
  POKEPOINT_TYPE_HASH: POKEPOINT_CONFIG.TYPE_ID,
  ISSUER_CONFIG,
};

interface QueryOwnedPokemonCellsResult {
  pokemon: Pokemon[];
  nextCursor?: string;
  hasMore: boolean;
}

async function queryOwnedPokemonCellsPaged(client: ccc.Client, signer: ccc.Signer, limit: number, after?: string): Promise<QueryOwnedPokemonCellsResult> {
  try {
    // Create Pokemon type script for filtering
    const pokemonTypeScript = ccc.Script.from({
      codeHash: CONFIG.CKB_JS_VM_CODE_HASH,
      hashType: CONFIG.CKB_JS_VM_HASH_TYPE,
      args: createPokemonArgsForIssuer(),
    });

    // Get user's lock script
    const userLockScript = await signer.getAddressObjs().then(objs => objs[0].script);


    // Query cells by user's lock script instead of Pokemon type script
    const lockSearchKey = {
      script: userLockScript,
      scriptType: 'lock' as const,
      scriptSearchMode: 'exact' as const,
    };

    const result = await client.findCellsPaged(lockSearchKey, 'asc', 100, after);
    
    
    const pokemon: Pokemon[] = [];
    
    for (const cell of result.cells) {
      // Check if this cell has a Pokemon type script
      if (cell.cellOutput.type && 
          cell.cellOutput.type.codeHash === pokemonTypeScript.codeHash &&
          cell.cellOutput.type.hashType === pokemonTypeScript.hashType &&
          cell.cellOutput.type.args === pokemonTypeScript.args) {
        
        
        // Decode Pokemon data from cell
        const pokemonData = decodePokemonData(cell.outputData);
        if (pokemonData) {
          // Add cell information to Pokemon
          pokemonData.cellId = {
            txHash: cell.outPoint!.txHash,
            index: Number(cell.outPoint!.index),
          };
          pokemon.push(pokemonData);
        }
      }
    }


    return {
      pokemon,
      nextCursor: result.lastCursor,
      hasMore: result.cells.length === limit, // If we got exactly the limit, there might be more
    };
  } catch (error) {
    console.error('Error querying owned Pokemon:', error);
    return {
      pokemon: [],
      nextCursor: undefined,
      hasMore: false,
    };
  }
}

function createPokemonArgs(issuerLockHash: string): string {
  const vmArgs = '0000';
  const codeHash = CONFIG.POKEMON_CODE_HASH.slice(2);
  const hashType = ccc.hexFrom(ccc.hashTypeToBytes(CONFIG.POKEMON_HASH_TYPE)).slice(2);
  const issuerHash = issuerLockHash.slice(2);
  const pokePointHash = CONFIG.POKEPOINT_TYPE_HASH.slice(2);
  return '0x' + vmArgs + codeHash + hashType + issuerHash + pokePointHash;
}

function createPokemonArgsForIssuer(): string {
  return createPokemonArgs(CONFIG.ISSUER_CONFIG.LOCK_HASH);
}

function decodePokemonData(data: string): Pokemon | null {
  try {
    if (!data || data === '0x') return null;

    const bytes = ccc.bytesFrom(data);
    if (bytes.length < 18) return null;

    // Manual little-endian decoding
    const pokemonId = bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24);
    const price = bytes[16] + (bytes[17] << 8);

    return loadPokemonById(pokemonId, price);
  } catch {
    return null;
  }
}

function loadPokemonById(id: number, price: number): Pokemon {
  // Pokemon data structure from blockchain
  const pokemonNames = [
    '',
    'bulbasaur',
    'ivysaur',
    'venusaur',
    'charmander',
    'charmeleon',
    'charizard',
    'squirtle',
    'wartortle',
    'blastoise',
    'caterpie',
    'metapod',
    'butterfree',
    'weedle',
    'kakuna',
    'beedrill',
    'pidgey',
    'pidgeotto',
    'pidgeot',
    'rattata',
    'raticate',
  ];

  const name = pokemonNames[id] || `pokemon-${id}`;

  return {
    id,
    name,
    price,
    types: [{ type: { name: 'normal' } }],
    stats: [
      { base_stat: 45, stat: { name: 'hp' } },
      { base_stat: 49, stat: { name: 'attack' } },
      { base_stat: 49, stat: { name: 'defense' } },
      { base_stat: 65, stat: { name: 'special-attack' } },
      { base_stat: 65, stat: { name: 'special-defense' } },
      { base_stat: 45, stat: { name: 'speed' } },
    ],
    sprites: {
      front_default: null,
      other: {
        'official-artwork': { front_default: null },
      },
    },
  };
}
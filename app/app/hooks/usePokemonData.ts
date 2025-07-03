import { useState, useEffect, useCallback, useMemo } from 'react';
import { ccc } from '@ckb-ccc/core';
import Pokedex from 'pokedex-promise-v2';

export interface Pokemon {
  id: number;
  name: string;
  price: number;
  height: number;
  weight: number;
  base_experience: number;
  types: {
    type: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
    };
    is_hidden: boolean;
  }[];
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
      };
      dream_world: {
        front_default: string | null;
      };
    };
  };
  species: {
    name: string;
    url: string;
  };
  flavor_text?: string;
  genus?: string;
  imageUrl?: string;
}

interface UsePokemonDataReturn {
  availablePokemon: Pokemon[];
  loading: boolean;
  error: string | null;
  refreshPokemon: () => Promise<void>;
}

interface UsePokemonDataOptions {
  client: ccc.Client;
  autoLoad?: boolean;
}

export function usePokemonData({ client, autoLoad = true }: UsePokemonDataOptions): UsePokemonDataReturn {
  const [availablePokemon, setAvailablePokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize Pokedex instance to prevent recreation on every render
  const pokedex = useMemo(() => new Pokedex(), []);

  const loadPokemonData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Query Pokemon NFTs from blockchain
      const pokemonCells = await queryPokemonCells(client);

      // Load detailed Pokemon data from PokeAPI
      const pokemonWithDetails = await Promise.all(
        pokemonCells.map(async (pokemon) => {
          try {
            // Get Pokemon data
            const pokemonData = await pokedex.getPokemonByName(pokemon.name);

            // Get species data for flavor text
            let speciesData = null;
            try {
              speciesData = await pokedex.getPokemonSpeciesByName(pokemon.name);
            } catch (err) {
              console.warn(`Failed to load species data for ${pokemon.name}:`, err);
            }

            // Extract flavor text in English
            const flavorText =
              speciesData?.flavor_text_entries
                ?.find((entry: { language: { name: string }; flavor_text: string }) => entry.language.name === 'en')
                ?.flavor_text?.replace(/\f/g, ' ') || '';

            // Extract genus (Pokemon category)
            const genus =
              speciesData?.genera?.find((entry: { language: { name: string }; genus: string }) => entry.language.name === 'en')?.genus || '';

            return {
              ...pokemon,
              height: pokemonData.height,
              weight: pokemonData.weight,
              base_experience: pokemonData.base_experience,
              types: pokemonData.types,
              stats: pokemonData.stats,
              abilities: pokemonData.abilities,
              sprites: pokemonData.sprites,
              species: pokemonData.species,
              flavor_text: flavorText,
              genus: genus,
              imageUrl:
                pokemonData.sprites.other?.['official-artwork']?.front_default ||
                pokemonData.sprites.front_default,
            };
          } catch (error) {
            console.warn(`Failed to load data for ${pokemon.name}:`, error);
            return { 
              ...pokemon, 
              imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` 
            };
          }
        }),
      );

      setAvailablePokemon(pokemonWithDetails);
    } catch (error) {
      console.error('Failed to load Pokemon:', error);
      setError(error instanceof Error ? error.message : 'Failed to load Pokemon data');
    } finally {
      setLoading(false);
    }
  }, [client, pokedex]);

  useEffect(() => {
    if (autoLoad) {
      loadPokemonData();
    }
  }, [loadPokemonData, autoLoad]);

  return {
    availablePokemon,
    loading,
    error,
    refreshPokemon: loadPokemonData,
  };
}

// Move blockchain query logic to separate functions for reusability
const CONFIG = {
  CKB_JS_VM_CODE_HASH: '0x3e9b6bead927bef62fcb56f0c79f4fbd1b739f32dd222beac10d346f2918bed7',
  CKB_JS_VM_HASH_TYPE: 'type' as const,
  POKEMON_CODE_HASH: '0xaba2b6178730a3d543cc95f96f9fc669964e6b90fe100bccfca25db02b8b1caf',
  POKEMON_HASH_TYPE: 1,
  POKEPOINT_TYPE_HASH: '0xee71850b11443115045505c2b30499e1744482438c726c21b483a6e11c40b1d6',
  ISSUER_LOCK_ARGS: '0xc13d8e949c0d6874a82ab2976ede9d036aa9a5e0',
  ISSUER_LOCK_HASH: '0x69884b9740d748e44bce826bd34ea70dc07bef8c9b4cd6ca246115348027ab0d',
  ISSUER_ADDRESS: 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwp8k8ff8qddp62s24jjahda8grd256tcqn4sdmu',
};

async function queryPokemonCells(client: ccc.Client): Promise<Pokemon[]> {
  try {
    console.log('=== Querying Pokemon NFTs ===');

    // Create Pokemon type script
    const pokemonTypeScript = ccc.Script.from({
      codeHash: CONFIG.CKB_JS_VM_CODE_HASH,
      hashType: CONFIG.CKB_JS_VM_HASH_TYPE,
      args: createPokemonArgsForIssuer(),
    });

    console.log('Pokemon Type Script:', {
      codeHash: pokemonTypeScript.codeHash,
      hashType: pokemonTypeScript.hashType,
      args: pokemonTypeScript.args,
    });

    // Query cells with Pokemon type script
    const cells = [];
    let cellCount = 0;

    for await (const cell of client.findCellsByType(pokemonTypeScript)) {
      cellCount++;
      console.log(`Found cell #${cellCount}:`, {
        lockCodeHash: cell.cellOutput.lock.codeHash,
        lockHashType: cell.cellOutput.lock.hashType,
        lockArgs: cell.cellOutput.lock.args,
        typeArgs: cell.cellOutput.type?.args,
        outputData: cell.outputData,
        capacity: cell.cellOutput.capacity.toString(),
      });

      // Check if cell is owned by issuer (compare lock args)
      if (cell.cellOutput.lock.args === CONFIG.ISSUER_LOCK_ARGS) {
        console.log('✅ Cell owned by issuer - decoding Pokemon data...');

        // Decode Pokemon data from cell
        const pokemon = decodePokemonData(cell.outputData);
        if (pokemon) {
          console.log('✅ Decoded Pokemon:', pokemon);
          cells.push(pokemon);
        } else {
          console.log('❌ Failed to decode Pokemon data');
        }
      } else {
        console.log('❌ Cell not owned by issuer:', {
          expected: CONFIG.ISSUER_LOCK_ARGS,
          actual: cell.cellOutput.lock.args,
        });
      }
    }

    console.log(`=== Query Results ===`);
    console.log(`Total cells found: ${cellCount}`);
    console.log(`Pokemon owned by issuer: ${cells.length}`);

    return cells;
  } catch (error) {
    console.error('Failed to query Pokemon cells:', error);
    return [];
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
  return createPokemonArgs(CONFIG.ISSUER_LOCK_HASH);
}

function decodePokemonData(data: string): Pokemon | null {
  try {
    if (!data || data === '0x') return null;

    const bytes = ccc.bytesFrom(data);
    if (bytes.length < 18) return null;

    console.log('Decoding Pokemon data:', data);

    // Manual little-endian decoding
    const pokemonId = bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24);
    const price = bytes[16] + (bytes[17] << 8);

    console.log('Decoded Pokemon ID:', pokemonId);
    console.log('Decoded price:', price);

    return loadPokemonById(pokemonId, price);
  } catch (error) {
    console.error('Failed to decode Pokemon data:', error);
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
    height: 7,
    weight: 69,
    base_experience: 64,
    types: [{ type: { name: 'normal' } }],
    stats: [
      { base_stat: 45, stat: { name: 'hp' } },
      { base_stat: 49, stat: { name: 'attack' } },
      { base_stat: 49, stat: { name: 'defense' } },
      { base_stat: 65, stat: { name: 'special-attack' } },
      { base_stat: 65, stat: { name: 'special-defense' } },
      { base_stat: 45, stat: { name: 'speed' } },
    ],
    abilities: [{ ability: { name: 'overgrow' }, is_hidden: false }],
    sprites: {
      front_default: null,
      front_shiny: null,
      other: {
        'official-artwork': { front_default: null },
        dream_world: { front_default: null },
      },
    },
    species: { name, url: '' },
  };
}
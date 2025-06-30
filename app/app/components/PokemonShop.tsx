"use client";

import { useState, useEffect } from "react";
import { ccc } from "@ckb-ccc/core";
import Pokedex from "pokedex-promise-v2";

interface Pokemon {
  id: number;
  name: string;
  price: number;
  height: number;
  weight: number;
  base_experience: number;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    special_attack: number;
    special_defense: number;
    speed: number;
  };
}

interface PokemonShopProps {
  signer: any;
  client: any;
  onPurchase?: (pokemonId: number) => void;
}

const CONFIG = {
  CKB_JS_VM_CODE_HASH: "0x3e9b6bead927bef62fcb56f0c79f4fbd1b739f32dd222beac10d346f2918bed7",
  CKB_JS_VM_HASH_TYPE: "type" as const,
  POKEMON_CODE_HASH: "0xaba2b6178730a3d543cc95f96f9fc669964e6b90fe100bccfca25db02b8b1caf",
  POKEMON_HASH_TYPE: 1,
  POKEPOINT_TYPE_HASH: "0xee71850b11443115045505c2b30499e1744482438c726c21b483a6e11c40b1d6",
  
  // Issuer information from ckb-cli account #0
  ISSUER_LOCK_ARGS: "0xc13d8e949c0d6874a82ab2976ede9d036aa9a5e0",
  ISSUER_LOCK_HASH: "0x69884b9740d748e44bce826bd34ea70dc07bef8c9b4cd6ca246115348027ab0d",
  ISSUER_ADDRESS: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwp8k8ff8qddp62s24jjahda8grd256tcqn4sdmu",
};

export default function PokemonShop({ signer, client, onPurchase }: PokemonShopProps) {
  const [availablePokemon, setAvailablePokemon] = useState<Pokemon[]>([]);
  const [pokemonImages, setPokemonImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const pokedex = new Pokedex();

  useEffect(() => {
    loadAvailablePokemon();
  }, []);

  const loadAvailablePokemon = async () => {
    try {
      setLoading(true);
      
      // Query Pokemon NFTs from blockchain
      const pokemonCells = await queryPokemonCells();
      
      // Load Pokemon data and images
      const pokemonWithImages = await Promise.all(
        pokemonCells.map(async (pokemon) => {
          try {
            const pokemonData = await pokedex.getPokemonByName(pokemon.name);
            return {
              ...pokemon,
              imageUrl: pokemonData.sprites.front_default || 
                       pokemonData.sprites.other?.['official-artwork']?.front_default
            };
          } catch (error) {
            console.warn(`Failed to load image for ${pokemon.name}:`, error);
            return { ...pokemon, imageUrl: null };
          }
        })
      );

      setAvailablePokemon(pokemonWithImages);
    } catch (error) {
      console.error("Failed to load Pokemon:", error);
    } finally {
      setLoading(false);
    }
  };

  const queryPokemonCells = async (): Promise<Pokemon[]> => {
    try {
      console.log("=== Querying Pokemon NFTs ===");
      console.log("Issuer Address:", CONFIG.ISSUER_ADDRESS);
      console.log("Issuer Lock Args:", CONFIG.ISSUER_LOCK_ARGS);
      console.log("Issuer Lock Hash:", CONFIG.ISSUER_LOCK_HASH);

      // Create Pokemon type script
      const pokemonTypeScript = ccc.Script.from({
        codeHash: CONFIG.CKB_JS_VM_CODE_HASH,
        hashType: CONFIG.CKB_JS_VM_HASH_TYPE,
        args: createPokemonArgsForIssuer(),
      });

      console.log("Pokemon Type Script:", {
        codeHash: pokemonTypeScript.codeHash,
        hashType: pokemonTypeScript.hashType,
        args: pokemonTypeScript.args
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
          capacity: cell.cellOutput.capacity.toString()
        });
        
        // Check if cell is owned by issuer (compare lock args)
        if (cell.cellOutput.lock.args === CONFIG.ISSUER_LOCK_ARGS) {
          console.log("✅ Cell owned by issuer - decoding Pokemon data...");
          
          // Decode Pokemon data from cell
          const pokemon = decodePokemonData(cell.outputData);
          if (pokemon) {
            console.log("✅ Decoded Pokemon:", pokemon);
            cells.push(pokemon);
          } else {
            console.log("❌ Failed to decode Pokemon data");
          }
        } else {
          console.log("❌ Cell not owned by issuer:", {
            expected: CONFIG.ISSUER_LOCK_ARGS,
            actual: cell.cellOutput.lock.args
          });
        }
      }

      console.log(`=== Query Results ===`);
      console.log(`Total cells found: ${cellCount}`);
      console.log(`Pokemon owned by issuer: ${cells.length}`);
      
      return cells;
    } catch (error) {
      console.error("Failed to query Pokemon cells:", error);
      console.error("Error details:", error);
      
      return [];
    }
  };

  const createPokemonArgs = (issuerLockHash: string) => {
    const vmArgs = '0000';
    const codeHash = CONFIG.POKEMON_CODE_HASH.slice(2);
    const hashType = ccc.hexFrom(ccc.hashTypeToBytes(CONFIG.POKEMON_HASH_TYPE)).slice(2);
    const issuerHash = issuerLockHash.slice(2);
    const pokePointHash = CONFIG.POKEPOINT_TYPE_HASH.slice(2);
    return '0x' + vmArgs + codeHash + hashType + issuerHash + pokePointHash;
  };

  const createPokemonArgsForIssuer = () => {
    // Use the pre-computed issuer lock hash from ckb-cli
    return createPokemonArgs(CONFIG.ISSUER_LOCK_HASH);
  };

  const decodePokemonData = (data: string): Pokemon | null => {
    try {
      if (!data || data === '0x') return null;
      
      const bytes = ccc.bytesFrom(data);
      if (bytes.length < 18) return null;

      console.log("Decoding Pokemon data:", data);

      // Manual little-endian decoding (most reliable)
      const pokemonId = bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24);
      const price = bytes[16] + (bytes[17] << 8);

      console.log("Decoded Pokemon ID:", pokemonId);
      console.log("Decoded price:", price);

      return loadPokemonById(pokemonId, price);
    } catch (error) {
      console.error("Failed to decode Pokemon data:", error);
      return null;
    }
  };

  const loadPokemonById = (id: number, price: number): Pokemon => {
    // Pokemon data structure from blockchain
    const pokemonNames = [
      "", "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon", "charizard",
      "squirtle", "wartortle", "blastoise", "caterpie", "metapod", "butterfree",
      "weedle", "kakuna", "beedrill", "pidgey", "pidgeotto", "pidgeot", "rattata", "raticate"
    ];

    return {
      id,
      name: pokemonNames[id] || `pokemon-${id}`,
      price,
      height: 7,
      weight: 69,
      base_experience: 64,
      types: ["normal"],
      stats: {
        hp: 45,
        attack: 49,
        defense: 49,
        special_attack: 65,
        special_defense: 65,
        speed: 45
      }
    };
  };

  const handlePurchase = async (pokemon: Pokemon) => {
    try {
      setPurchasing(pokemon.id);
      
      // TODO: Implement actual purchase transaction
      console.log(`Purchasing ${pokemon.name} for ${pokemon.price} PokePoints`);
      
      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onPurchase) {
        onPurchase(pokemon.id);
      }
      
      // Refresh available Pokemon after purchase
      await loadAvailablePokemon();
      
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Pokemon Shop</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="bg-gray-300 rounded-lg h-32 mb-3"></div>
              <div className="bg-gray-300 rounded h-4 mb-2"></div>
              <div className="bg-gray-300 rounded h-3 mb-2"></div>
              <div className="bg-gray-300 rounded h-8"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Pokemon Shop</h2>
      <p className="text-gray-600 mb-6">
        Purchase Pokemon NFTs with your PokePoints
      </p>
      
      {availablePokemon.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pokemon Found</h3>
          <p className="text-gray-500 mb-4">
            No Pokemon NFTs are currently available for purchase from this issuer.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Pokemon need to be issued first using the issue-pokemon.js script.
          </p>
          <button 
            onClick={loadAvailablePokemon}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availablePokemon.map((pokemon) => (
            <PokemonCard 
              key={pokemon.id}
              pokemon={pokemon}
              onPurchase={handlePurchase}
              purchasing={purchasing === pokemon.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PokemonCardProps {
  pokemon: Pokemon & { imageUrl?: string };
  onPurchase: (pokemon: Pokemon) => void;
  purchasing: boolean;
}

function PokemonCard({ pokemon, onPurchase, purchasing }: PokemonCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(pokemon.imageUrl);

  useEffect(() => {
    if (!pokemon.imageUrl) {
      // Fallback to PokeAPI sprite URL
      setImageSrc(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`);
    }
  }, [pokemon.id, pokemon.imageUrl]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="relative mb-3">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={pokemon.name}
            className={`w-full h-32 object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageSrc(`https://via.placeholder.com/128x128/f0f0f0/999999?text=${pokemon.name}`);
            }}
          />
        )}
        {!imageLoaded && (
          <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Loading...</span>
          </div>
        )}
      </div>
      
      <h3 className="font-semibold text-lg capitalize mb-2">{pokemon.name}</h3>
      
      <div className="text-sm text-gray-600 mb-3">
        <div className="flex justify-between">
          <span>ID: #{pokemon.id}</span>
          <span>EXP: {pokemon.base_experience}</span>
        </div>
        <div className="flex gap-1 mt-1">
          {pokemon.types.map((type) => (
            <span 
              key={type}
              className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg text-green-600">
          {pokemon.price} PP
        </span>
        <button
          onClick={() => onPurchase(pokemon)}
          disabled={purchasing}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {purchasing ? "Buying..." : "Buy"}
        </button>
      </div>
    </div>
  );
}
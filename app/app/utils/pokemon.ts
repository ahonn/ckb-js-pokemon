import { Pokemon } from '../hooks/usePokemonData';

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
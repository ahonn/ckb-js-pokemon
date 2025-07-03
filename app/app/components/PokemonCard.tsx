import React, { useState, useMemo, useEffect } from 'react';
import { Pokemon } from '../hooks/usePokemonData';
import { 
  formatPokemonNumber, 
  getPokemonTypeColor, 
  getPokemonCardBackground,
  generatePokemonImageUrl,
  generateFallbackImageUrl
} from '../utils/pokemon';

interface PokemonCardProps {
  pokemon: Pokemon & { imageUrl?: string };
  onPurchase: (pokemon: Pokemon) => void;
  purchasing: boolean;
}

const PokemonCard = React.memo(function PokemonCard({ pokemon, onPurchase, purchasing }: PokemonCardProps) {
  // Directly compute image URL with memoization - no state needed for initial URL
  const imageUrl = useMemo(() => generatePokemonImageUrl(pokemon), [pokemon]);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Only set image source once when component mounts or URL changes
  useEffect(() => {
    setImageSrc(imageUrl);
  }, [imageUrl]);

  return (
    <div
      className={`${getPokemonCardBackground(pokemon)} rounded-lg shadow-lg border min-w-[280px] flex flex-col p-4`}
    >
      {/* Header: Pokemon Number centered */}
      <div className="text-center mb-2">
        <span className="text-xs font-bold text-gray-600 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-200/30">
          {formatPokemonNumber(pokemon.id)}
        </span>
      </div>

      {/* Pokemon Image - centered */}
      <div className="relative mb-3 flex items-center justify-center h-36">
        <img
          src={imageSrc || imageUrl}
          alt={pokemon.name}
          className="max-w-full max-h-full object-contain"
          onError={() => {
            setImageSrc(generateFallbackImageUrl(pokemon.name));
          }}
        />
      </div>

      {/* Pokemon Name - centered and prominent */}
      <div className="text-center mb-3">
        <h3 className="font-bold text-xl capitalize text-gray-800 tracking-wide">{pokemon.name}</h3>
      </div>

      {/* Pokemon Types - centered */}
      <div className="flex gap-1 mb-4 justify-center flex-wrap">
        {pokemon.types?.map((typeInfo, index) => (
          <span
            key={index}
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPokemonTypeColor(typeInfo.type.name)}`}
          >
            {typeInfo.type.name}
          </span>
        )) || (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md border border-gray-600">
            Normal
          </span>
        )}
      </div>

      {/* Purchase Section - full width */}
      <div className="flex items-center justify-between bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="text-left">
          <div className="text-xs text-gray-700 font-medium">Price</div>
          <span className="font-bold text-xl text-amber-600">{pokemon.price}</span>
          <span className="text-sm text-gray-700 ml-1">PP</span>
        </div>
        <button
          onClick={() => onPurchase(pokemon)}
          disabled={purchasing}
          className="px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 text-xs rounded-full hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 font-bold shadow-md hover:shadow-lg transform hover:scale-105 border border-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {purchasing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Buying...</span>
            </div>
          ) : (
            'BUY'
          )}
        </button>
      </div>
    </div>
  );
});

export { PokemonCard };
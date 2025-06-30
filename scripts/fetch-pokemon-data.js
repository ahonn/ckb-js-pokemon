#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = path.join(__dirname, '..', 'pokemon-data.json');
const BASE_PRICE = 1000; // Base price in PokePoints
const BATCH_SIZE = 20; // Process in batches to avoid overwhelming the API
const DELAY_MS = 50; // Reduced delay between requests

// Rate limiting helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch data from URL with error handling and retry
async function fetchData(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        https
          .get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
              data += chunk;
            });

            res.on('end', () => {
              try {
                const jsonData = JSON.parse(data);
                resolve(jsonData);
              } catch (error) {
                reject(new Error(`Failed to parse JSON: ${error.message}`));
              }
            });
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1} for ${url}: ${error.message}`);
      await delay(DELAY_MS * (i + 1));
    }
  }
}

// Simplified price calculation
function calculatePrice(pokemon) {
  const baseStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

  // Simple tier-based pricing
  if (baseStats > 600) return 5000; // Legendary tier
  if (baseStats > 500) return 3000; // High tier
  if (baseStats > 400) return 2000; // Mid tier
  if (baseStats > 300) return 1500; // Low-mid tier
  return BASE_PRICE; // Base tier
}

async function processPokemonBatch(pokemonList, startIndex, batchSize) {
  const batch = pokemonList.slice(startIndex, startIndex + batchSize);
  const results = [];

  for (const pokemon of batch) {
    try {
      console.log(
        `Processing ${pokemon.name} (${startIndex + results.length + 1}/${pokemonList.length})...`,
      );

      // Fetch detailed Pokemon data
      const detailData = await fetchData(pokemon.url);

      // Extract basic information without species data to speed up
      const pokemonInfo = {
        id: detailData.id,
        name: detailData.name,
        price: calculatePrice(detailData),
        height: detailData.height,
        weight: detailData.weight,
        base_experience: detailData.base_experience || 0,
        types: detailData.types.map((type) => type.type.name),
        stats: {
          hp: detailData.stats.find((s) => s.stat.name === 'hp')?.base_stat || 0,
          attack: detailData.stats.find((s) => s.stat.name === 'attack')?.base_stat || 0,
          defense: detailData.stats.find((s) => s.stat.name === 'defense')?.base_stat || 0,
          special_attack:
            detailData.stats.find((s) => s.stat.name === 'special-attack')?.base_stat || 0,
          special_defense:
            detailData.stats.find((s) => s.stat.name === 'special-defense')?.base_stat || 0,
          speed: detailData.stats.find((s) => s.stat.name === 'speed')?.base_stat || 0,
        },
      };

      results.push(pokemonInfo);

      // Small delay between requests
      await delay(DELAY_MS);
    } catch (error) {
      console.error(`Failed to fetch data for ${pokemon.name}: ${error.message}`);
      // Continue with next Pokemon
    }
  }

  return results;
}

async function fetchAllPokemonData() {
  console.log('Fetching Pokemon list...');

  try {
    // Get the list of all Pokemon (limit to first 1000 for initial run)
    const pokemonList = await fetchData('https://pokeapi.co/api/v2/pokemon?limit=1000');
    console.log(`Found ${pokemonList.results.length} Pokemon to process`);

    const allPokemonData = [];

    // Process in batches
    for (let i = 0; i < pokemonList.results.length; i += BATCH_SIZE) {
      console.log(
        `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pokemonList.results.length / BATCH_SIZE)}`,
      );

      const batchResults = await processPokemonBatch(pokemonList.results, i, BATCH_SIZE);
      allPokemonData.push(...batchResults);

      // Save intermediate progress
      if (allPokemonData.length % 100 === 0) {
        const tempData = [...allPokemonData].sort((a, b) => a.id - b.id);
        fs.writeFileSync(
          OUTPUT_FILE.replace('.json', '-temp.json'),
          JSON.stringify(tempData, null, 2),
        );
        console.log(`Progress saved: ${allPokemonData.length} Pokemon processed`);
      }

      // Longer delay between batches
      await delay(DELAY_MS * 2);
    }

    // Sort by ID to ensure correct order
    allPokemonData.sort((a, b) => a.id - b.id);

    // Save final data
    const jsonOutput = JSON.stringify(allPokemonData, null, 2);
    fs.writeFileSync(OUTPUT_FILE, jsonOutput);

    console.log(`\nSuccessfully processed ${allPokemonData.length} Pokemon`);
    console.log(`Data saved to: ${OUTPUT_FILE}`);
    console.log(`File size: ${(jsonOutput.length / 1024 / 1024).toFixed(2)} MB`);

    // Summary statistics
    const priceRange = {
      min: Math.min(...allPokemonData.map((p) => p.price)),
      max: Math.max(...allPokemonData.map((p) => p.price)),
      avg: Math.floor(allPokemonData.reduce((sum, p) => sum + p.price, 0) / allPokemonData.length),
    };

    console.log(`\nPrice Statistics:`);
    console.log(`  Min: ${priceRange.min} PokePoints`);
    console.log(`  Max: ${priceRange.max} PokePoints`);
    console.log(`  Avg: ${priceRange.avg} PokePoints`);

    // Clean up temp file
    const tempFile = OUTPUT_FILE.replace('.json', '-temp.json');
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    return allPokemonData;
  } catch (error) {
    console.error('Failed to fetch Pokemon data:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  fetchAllPokemonData().catch((error) => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { fetchAllPokemonData };

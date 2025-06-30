# CKB-JS Pokemon

A blockchain-based Pokemon NFT gaming application built on the CKB (Nervos Network) blockchain.

## Pokemon Pricing

Pokemon prices are calculated based on their total base stats (HP + Attack + Defense + Special Attack + Special Defense + Speed):

| Tier | Base Stats | Price | Examples |
|------|------------|-------|----------|
| Legendary | > 600 | 5000 PokePoints | Mewtwo, Lugia, Ho-Oh |
| High | 501-600 | 3000 PokePoints | Venusaur, Charizard, Blastoise |
| Mid | 401-500 | 2000 PokePoints | Ivysaur, Charmeleon, Wartortle |
| Low-Mid | 301-400 | 1500 PokePoints | Bulbasaur, Charmander, Squirtle |
| Base | ≤ 300 | 1000 PokePoints | Caterpie, Weedle, Magikarp |

## Getting Started

Build on-chain script:

```bash
pnpm build
```

Test on-chain script:

```bash
pnpm test
```

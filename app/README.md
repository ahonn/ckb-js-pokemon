# Pokemon NFT Collection Platform - Frontend

A modern React/Next.js frontend application for the Pokemon NFT collection platform on CKB blockchain. Users can purchase Pokemon NFTs using PokePoints and manage their collection.

## 🚀 Overview

This Next.js application provides a user-friendly interface for:
- **Pokemon Shop**: Browse and purchase Pokemon NFTs with PokePoints
- **My Pokemon**: View and manage your Pokemon collection
- **PokePoint Exchange**: Convert CKB to PokePoints for purchases
- **Wallet Integration**: Connect CKB wallets using CKB-CCC

## 🛠️ Tech Stack

- **Next.js 15**: React framework with App Router
- **React 18**: UI library with hooks
- **TypeScript 5**: Type-safe development
- **CKB-CCC**: CKB blockchain connector and React hooks
- **Tailwind CSS 4**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **PokeAPI**: Pokemon data and images via `pokedex-promise-v2`

## 🎮 Key Features

- **Pokemon Shop**: Browse and purchase Pokemon NFTs with infinite scroll and responsive grid layout
- **My Pokemon Collection**: View owned Pokemon NFTs with beautiful card layout
- **PokePoint Exchange**: Convert CKB to PokePoints at 10:1 ratio (200 CKB minimum)
- **Wallet Integration**: Multiple CKB wallet support with automatic detection
- **Real-time Updates**: Live balance updates and transaction feedback
- **Responsive Design**: 1-5 column grid layout based on screen size

## ⚙️ Configuration

Contract addresses and settings are in `app/config/contracts.ts`:
- **PokePoint Exchange Rate**: 10 CKB = 1 PokePoint
- **Minimum Exchange**: 200 CKB (20 PokePoints)
- **Network**: CKB Testnet (`https://testnet.ckb.dev`)

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

**Requirements**: Node.js 18+, pnpm
**Development Server**: `http://localhost:3000`
**Configuration**: All settings in `config/contracts.ts` (no environment variables needed)

## 🔗 Blockchain Integration

Uses CKB-CCC for wallet connection and blockchain interactions:
- **Custom Hooks**: `usePokemonData`, `useOwnedPokemon`, `usePokePointBalance`, `usePokemonPurchase`
- **Transaction Building**: Auto-complete inputs and fees with CKB-CCC
- **Real-time Updates**: Live balance and collection updates

## 📄 License

This frontend application is part of the CKB-JS Pokemon project and follows the same license terms.
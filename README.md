# CKB-JS Pokemon

A blockchain-based Pokemon NFT collection platform built on the CKB (Nervos Network) blockchain using CKB-JS-VM smart contracts.

## 🎴 Overview

This project implements a Pokemon NFT collection platform where users can:
- Purchase Pokemon NFTs using PokePoints (custom token system)
- Build their Pokemon collection with varying rarities and prices
- Manage their Pokemon collection through a modern React web interface

## 🏗️ Project Components

- **[Frontend App](app/README.md)**: Next.js application with React components and CKB wallet integration
- **[PokePoint Contract](contracts/poke-point/README.md)**: Custom token contract for platform currency (10 CKB = 1 PokePoint)
- **[Pokemon Contract](contracts/pokemon/README.md)**: NFT contract for Pokemon collectibles with integrated pricing

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build smart contracts
pnpm build:contracts

# Start frontend development server
pnpm dev
```

**Requirements**: Node.js 18+, pnpm
**Development Server**: `http://localhost:3000`

## 🔧 Development Commands

```bash
# Frontend
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm lint                   # Run linting

# Smart Contracts
pnpm build:contracts        # Build all contracts
pnpm test:contracts         # Run contract tests
pnpm clean:contracts        # Clean contract builds

# Utilities
pnpm issue-pokemon          # Issue Pokemon NFTs (requires deployed contracts)
```

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)**: Complete smart contract deployment instructions
- **[Frontend App](app/README.md)**: React/Next.js application details
- **[PokePoint Contract](contracts/poke-point/README.md)**: Token contract implementation
- **[Pokemon Contract](contracts/pokemon/README.md)**: NFT contract implementation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ on the CKB blockchain
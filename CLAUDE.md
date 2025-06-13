# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a CKB (Nervos) blockchain smart contract project using ckb-js-vm, which allows writing smart contracts in JavaScript/TypeScript that compile to bytecode and run on the CKB blockchain. The project appears to be building Pokemon-related functionality with a "poke-point" contract.

## Key Commands

### Build Commands
```bash
# Build all contracts in the monorepo
pnpm build

# Build specific contract
cd contracts/poke-point && pnpm build

# Clean build artifacts
pnpm clean
```

### Testing Commands
```bash
# Run all tests
pnpm test

# Run tests for specific contract
cd contracts/poke-point && pnpm test

# Run a single test file
cd contracts/poke-point && pnpm test tests/index.test.ts

# Run tests matching a pattern
cd contracts/poke-point && pnpm test -t "specific test description"
```

### Development Commands
```bash
# Run linting
cd contracts/poke-point && pnpm lint

# Format code
pnpm format

# Debug contract with ckb-debugger
cd contracts/poke-point && pnpm start
```

## Architecture

### Technology Stack
- **Blockchain**: Nervos CKB
- **VM**: ckb-js-vm (JavaScript VM for CKB)
- **Language**: TypeScript (compiles to ES2022 for QuickJS runtime)
- **Build Pipeline**: TypeScript → JavaScript (esbuild) → Bytecode (ckb-debugger)
- **Package Manager**: pnpm with workspaces

### Project Structure
- `/contracts/` - Smart contracts directory (monorepo workspace)
- `/contracts/poke-point/` - Main contract implementation
  - `/src/index.ts` - Contract entry point
  - `/tests/` - Jest tests using ckb-testtool
  - `/dist/` - Compiled output (index.js and index.bc)

### Contract Development Pattern
1. Import CKB bindings and core utilities from `@ckb-js-std/*`
2. Implement main function that processes the script
3. Exit with status code using `bindings.exit(main())`
4. Test using ckb-testtool with mock cells and transactions

### Testing Pattern
Tests use ckb-testtool to:
1. Deploy CKB-JS-VM binary
2. Deploy the compiled JavaScript script
3. Create mock transactions with proper cell structure
4. Verify transaction execution

### Key Dependencies
- `@ckb-js-std/bindings` - Low-level CKB blockchain interaction
- `@ckb-js-std/core` - High-level abstractions for CKB development
- `@ckb-ccc/core` - CKB Common Chain utilities
- `ckb-testtool` - Testing framework for CKB contracts
- `ckb-js-vm` - JavaScript VM for executing contracts on CKB

### Important Notes
- TypeScript must target ES2022 for QuickJS compatibility
- ESLint uses CKB-specific rules from `@ckb-js-std/eslint-plugin`
- Contracts compile to `.bc` (bytecode) files that run on ckb-js-vm
- The project uses devbox for reproducible development environment
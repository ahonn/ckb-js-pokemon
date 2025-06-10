# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CKB (Nervos) blockchain JavaScript Pokemon on-chain script project powered by ckb-js-vm. It uses a monorepo structure with pnpm workspaces.

## Commands

### Build
- `pnpm build` - Build all packages (compiles TypeScript to JavaScript and generates bytecode)
- Individual package build: `cd packages/on-chain-script && pnpm build`

### Test
- `pnpm test` - Run all tests
- Individual package test: `cd packages/on-chain-script-tests && pnpm test`

### Development
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean build artifacts

### Debug Script
- `cd packages/on-chain-script && pnpm start` - Run the script in CKB debugger

## Architecture

### Monorepo Structure
- Uses pnpm workspaces with packages in `/packages/*`
- Two main packages:
  - `on-chain-script`: The actual CKB blockchain script
  - `on-chain-script-tests`: Unit tests for the script

### On-Chain Script Build Process
1. TypeScript is compiled and bundled using esbuild
2. JavaScript output is converted to bytecode (.bc) using ckb-js-vm
3. The bytecode runs on CKB blockchain via ckb-js-vm

### Key Dependencies
- `@ckb-js-std/bindings` and `@ckb-js-std/core`: CKB JavaScript standard library
- `ckb-testtool`: Testing framework for CKB scripts
- `@ckb-ccc/core`: CKB Common Chain Connector for transaction handling

### Testing Approach
- Tests use Jest with ts-jest
- Scripts are deployed and executed in a mock CKB environment
- Test script deploys the JS VM, the script bytecode, and mock cells
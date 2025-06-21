# PokePoint Contract

A CKB-JS script implementing a point-based token system on CKB. PokePoints serve as the currency for purchasing Pokemon NFTs.

## Overview

Supports three operations: **Mint** (create new points), **Transfer** (move points between users), and **Burn** (destroy points to recover CKB).

### PokePoint

- Cell Structure:

```
data:
    <amount: uint128>
type:
    code_hash: <code_hash to ckb-js-vm cell>
    hash_type: <hash_type>
    args:
        <ckb-js-vm args, 2 bytes>
        <code_hash to javascript code cell, 32 bytes>
        <hash_type to javascript code cell, 1 byte>
        <target_lock_hash, 32 bytes>
        <ckb_per_point, 8 bytes>
lock:
    <user_defined>
```

- Minting Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <normal CKB cells>
Outputs:
    PokePoint Cell:
        Capacity: N CKBytes (>= amount × ckb_per_point)
        Type: <PokePoint type script>
        Lock: <user_defined>
        Data: <amount: uint128>
Witnesses:
    <valid signature>
```

- Transfer Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <PokePoint cells with total M points>
Outputs:
    <PokePoint cells with total M points>
Witnesses:
    <valid signatures>
```

- Burn Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <PokePoint cells>
Outputs:
    <normal CKB cells (no PokePoint outputs)>
Witnesses:
    <valid signatures>
```

## Development

```bash
npm install
npm run build
npm run test
```

## Integration

Works with Pokemon contract for NFT purchases. Pokemon contract validates PokePoint type script and balances during purchase transactions.

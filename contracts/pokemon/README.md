# Pokemon Contract

A CKB-JS script implementing Pokemon NFTs that can be issued, purchased with PokePoints, and transferred between users.

## Overview

Supports three operations: **Issue** (create Pokemon NFTs), **Purchase** (buy with PokePoints), and **Transfer** (move between users).

### Pokemon

- Cell Structure:

```
data:
    <price: uint16>
    <point_amount: uint128>
type:
    code_hash: <code_hash to ckb-js-vm cell>
    hash_type: <hash_type>
    args:
        <ckb-js-vm args, 2 bytes>
        <code_hash to javascript code cell, 32 bytes>
        <hash_type to javascript code cell, 1 byte>
        <issuer_lock_hash, 32 bytes>
        <pokepoint_type_hash, 32 bytes>
lock:
    <user_defined>
```

- Issue Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <Pokemon Type Cell>
Inputs:
    <normal CKB cells from authorized issuer>
Outputs:
    Pokemon Cell:
        Capacity: N CKBytes
        Type: <Pokemon type script>
        Lock: <issuer_defined>
        Data: <price: uint16, point_amount: uint128>
Witnesses:
    <valid issuer signature>
```

- Purchase Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <Pokemon Type Cell>
    <PokePoint Type Cell>
Inputs:
    <Pokemon cell being purchased>
    <PokePoint cells with >= price points>
Outputs:
    Pokemon Cell:
        Capacity: N CKBytes
        Type: <Pokemon type script>
        Lock: <buyer_lock>
        Data: <same price and point_amount>
    <PokePoint change cells (optional)>
Witnesses:
    <valid signatures>
```

- Transfer Transaction

```
CellDeps:
    <CKB-JS-VM Type Cell>
    <Pokemon Type Cell>
Inputs:
    <Pokemon cell from current owner>
Outputs:
    Pokemon Cell:
        Capacity: N CKBytes
        Type: <Pokemon type script>
        Lock: <new_owner_lock>
        Data: <same price and point_amount>
Witnesses:
    <valid owner signature>
```

## Development

```bash
npm install
npm run build
npm run test
```

## Integration

Integrates with PokePoint contract for purchases. Validates PokePoint type script and ensures sufficient balance for Pokemon price during purchase transactions.

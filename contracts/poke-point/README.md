# PokePoint Contract

A CKB-JS smart contract implementing a point-based token system on CKB blockchain. PokePoints serve as the currency for purchasing Pokemon NFTs and can be backed by CKB at a configurable exchange rate.

## Overview

The PokePoint contract supports three main operations:
- **Mint**: Create new PokePoints by depositing CKB
- **Transfer**: Move PokePoints between users (including consumption/burning)
- **Burn**: Destroy PokePoints and recover CKB

## Cell Structure

### PokePoint Cell
```
Data:
    <amount: uint128>  // 16 bytes, little-endian
Type Script:
    code_hash: <code_hash to ckb-js-vm cell>
    hash_type: <hash_type>
    args:
        <ckb-js-vm args, 2 bytes>
        <code_hash to javascript code cell, 32 bytes>
        <hash_type to javascript code cell, 1 byte>
        <target_lock_hash, 32 bytes>
        <ckb_per_point, 8 bytes>  // Exchange rate: CKB per point
Lock Script:
    <user_defined>
```

### Script Args Structure
- **Bytes 0-1**: CKB-JS-VM args (2 bytes)
- **Bytes 2-33**: Code hash to JavaScript code cell (32 bytes)
- **Bytes 34**: Hash type to JavaScript code cell (1 byte)
- **Bytes 35-66**: Target lock hash (32 bytes)
- **Bytes 67-74**: CKB per point exchange rate (8 bytes, uint64)

## Transaction Types

### Mint Transaction
Creates new PokePoints by depositing CKB at the configured exchange rate.

**Requirements:**
- No PokePoint inputs (creation transaction)
- Exactly one PokePoint output
- Cell capacity must exactly match `amount × ckb_per_point`
- Amount must be greater than 0

**Structure:**
```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <Normal CKB cells>
Outputs:
    PokePoint Cell:
        Capacity: amount × ckb_per_point (CKBytes)
        Type: <PokePoint type script>
        Lock: <user_defined>
        Data: <amount: uint128>
Witnesses:
    <Valid signatures>
```

### Transfer Transaction
Moves PokePoints between users. Supports consumption (burning) where output total can be less than input total.

**Requirements:**
- At least one PokePoint input
- Zero or more PokePoint outputs
- Input total ≥ Output total (consumption allowed)
- Each output must have capacity exactly matching `amount × ckb_per_point`
- No output can have zero amount

**Structure:**
```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <PokePoint cells with total M points>
Outputs:
    <PokePoint cells with total N points where N ≤ M>
    <Optional: other cells>
Witnesses:
    <Valid signatures>
```

### Burn Transaction
Destroys all PokePoints and recovers the backing CKB.

**Requirements:**
- At least one PokePoint input
- No PokePoint outputs
- Returns CKB capacity to normal cells

**Structure:**
```
CellDeps:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <PokePoint cells>
Outputs:
    <Normal CKB cells (no PokePoint outputs)>
Witnesses:
    <Valid signatures>
```

## Key Features

### Exact Capacity Matching
Each PokePoint cell must have capacity that exactly matches `amount × ckb_per_point`. This ensures:
- No excess CKB can be stored in PokePoint cells
- Consistent backing ratio across all cells
- Prevents capacity manipulation attacks

### Flexible Transfer Model
The transfer validation allows consumption (burning) of PokePoints:
- Input total ≥ Output total
- Difference represents consumed/burned PokePoints
- Enables integration with other contracts (like Pokemon purchases)

### Configurable Exchange Rate
The `ckb_per_point` parameter in script args allows:
- Different exchange rates for different deployments
- Fixed rate per contract instance
- Transparent backing calculation

## Development

### Build
```bash
pnpm install
pnpm run build
```

### Test
```bash
pnpm run test
```

### Deploy
```bash
# Configure deployment.toml with your parameters
ckb-cli deploy gen-txs --from-address <address> --deployment-config deployment.toml --info-file migrations/deployment.json --migration-dir migrations
ckb-cli deploy sign-txs --info-file migrations/deployment.json --from-account <address> --add-signatures
ckb-cli deploy apply-txs --info-file migrations/deployment.json --migration-dir migrations
```

## Integration Examples

### Pokemon Purchase Integration
PokePoints can be consumed in Pokemon purchase transactions:
1. Pokemon contract validates PokePoint inputs have sufficient balance
2. PokePoint contract allows consumption (input > output)
3. Excess PokePoints are burned in the transaction

### Exchange Rate Examples
- **1 CKB = 1 PokePoint**: `ckb_per_point = 100000000` (1 CKB in shannon)
- **10 CKB = 1 PokePoint**: `ckb_per_point = 1000000000` (10 CKB in shannon)
- **0.1 CKB = 1 PokePoint**: `ckb_per_point = 10000000` (0.1 CKB in shannon)

## Security Considerations

1. **Capacity Validation**: Strict capacity-to-points ratio prevents inflation
2. **Amount Validation**: Zero amounts are rejected to prevent dust attacks
3. **Transaction Type Detection**: Automatic detection prevents invalid state transitions
4. **Overflow Protection**: Uses uint128 for amounts, uint64 for capacity calculations

## Error Codes

The contract returns specific error codes:
- `0`: Success
- `1`: Validation failure (various reasons logged)

Common failure reasons:
- Zero amount in mint or transfer
- Capacity mismatch (not exact multiple of ckb_per_point)
- Multiple outputs in mint transaction
- Invalid cell data format (not 16 bytes)
- Invalid script args format

## Testing

The contract includes comprehensive tests covering:
- Valid mint, transfer, and burn scenarios
- Edge cases (zero amounts, capacity mismatches)
- Error conditions (invalid formats, wrong transaction types)
- Cell aggregation and fragmentation scenarios
- Exact capacity matching validation

Run tests with:
```bash
pnpm test
```

## License

This contract is part of the CKB-JS Pokemon project and follows the same license terms.
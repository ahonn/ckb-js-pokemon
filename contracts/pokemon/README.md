# Pokemon Contract

A CKB-JS smart contract implementing Pokemon NFTs on CKB blockchain. Pokemon can be issued by authorized issuers, purchased with PokePoints, transferred between users, and burned by authorized parties.

## Overview

The Pokemon contract supports four main operations:
- **Issue**: Create new Pokemon NFTs (issuer only)
- **Purchase**: Buy Pokemon NFTs using PokePoints
- **Transfer**: Move Pokemon NFTs between users
- **Burn**: Destroy Pokemon NFTs (issuer only)

## Cell Structure

### Pokemon Cell
```
Data:
    <pokemonId: uint128>  // 16 bytes, Pokemon ID
    <price: uint16>       // 2 bytes, price in PokePoints
Type Script:
    code_hash: <code_hash to ckb-js-vm cell>
    hash_type: <hash_type>
    args:
        <ckb-js-vm args, 2 bytes>
        <code_hash to javascript code cell, 32 bytes>
        <hash_type to javascript code cell, 1 byte>
        <issuer_lock_hash, 32 bytes>
        <pokepoint_type_hash, 32 bytes>
Lock Script:
    <user_defined>
```

### Script Args Structure
- **Bytes 0-1**: CKB-JS-VM args (2 bytes)
- **Bytes 2-33**: Code hash to JavaScript code cell (32 bytes)
- **Bytes 34**: Hash type to JavaScript code cell (1 byte)
- **Bytes 35-66**: Issuer lock hash (32 bytes)
- **Bytes 67-98**: PokePoint type hash (32 bytes)

### Pokemon Data Format
- **pokemonId**: uint128 (16 bytes) - Unique identifier for the Pokemon
- **price**: uint16 (2 bytes) - Price in PokePoints required to purchase
- **Total**: 18 bytes cell data

## Transaction Types

### Issue Transaction
Creates new Pokemon NFTs. Only authorized issuers can create Pokemon.

**Requirements:**
- No Pokemon inputs (creation transaction)
- At least one Pokemon output
- Issuer's lock hash must match the expected issuer in contract args
- Each Pokemon must have unique ID within the transaction
- Pokemon ID and price must be greater than 0
- Supports batch issuance (multiple Pokemon outputs)

**Structure:**
```
CellDeps:
    <CKB-JS-VM Type Cell>
    <Pokemon Type Cell>
Inputs:
    <Normal CKB cells from authorized issuer>
Outputs:
    Pokemon Cell(s):
        Capacity: N CKBytes
        Type: <Pokemon type script>
        Lock: <user_defined>
        Data: <pokemonId: uint128, price: uint16>
Witnesses:
    <Valid issuer signature>
```

### Purchase Transaction
Allows users to buy Pokemon NFTs using PokePoints.

**Requirements:**
- Exactly one Pokemon input and output
- Pokemon data (ID and price) must remain unchanged
- Sufficient PokePoint inputs to cover the price
- Required PokePoints must be sent to the issuer
- PokePoint type script must match contract args
- Supports change outputs for excess PokePoints

**Structure:**
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
        Data: <same pokemonId and price>
    <PokePoint cell to issuer with required payment>
    <Optional: PokePoint change cells to buyer>
Witnesses:
    <Valid signatures>
```

### Transfer Transaction
Moves Pokemon NFTs between users.

**Requirements:**
- Exactly one Pokemon input and output
- Pokemon data (ID and price) must remain unchanged
- Ownership must actually change (different lock scripts)
- No PokePoint inputs (distinguishes from purchase)

**Structure:**
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
        Data: <same pokemonId and price>
Witnesses:
    <Valid owner signature>
```

### Burn Transaction
Destroys Pokemon NFTs and recovers CKB capacity.

**Requirements:**
- At least one Pokemon input
- No Pokemon outputs
- Only authorized by issuer (issuer's lock must be in inputs or outputs)
- Pokemon IDs must be valid (non-zero)
- Supports batch burning (multiple Pokemon inputs)

**Structure:**
```
CellDeps:
    <CKB-JS-VM Type Cell>
    <Pokemon Type Cell>
Inputs:
    <Pokemon cells to burn>
    <Cell with issuer's lock (for authorization)>
Outputs:
    <Normal CKB cells (no Pokemon outputs)>
Witnesses:
    <Valid issuer signature>
```

## Key Features

### Issuer Authorization
- Only the designated issuer can create and burn Pokemon NFTs
- Issuer lock hash is embedded in contract args
- Issue validation checks input lock hash against expected issuer
- Burn validation requires issuer's lock in transaction inputs or outputs

### Transaction Type Detection
Automatic detection based on inputs and outputs:
- **Issue**: No Pokemon inputs + Pokemon outputs
- **Purchase**: Pokemon inputs + Pokemon outputs + PokePoint inputs
- **Transfer**: Pokemon inputs + Pokemon outputs + No PokePoint inputs
- **Burn**: Pokemon inputs + No Pokemon outputs

### Data Integrity
- Pokemon ID and price are immutable after issuance
- Transfer and purchase operations preserve Pokemon data
- Validation ensures data consistency across operations

### PokePoint Integration
- Purchase transactions validate PokePoint type script
- Required payment must be sent to issuer
- Supports partial payments and change outputs
- Integrates with PokePoint contract consumption model

### Batch Operations
- Issue: Multiple Pokemon can be created in one transaction
- Burn: Multiple Pokemon can be destroyed in one transaction
- Each Pokemon must have unique ID within batch operations

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

### Pokemon Purchase Flow
1. User selects Pokemon to purchase
2. Transaction includes:
   - Pokemon input (from shop/issuer)
   - PokePoint inputs (from buyer)
   - Pokemon output (to buyer)
   - PokePoint output (payment to issuer)
   - Optional PokePoint change (back to buyer)

### Marketplace Integration
- Pokemon can be listed by changing lock script to marketplace contract
- Marketplace handles escrow and payment distribution
- Transfer validation ensures legitimate ownership changes

## Security Considerations

1. **Issuer Authorization**: Only designated issuer can create/burn Pokemon
2. **Data Immutability**: Pokemon ID and price cannot be modified
3. **Ownership Validation**: Transfer requires actual ownership change
4. **Payment Validation**: Purchase ensures correct payment to issuer
5. **Type Script Validation**: PokePoint integration validates correct token contract
6. **Batch Safety**: Unique ID enforcement prevents duplication in batch operations

## Error Codes

The contract returns specific error codes:
- `0`: Success
- `1`: Validation failure (various reasons logged)

Common failure reasons:
- Unauthorized issuer (issue/burn operations)
- Invalid Pokemon data (zero ID or price)
- Duplicate Pokemon IDs in batch operations
- Insufficient PokePoints for purchase
- Pokemon data modification during transfer/purchase
- Invalid cell data format (not 18 bytes)
- Missing required payments to issuer

## Testing

The contract includes comprehensive tests covering:
- Valid issue, purchase, transfer, and burn scenarios
- Authorization failures (unauthorized issuers)
- Data integrity validation
- Batch operations (multiple Pokemon per transaction)
- PokePoint integration and payment validation
- Edge cases and error conditions

Run tests with:
```bash
pnpm test
```

## Pokemon Data Examples

### Common Pokemon IDs and Prices
```javascript
// Starter Pokemon
{ pokemonId: 1n, price: 1500 }   // Bulbasaur
{ pokemonId: 4n, price: 1500 }   // Charmander
{ pokemonId: 7n, price: 1500 }   // Squirtle

// Popular Pokemon
{ pokemonId: 25n, price: 2000 }  // Pikachu
{ pokemonId: 150n, price: 5000 } // Mewtwo
{ pokemonId: 151n, price: 5000 } // Mew

// Evolved Forms
{ pokemonId: 6n, price: 3000 }   // Charizard
{ pokemonId: 9n, price: 3000 }   // Blastoise
{ pokemonId: 3n, price: 3000 }   // Venusaur
```

## License

This contract is part of the CKB-JS Pokemon project and follows the same license terms.
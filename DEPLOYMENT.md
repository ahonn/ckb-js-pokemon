# CKB Smart Contract Deployment Guide

This document provides a complete guide for deploying smart contracts to the CKB network using `ckb-cli`.

## Prerequisites

### 1. Install ckb-cli
```bash
# Install via Cargo
cargo install ckb-cli

# Verify installation
ckb-cli --version
```

### 2. Create CKB Account
```bash
# Create new account
ckb-cli account new

# List accounts
ckb-cli account list
```

After creating an account, you'll get:
- **Mainnet address**: `ckb1qzda0cr08...` (mainnet address)
- **Testnet address**: `ckt1qzda0cr08...` (testnet address)
- **Lock arg**: `0xc13d8e949c0...` (for configuration file)

### 3. Get Test Tokens
- Visit CKB testnet faucet: https://testnet.ckb.dev/
- Request test CKB using your testnet address

```bash
# Check balance
ckb-cli --url https://testnet.ckb.dev wallet get-capacity --address <testnet-address>
```

## Contract Preparation

### 1. Compile Contract
Ensure your contract is compiled and bytecode is generated:
```bash
cd contracts/<contract-name>
npm run build
```

After successful compilation, `index.bc` file will be generated in the `dist/` directory.

### 2. Configure Deployment File
Create or modify `deployment.toml` file:

```toml
[[cells]]
name = "<contract-name>"
enable_type_id = true 
location = { file = "dist/index.bc" }

[[dep_groups]]
name = "<contract-name>_dep_group"
cells = [
  "<contract-name>"
]

[lock]
code_hash = "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8"
args = "<your-lock-arg>"
hash_type = "type"
```

**Important Configuration Notes**:
- `<contract-name>`: Replace with actual contract name (e.g., `poke_point`, `pokemon`)
- `<your-lock-arg>`: Replace with your account lock_arg (obtained when creating account)
- `code_hash`: Standard code_hash for secp256k1_blake160 lock script

## Deployment Process

### 1. Generate Deployment Transactions
```bash
mkdir -p migrations

ckb-cli --url https://testnet.ckb.dev deploy gen-txs \
  --from-address <testnet-address> \
  --fee-rate 1000 \
  --deployment-config deployment.toml \
  --info-file migrations/deployment.json \
  --migration-dir migrations
```

Successful output example:
```
==== Cell transaction ====
[cell] NewAdded , name: <contract-name>, old-capacity: 0.0, new-capacity: 32041.0
> old total capacity: 0.0 (CKB) (removed items not included)
> new total capacity: 32041.0 (CKB)
[transaction fee]: 0.00032464
==== DepGroup transaction ====
[dep_group] NewAdded , name: <contract-name>_dep_group, old-capacity: 0.0, new-capacity: 101.0
> old total capacity: 0.0 (CKB) (removed items not included)
> new total capacity: 101.0 (CKB)
[transaction fee]: 0.00000504
status: success
```

### 2. Sign Transactions
```bash
ckb-cli --url https://testnet.ckb.dev deploy sign-txs \
  --info-file migrations/deployment.json \
  --from-account <testnet-address> \
  --add-signatures
```

Enter your account password when prompted, and signature information will be displayed.

### 3. Submit Transactions
```bash
ckb-cli --url https://testnet.ckb.dev deploy apply-txs \
  --info-file migrations/deployment.json \
  --migration-dir migrations
```

Successful output example:
```
cell_tx: 0xa518abeb17383007390875d5bee1926f1ee8682fe2ef8e4f903b3f326e7ac672
dep_group_tx: 0x7070e374417463427846ecff9d90f2399263163ff86b9c955745c138de4b3af4
> [send cell transaction]: 0xa518abeb17383007390875d5bee1926f1ee8682fe2ef8e4f903b3f326e7ac672
> [send dep group transaction]: 0x7070e374417463427846ecff9d90f2399263163ff86b9c955745c138de4b3af4
```

## Verify Deployment

### 1. Query Transaction Status
```bash
ckb-cli --url https://testnet.ckb.dev rpc get_transaction --hash <cell-tx-hash>
```

### 2. Check Deployment Information
After successful deployment, contract information is saved in `migrations/deployment.json`, including:
- Contract type_id (for frontend reference)
- Transaction hashes
- Cell capacity information

## Network Configuration

### Testnet
- RPC URL: `https://testnet.ckb.dev`
- Faucet: https://testnet.ckb.dev/

### Mainnet
- RPC URL: `https://mainnet.ckb.dev` 
- **Note**: Mainnet deployment requires real CKB, please proceed with caution

## Troubleshooting

### 1. "invalid length" Error
- Check if lock_arg format in deployment.toml is correct
- Ensure lock_arg starts with `0x` and is 42 characters long

### 2. "Missing signatures" Error  
- Make sure to use `--add-signatures` parameter
- Verify account password is correct

### 3. Insufficient Balance
- Ensure account has enough CKB to pay deployment fees
- Single contract deployment typically requires 30,000+ CKB capacity

### 4. Contract File Not Found
- Make sure you've run `npm run build` to compile the contract
- Check if `dist/index.bc` file exists

## Deployment Script Example

You can create an automated deployment script:

```bash
#!/bin/bash
set -e

CONTRACT_NAME=$1
TESTNET_ADDRESS=$2

if [ -z "$CONTRACT_NAME" ] || [ -z "$TESTNET_ADDRESS" ]; then
    echo "Usage: $0 <contract-name> <testnet-address>"
    exit 1
fi

echo "Deploying $CONTRACT_NAME..."

cd contracts/$CONTRACT_NAME

# 1. Generate transactions
ckb-cli --url https://testnet.ckb.dev deploy gen-txs \
  --from-address $TESTNET_ADDRESS \
  --fee-rate 1000 \
  --deployment-config deployment.toml \
  --info-file migrations/deployment.json \
  --migration-dir migrations

# 2. Sign transactions
ckb-cli --url https://testnet.ckb.dev deploy sign-txs \
  --info-file migrations/deployment.json \
  --from-account $TESTNET_ADDRESS \
  --add-signatures

# 3. Submit transactions
ckb-cli --url https://testnet.ckb.dev deploy apply-txs \
  --info-file migrations/deployment.json \
  --migration-dir migrations

echo "Deployment completed for $CONTRACT_NAME"
```

Usage:
```bash
chmod +x deploy.sh
./deploy.sh poke_point ckt1qzda0cr08...
```

## Security Reminders

1. **Private Key Security**: Keep your account password secure, never enter it in public environments
2. **Test First**: Always test on testnet first, confirm everything works before deploying to mainnet
3. **Backup Important Files**: Backup deployment.json files as they contain important contract address information
4. **Fee Estimation**: Mainnet deployment fees are significant, estimate required CKB amount in advance

## Multi-Contract Deployment

For projects with multiple contracts (like this Pokemon project):

### 1. Deploy Dependencies First
```bash
# Deploy PokePoint contract first (as Pokemon depends on it)
cd contracts/poke-point
# Follow deployment steps...

# Then deploy Pokemon contract
cd ../pokemon
# Follow deployment steps...
```

### 2. Update Contract References
After deploying dependency contracts, update the dependent contract's configuration to reference the deployed contracts if needed.

### 3. Batch Deployment Script
```bash
#!/bin/bash
set -e

TESTNET_ADDRESS=$1

if [ -z "$TESTNET_ADDRESS" ]; then
    echo "Usage: $0 <testnet-address>"
    exit 1
fi

CONTRACTS=("poke-point" "pokemon")

for contract in "${CONTRACTS[@]}"; do
    echo "Deploying $contract..."
    cd contracts/$contract
    
    # Generate, sign, and submit transactions
    ckb-cli --url https://testnet.ckb.dev deploy gen-txs \
      --from-address $TESTNET_ADDRESS \
      --fee-rate 1000 \
      --deployment-config deployment.toml \
      --info-file migrations/deployment.json \
      --migration-dir migrations
    
    ckb-cli --url https://testnet.ckb.dev deploy sign-txs \
      --info-file migrations/deployment.json \
      --from-account $TESTNET_ADDRESS \
      --add-signatures
    
    ckb-cli --url https://testnet.ckb.dev deploy apply-txs \
      --info-file migrations/deployment.json \
      --migration-dir migrations
    
    echo "$contract deployed successfully"
    cd ../..
done

echo "All contracts deployed successfully"
```

## Related Resources

- [CKB CLI Official Documentation](https://github.com/nervosnetwork/ckb-cli)
- [CKB Developer Documentation](https://docs.nervos.org/)
- [CKB Testnet Explorer](https://pudge.explorer.nervos.org/)
- [CKB-JS-VM Documentation](https://github.com/nervosnetwork/ckb-js-vm)
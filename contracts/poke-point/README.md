# PokePoint Contract

PokePoint 是一个基于 CKB JavaScript VM 的智能合约，专门用于积分代币的铸造功能。

## 合约设计

### Cell 结构

```
data:
    <amount: uint128>              // 积分数量
type:
   code_hash: <ckb-js-vm 合约哈希>
   hash_type: <哈希类型>
   args: 
       <ckb-js-vm args, 2 bytes>               // CKB-JS-VM 参数
       <code_hash to javascript code cell, 32 bytes>  // JS 代码哈希
       <hash_type to javascript code cell, 1 byte>     // JS 代码哈希类型
       <target_lock_hash, 32 bytes>            // 目标锁定脚本哈希
       <ckb_per_point, variable length>        // 每积分对应的 CKB 数量
lock:
    <user_defined>                 // 用户定义的锁定脚本
```

### 铸造交易

```
CellDep:
    <CKB-JS-VM Type Cell>
    <PokePoint Type Cell>
Inputs:
    <普通 CKB cells>
Outputs:
    PokePoint Cell:
        Capacity: N CKBytes
        Type: PokePoint 类型脚本
        Lock: 用户定义锁定脚本
        Data: <amount: uint128>
    Target Cell:
        Lock: 与 target_lock_hash 匹配的锁定脚本
Witnesses:
    <有效签名>
```

## 合约功能

### 铸造验证 (Minting)
- 验证只有一个输出带有此类型脚本
- 验证目标锁定脚本存在于输出中
- 验证 Cell 容量与积分数量匹配 (`capacity >= amount * ckb_per_point`)

**注意**: 本合约专注于铸造场景，不处理转移/花费逻辑。

## 构建和测试

```bash
# 构建合约
pnpm build

# 运行测试
pnpm test

# 调试合约
pnpm start
```

## 使用示例

### 铸造 PokePoint

1. 创建包含足够 CKB 的输入 Cell
2. 创建 PokePoint 输出 Cell，容量 = 积分数量 × 每积分 CKB
3. 创建与 `target_lock_hash` 匹配的目标输出 Cell
4. 提交交易

### 转移 PokePoint

1. 使用现有 PokePoint Cell 作为输入
2. 创建新的 PokePoint 输出 Cell，保持相同积分数量
3. 提交交易

## 安全特性

- **容量验证**: 确保 Cell 容量与积分价值匹配
- **目标验证**: 确保目标锁定脚本存在
- **数量保守**: 转移时保持积分数量不变
- **单一输出**: 铸造时只允许一个 PokePoint 输出
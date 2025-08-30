# Clause（交易子句）

Clause 是 VeChain 交易的基本组成单元。一个交易可以包含多个 Clause,每个 Clause 代表一个操作,比如转账、调用合约函数等。这种设计让 VeChain 支持在单个交易中执行多个操作,大大提高了效率。

## 核心概念

在 VeChain 中:
- **一个交易 (Transaction)** 可以包含多个 Clause
- **每个 Clause** 代表一个独立的操作
- **所有 Clause** 在同一笔交易中执行,要么全部成功,要么全部失败（原子性）

这种设计的优势:
- 降低交易费用（多个操作只需一次签名）
- 提高效率（一次性完成多个操作）
- 保证原子性（所有操作要么都成功,要么都失败）

## Clause 数据结构

```ts
interface TransactionClause {
  to: string | null;      // 接收地址,创建合约时为 null
  value: string | bigint; // 转账金额（Wei）
  data: string;           // 调用数据（合约调用或部署代码）
}
```

### 字段说明

| 字段    | 类型                 | 说明                                           |
| ------- | -------------------- | ---------------------------------------------- |
| `to`    | `string \| null`     | 目标地址。转账或调用合约时填地址,部署合约时填 `null` |
| `value` | `string \| bigint`   | 转账的 VET 数量,单位是 Wei（1 VET = 10^18 Wei） |
| `data`  | `string`             | 十六进制编码的数据。调用合约时为函数调用数据,部署合约时为字节码 |

## 基本用法

### 1. VET 转账

最常见的操作是转账 VET。

```ts
import { Clause, Address, VET } from '@vechain/sdk-core';

// 转账 1 VET
const clause = Clause.transferVET(
  Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
  VET.of(1) // 1 VET
);

// 转账 0.5 VET
const clause2 = Clause.transferVET(
  Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
  VET.of(0.5)
);

// 使用 Wei 单位（更精确）
const clause3 = Clause.transferVET(
  Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
  '1000000000000000000' // 1 VET = 10^18 Wei
);
```

### 2. VTHO 转账

VTHO 是 VeChain 的 Gas 代币,转账 VTHO 需要调用 VTHO 合约。

```ts
import { Clause, Address, VTHO } from '@vechain/sdk-core';

// VTHO 合约地址（固定）
const VTHO_ADDRESS = '0x0000000000000000000000000000456E65726779';

// 转账 10 VTHO
const clause = Clause.transferVTHO(
  Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
  VTHO.of(10)
);
```

### 3. VIP-180 代币转账

VIP-180 是 VeChain 的代币标准（类似以太坊的 ERC-20）。

```ts
import { Clause, Address } from '@vechain/sdk-core';
import { abi } from '@vechain/sdk-core';

// VIP-180 合约地址（示例）
const tokenAddress = '0x0000000000000000000000000000456E65726779';
const recipient = '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed';
const amount = '1000000000000000000'; // 1 token (18 decimals)

// 手动构造 transfer 函数调用
const clause = {
  to: tokenAddress,
  value: '0',
  data: abi.encodeFunctionInput(
    {
      constant: false,
      inputs: [
        { name: '_to', type: 'address' },
        { name: '_value', type: 'uint256' }
      ],
      name: 'transfer',
      outputs: [{ name: 'success', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    [recipient, amount]
  )
};
```

### 4. 调用合约函数

```ts
import { Clause, abi } from '@vechain/sdk-core';

const contractAddress = '0x...'; // 你的合约地址

// 合约 ABI 定义
const functionABI = {
  constant: false,
  inputs: [
    { name: 'param1', type: 'uint256' },
    { name: 'param2', type: 'address' }
  ],
  name: 'myFunction',
  outputs: [],
  payable: false,
  stateMutability: 'nonpayable',
  type: 'function'
};

// 构造函数调用数据
const callData = abi.encodeFunctionInput(functionABI, [
  123,                                          // param1
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed' // param2
]);

// 创建 Clause
const clause: TransactionClause = {
  to: contractAddress,
  value: '0',      // 不转账 VET
  data: callData
};

// 如果合约函数是 payable 的,可以同时转账
const clauseWithValue: TransactionClause = {
  to: contractAddress,
  value: '1000000000000000000', // 1 VET
  data: callData
};
```

### 5. 部署合约

部署合约时,`to` 字段为 `null`,`data` 字段为合约字节码。

```ts
import { Clause } from '@vechain/sdk-core';

// 合约字节码（编译后的代码）
const bytecode = '0x608060405234801561001057600080fd5b50...';

// 如果合约构造函数有参数,需要将参数编码后追加到字节码
const constructorParams = abi.encodeParameters(
  ['uint256', 'string'],
  [123, 'hello']
);

const clause: TransactionClause = {
  to: null,                           // 部署合约时为 null
  value: '0',
  data: bytecode + constructorParams.slice(2) // 拼接字节码和参数
};
```

## 批量操作

VeChain 的强大之处在于可以在一笔交易中执行多个操作。

### 批量转账

```ts
import { Clause, Address, VET, ThorClient, Transaction, HexUInt } from '@vechain/sdk-core';

// 创建多个转账 Clause
const clauses = [
  Clause.transferVET(Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'), VET.of(1)),
  Clause.transferVET(Address.of('0x9e7911de289c3c856ce7f421034f66b6cde49c39'), VET.of(2)),
  Clause.transferVET(Address.of('0x88b2551c3ed42ca663796c10ce68c88a65f73fe2'), VET.of(3)),
];

// 估算 Gas
const thorClient = ThorClient.at('https://testnet.vechain.org');
const gasResult = await thorClient.gas.estimateGas(
  clauses,
  '0x2669514f9fe96bc7301177ba774d3da8a06cace4' // 发送方地址
);

// 构建并发送交易
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

const signedTx = Transaction.of(txBody).sign(
  HexUInt.of('0xYourPrivateKey').bytes
);

await thorClient.transactions.sendTransaction(signedTx);
```

### 混合操作

一笔交易中可以同时进行转账、调用合约等不同操作。

```ts
const clauses = [
  // 1. 转账 VET
  Clause.transferVET(
    Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
    VET.of(1)
  ),

  // 2. 转账 VTHO
  Clause.transferVTHO(
    Address.of('0x9e7911de289c3c856ce7f421034f66b6cde49c39'),
    VTHO.of(100)
  ),

  // 3. 调用合约函数
  {
    to: '0xContractAddress',
    value: '0',
    data: '0xFunctionCallData'
  },

  // 4. 调用另一个合约
  {
    to: '0xAnotherContractAddress',
    value: '500000000000000000', // 0.5 VET
    data: '0xAnotherFunctionCallData'
  }
];

// 所有操作在一笔交易中完成
```

## 最佳实践

### 1. 使用辅助函数

SDK 提供了便捷的辅助函数,优先使用它们。

```ts
// ✅ 推荐
const clause = Clause.transferVET(address, VET.of(1));

// ❌ 不推荐（虽然可行）
const clause = {
  to: address.toString(),
  value: '1000000000000000000',
  data: '0x'
};
```

### 2. 单位转换

VET 和 VTHO 都有 18 位小数,使用 `VET.of()` 和 `VTHO.of()` 自动处理。

```ts
// ✅ 推荐
VET.of(1.5)    // 自动转换为 1500000000000000000 Wei
VTHO.of(100)   // 自动转换为 100000000000000000000 Wei

// ❌ 容易出错
'1500000000000000000'  // 容易数错 0 的数量
```

### 3. 原子性保证

由于所有 Clause 在同一笔交易中执行,如果任何一个失败,整个交易都会回滚。

```ts
const clauses = [
  Clause.transferVET(address1, VET.of(1)),
  Clause.transferVET(address2, VET.of(2)),
  Clause.transferVET(address3, VET.of(3)),
];

// 如果账户余额不足以完成所有转账,整个交易失败
// 不会出现部分成功的情况
```

### 4. Gas 估算

批量操作时,务必重新估算 Gas。

```ts
// ✅ 正确做法
const clauses = [...]; // 多个 Clause
const gasResult = await thorClient.gas.estimateGas(clauses, senderAddress);

// ❌ 错误做法
const gas = 21000 * clauses.length; // 不准确,每个操作消耗不同
```

### 5. 数据编码

调用合约时,确保数据正确编码。

```ts
import { abi } from '@vechain/sdk-core';

// ✅ 使用 SDK 的 ABI 编码
const data = abi.encodeFunctionInput(functionABI, params);

// ❌ 手动拼接（容易出错）
const data = '0xa9059cbb' + address.slice(2) + amount.toString(16);
```

## 常见错误

### 1. 地址格式错误

```ts
// ❌ 错误
const clause = Clause.transferVET('7567d83b...', VET.of(1)); // 缺少 0x

// ✅ 正确
const clause = Clause.transferVET(
  Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
  VET.of(1)
);
```

### 2. 数值类型错误

```ts
// ❌ 错误
const clause = Clause.transferVET(address, 1); // 直接传数字

// ✅ 正确
const clause = Clause.transferVET(address, VET.of(1));
```

### 3. data 字段缺失

```ts
// ❌ 错误（纯转账也需要 data 字段）
const clause = {
  to: address,
  value: '1000000000000000000'
  // 缺少 data
};

// ✅ 正确
const clause = {
  to: address,
  value: '1000000000000000000',
  data: '0x' // 纯转账时 data 为 '0x'
};
```

## 实战示例

### 空投代币给多个地址

```ts
import { Clause, ThorClient, Transaction, HexUInt, abi } from '@vechain/sdk-core';

// 代币合约地址
const tokenAddress = '0x...';

// 接收者列表
const recipients = [
  { address: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed', amount: '1000000000000000000' },
  { address: '0x9e7911de289c3c856ce7f421034f66b6cde49c39', amount: '2000000000000000000' },
  { address: '0x88b2551c3ed42ca663796c10ce68c88a65f73fe2', amount: '3000000000000000000' },
];

// VIP-180 transfer 函数 ABI
const transferABI = {
  constant: false,
  inputs: [
    { name: '_to', type: 'address' },
    { name: '_value', type: 'uint256' }
  ],
  name: 'transfer',
  outputs: [{ name: 'success', type: 'bool' }],
  type: 'function'
};

// 为每个接收者创建一个 Clause
const clauses = recipients.map(({ address, amount }) => ({
  to: tokenAddress,
  value: '0',
  data: abi.encodeFunctionInput(transferABI, [address, amount])
}));

// 发送交易
const thorClient = ThorClient.at('https://testnet.vechain.org');
const gasResult = await thorClient.gas.estimateGas(clauses, senderAddress);
const txBody = await thorClient.transactions.buildTransactionBody(clauses, gasResult.totalGas);
const signedTx = Transaction.of(txBody).sign(HexUInt.of(privateKey).bytes);
const result = await thorClient.transactions.sendTransaction(signedTx);

console.log('空投完成,交易哈希:', result.id);
```

### DeFi 操作组合

```ts
// 示例:在一笔交易中完成 approve + swap
const clauses = [
  // 1. 授权代币给 DEX
  {
    to: tokenAddress,
    value: '0',
    data: abi.encodeFunctionInput(approveABI, [dexAddress, amount])
  },

  // 2. 执行 swap
  {
    to: dexAddress,
    value: '0',
    data: abi.encodeFunctionInput(swapABI, [tokenA, tokenB, amount])
  }
];

// 原子性保证:授权和交换要么都成功,要么都失败
```

## 总结

Clause 是 VeChain 交易的核心组成部分,掌握 Clause 的使用是开发 VeChain 应用的基础。

**关键要点:**
- 一个交易可以包含多个 Clause
- 所有 Clause 具有原子性
- 使用 SDK 提供的辅助函数简化开发
- 批量操作可以显著降低 Gas 费用
- 合约调用需要正确编码函数数据

**推荐阅读:**
- [Transaction 文档](transaction.md) - 了解如何构建和发送交易
- [ThorClient 文档](thor-client.md) - 了解如何与区块链交互
- [Contract 文档](contract.md) - 了解合约交互的高级用法

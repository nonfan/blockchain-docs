# Transaction

Transaction 是 VeChain 区块链上的基本操作单元。本文档详细介绍如何创建、签名和发送交易。

## 核心概念

在 VeChain 中,一笔交易包含以下关键信息:

- **Clauses**: 交易要执行的操作列表（可以是多个）
- **Signature**: 发送方的数字签名
- **Gas**: 交易执行需要消耗的 Gas
- **其他元数据**: 如过期时间、区块引用等

## 交易结构

```ts
interface TransactionBody {
  chainTag: number;           // 链标识（主网 0x4a,测试网 0xf6）
  blockRef: string;           // 参考区块（最近区块的前 8 字节）
  expiration: number;         // 过期时间（单位:区块数）
  clauses: TransactionClause[];  // 交易子句列表
  gasPriceCoef: number;       // Gas 价格系数（0-255）
  gas: number | string;       // Gas 限制
  dependsOn: string | null;   // 依赖的交易 ID
  nonce: string | number;     // 随机数（防重放）
  reserved?: {
    features?: number;        // 功能标志（1 = 启用代付）
    unused?: any[];
  };
}
```

### 字段详解

| 字段           | 类型                      | 说明                                                         |
| -------------- | ------------------------- | ------------------------------------------------------------ |
| `chainTag`     | `number`                  | 网络标识。主网 `0x4a`,测试网 `0xf6`                          |
| `blockRef`     | `string`                  | 最近区块哈希的前 8 字节,用于确定交易的有效性                 |
| `expiration`   | `number`                  | 交易过期时间,单位为区块数。推荐 32（约 5 分钟）              |
| `clauses`      | `TransactionClause[]`     | 要执行的操作列表,详见 [Clause 文档](02_clause.md)            |
| `gasPriceCoef` | `number`                  | Gas 价格系数,范围 0-255。0 表示使用基础 Gas 价格             |
| `gas`          | `number \| string`        | Gas 限制,超过此值交易失败                                    |
| `dependsOn`    | `string \| null`          | 依赖的交易 ID。如果设置,则此交易必须在依赖交易之后执行       |
| `nonce`        | `string \| number`        | 随机数,用于防止重放攻击                                      |
| `reserved`     | `object`                  | 保留字段,用于扩展功能                                        |
| `features`     | `number`                  | 功能标志。设置为 `1` 启用 VIP-191 代付功能                   |

## 基本用法

### 1. 创建简单交易

```ts
import { ThorClient, Transaction, Clause, Address, VET, HexUInt } from '@vechain/sdk-core';

// 初始化客户端
const thorClient = ThorClient.at('https://testnet.vechain.org');

// 发送方信息
const sender = {
  address: '0x2669514f9fe96bc7301177ba774d3da8a06cace4',
  privateKey: '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5'
};

// 1. 创建 Clause
const clauses = [
  Clause.transferVET(
    Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
    VET.of(1)
  )
];

// 2. 估算 Gas
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);

// 3. 构建交易体
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

// 4. 签名交易
const signedTx = Transaction.of(txBody).sign(
  HexUInt.of(sender.privateKey).bytes
);

// 5. 发送交易
const result = await thorClient.transactions.sendTransaction(signedTx);

console.log('交易已发送,ID:', result.id);

// 6. 等待交易确认
const receipt = await thorClient.transactions.waitForTransaction(result.id);

if (receipt.reverted) {
  console.log('交易失败');
} else {
  console.log('交易成功');
}
```

### 2. 手动构建交易体

如果你需要更细粒度的控制,可以手动构建交易体。

```ts
import { Transaction, HexUInt } from '@vechain/sdk-core';

// 获取最新区块
const bestBlock = await thorClient.blocks.getBestBlockCompressed();

// 手动构建交易体
const txBody = {
  chainTag: 0xf6,                          // 测试网
  blockRef: bestBlock.id.slice(0, 18),     // 区块引用
  expiration: 32,                          // 32 个区块后过期（约 5 分钟）
  clauses: [
    Clause.transferVET(
      Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
      VET.of(1)
    )
  ],
  gasPriceCoef: 0,                         // 使用基础 Gas 价格
  gas: 21000,                              // Gas 限制
  dependsOn: null,                         // 不依赖其他交易
  nonce: Date.now()                        // 使用时间戳作为随机数
};

// 签名
const signedTx = Transaction.of(txBody).sign(
  HexUInt.of(privateKey).bytes
);

// 发送
await thorClient.transactions.sendTransaction(signedTx);
```

## 交易签名

VeChain 支持三种签名模式:

### 1. 普通签名（Single Signature）

最常见的签名方式,由发送方签名。

```ts
const signedTx = Transaction.of(txBody).sign(
  HexUInt.of(senderPrivateKey).bytes
);
```

### 2. 代付签名（Delegated Signature）

使用 VIP-191 代付功能,由发送方和代付方共同签名。

```ts
const txBody = {
  // ... 其他字段
  reserved: {
    features: 1  // ⚠️ 必须设置为 1 启用代付
  }
};

// 双重签名
const signedTx = Transaction.of(txBody).signAsSenderAndGasPayer(
  HexUInt.of(senderPrivateKey).bytes,    // 发送方私钥
  HexUInt.of(gasPayerPrivateKey).bytes   // 代付方私钥
);
```

**代付功能的优势:**
- 用户无需持有 VTHO 即可发送交易
- 降低用户使用门槛
- 适用于 DApp 为用户支付 Gas 的场景

### 3. 多签签名（Multi-Signature）

适用于需要多方授权的场景。

```ts
// 构建交易体
const txBody = { /* ... */ };

// 创建交易对象
const tx = Transaction.of(txBody);

// 第一个签名者签名
const signature1 = tx.getSignatureHash(HexUInt.of(privateKey1).bytes);

// 第二个签名者签名
const signature2 = tx.getSignatureHash(HexUInt.of(privateKey2).bytes);

// 组合签名（需要自定义实现）
// ...
```

## Gas 管理

### 1. Gas 估算

```ts
// 基本估算
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);
console.log('估算 Gas:', gasResult.totalGas);

// 添加安全边际
const gasResult = await thorClient.gas.estimateGas(
  clauses,
  sender.address,
  { gasPadding: 0.2 }  // 增加 20% 的安全边际
);
```

### 2. Gas 价格系数

`gasPriceCoef` 决定了 Gas 价格,范围 0-255:

```ts
// 实际 Gas 价格 = baseGasPrice * (1 + gasPriceCoef / 255)

// 使用基础价格
gasPriceCoef: 0

// 使用 1.5 倍基础价格
gasPriceCoef: 128

// 使用 2 倍基础价格
gasPriceCoef: 255
```

**选择建议:**
- 普通交易: `gasPriceCoef: 0`
- 急需确认: `gasPriceCoef: 128` 或更高
- 链上拥堵: 适当提高系数

### 3. Gas 限制

设置合理的 Gas 限制很重要:

```ts
// ❌ 太低会导致交易失败
gas: 10000  // 不足以完成操作

// ✅ 使用估算值
gas: gasResult.totalGas

// ✅ 手动设置（确保足够）
gas: 50000
```

## 交易依赖

通过 `dependsOn` 字段可以指定交易执行顺序。

```ts
// 第一笔交易
const tx1Body = { /* ... */ };
const signedTx1 = Transaction.of(tx1Body).sign(privateKeyBytes);
const result1 = await thorClient.transactions.sendTransaction(signedTx1);

// 第二笔交易依赖第一笔
const tx2Body = {
  // ... 其他字段
  dependsOn: result1.id  // 依赖第一笔交易
};

const signedTx2 = Transaction.of(tx2Body).sign(privateKeyBytes);
await thorClient.transactions.sendTransaction(signedTx2);

// tx2 会在 tx1 确认后才执行
```

**使用场景:**
- 需要确保交易顺序
- 后续交易依赖前一笔交易的结果
- 复杂的多步操作

## 交易过期

交易在指定区块数后会过期,不再被网络接受。

```ts
// 当前区块高度: 1000

// 设置 32 个区块后过期
expiration: 32

// 有效期至区块 1032
// 如果在区块 1033 时还未确认,交易将被丢弃
```

**推荐值:**
- 普通交易: `32`（约 5 分钟）
- 长期有效: `720`（约 2 小时）
- 急需确认: `8`（约 1 分钟）

**注意:** 过期时间越长,交易可能被延迟执行的风险越大。

## Nonce（随机数）

Nonce 用于防止重放攻击,每笔交易都应该有唯一的 nonce。

```ts
// ✅ 使用时间戳
nonce: Date.now()

// ✅ 使用随机数
nonce: Math.floor(Math.random() * 1e18)

// ✅ 使用递增计数器
nonce: txCounter++

// ❌ 固定值（容易被重放）
nonce: 12345
```

## 批量交易

VeChain 的 Clause 机制允许在一笔交易中执行多个操作。

```ts
const clauses = [
  Clause.transferVET(address1, VET.of(1)),
  Clause.transferVET(address2, VET.of(2)),
  Clause.transferVET(address3, VET.of(3)),
];

// 估算 Gas（会计算所有 Clause 的总消耗）
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);

// 构建交易
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

// 签名并发送
const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
await thorClient.transactions.sendTransaction(signedTx);
```

**优势:**
- 节省 Gas 费用（一次签名,多次操作）
- 保证原子性（全部成功或全部失败）
- 提高效率

## 查询交易

### 1. 查询交易详情

```ts
const txId = '0x...';
const tx = await thorClient.transactions.getTransaction(txId);

console.log('交易详情:', {
  id: tx.id,
  size: tx.size,
  chainTag: tx.chainTag,
  blockRef: tx.blockRef,
  clauses: tx.clauses
});
```

### 2. 查询交易回执

```ts
const receipt = await thorClient.transactions.getTransactionReceipt(txId);

console.log('交易回执:', {
  gasUsed: receipt.gasUsed,
  gasPayer: receipt.gasPayer,
  paid: receipt.paid,
  reverted: receipt.reverted,
  outputs: receipt.outputs
});
```

### 3. 等待交易确认

```ts
// 等待交易被打包
const receipt = await thorClient.transactions.waitForTransaction(txId);

if (receipt.reverted) {
  console.log('交易失败,已回滚');
} else {
  console.log('交易成功');
}
```

## 实战示例

### 示例 1: 空投 NFT

```ts
import { ThorClient, Transaction, Clause, abi } from '@vechain/sdk-core';

const nftContractAddress = '0x...';
const recipients = [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
  '0x9e7911de289c3c856ce7f421034f66b6cde49c39',
  '0x88b2551c3ed42ca663796c10ce68c88a65f73fe2',
];

// NFT mint 函数 ABI
const mintABI = {
  name: 'mint',
  type: 'function',
  inputs: [{ name: 'to', type: 'address' }],
  outputs: []
};

// 为每个接收者创建 mint Clause
const clauses = recipients.map(recipient => ({
  to: nftContractAddress,
  value: '0',
  data: abi.encodeFunctionInput(mintABI, [recipient])
}));

// 估算 Gas
const thorClient = ThorClient.at('https://testnet.vechain.org');
const gasResult = await thorClient.gas.estimateGas(clauses, senderAddress);

// 构建并发送交易
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
const result = await thorClient.transactions.sendTransaction(signedTx);

console.log('NFT 空投完成,交易 ID:', result.id);
```

### 示例 2: DeFi 操作组合

```ts
// 在一笔交易中完成: 授权 + 添加流动性
const clauses = [
  // 1. 授权 TokenA
  {
    to: tokenA,
    value: '0',
    data: abi.encodeFunctionInput(approveABI, [routerAddress, amountA])
  },

  // 2. 授权 TokenB
  {
    to: tokenB,
    value: '0',
    data: abi.encodeFunctionInput(approveABI, [routerAddress, amountB])
  },

  // 3. 添加流动性
  {
    to: routerAddress,
    value: '0',
    data: abi.encodeFunctionInput(addLiquidityABI, [
      tokenA,
      tokenB,
      amountA,
      amountB,
      minA,
      minB,
      recipient,
      deadline
    ])
  }
];

// 构建并发送交易
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);
const txBody = await thorClient.transactions.buildTransactionBody(clauses, gasResult.totalGas);
const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
await thorClient.transactions.sendTransaction(signedTx);
```

### 示例 3: 使用代付功能

```ts
// 用户账户（无需 VTHO）
const user = {
  address: '0x...',
  privateKey: '0x...'
};

// 代付账户（需要有 VTHO）
const sponsor = {
  address: '0x...',
  privateKey: '0x...'
};

// 构建交易体
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

// ⚠️ 启用代付功能
txBody.reserved = { features: 1 };

// 双重签名
const signedTx = Transaction.of(txBody).signAsSenderAndGasPayer(
  HexUInt.of(user.privateKey).bytes,
  HexUInt.of(sponsor.privateKey).bytes
);

// 发送交易
const result = await thorClient.transactions.sendTransaction(signedTx);

// 查询回执,确认代付方
const receipt = await thorClient.transactions.getTransactionReceipt(result.id);
console.log('代付方:', receipt.gasPayer);  // 应该是 sponsor.address
```

## 最佳实践

### 1. 错误处理

```ts
try {
  const result = await thorClient.transactions.sendTransaction(signedTx);
  const receipt = await thorClient.transactions.waitForTransaction(result.id);

  if (receipt.reverted) {
    // 交易被回滚
    console.error('交易失败,可能原因:', receipt.outputs);
  } else {
    // 交易成功
    console.log('交易成功');
  }
} catch (error) {
  // 网络错误或其他异常
  console.error('发送交易失败:', error);
}
```

### 2. Gas 优化

```ts
// ✅ 使用估算值 + 安全边际
const gasResult = await thorClient.gas.estimateGas(
  clauses,
  sender.address,
  { gasPadding: 0.1 }  // 增加 10%
);

// ✅ 批量操作节省 Gas
const clauses = [
  clause1,
  clause2,
  clause3
];  // 一笔交易完成,而非三笔

// ❌ 避免设置过高的 Gas 限制
gas: 1000000  // 过高会锁定过多 VTHO
```

### 3. 交易监控

```ts
// 发送交易
const result = await thorClient.transactions.sendTransaction(signedTx);

// 设置超时
const timeout = 60000; // 60 秒
const startTime = Date.now();

while (Date.now() - startTime < timeout) {
  const receipt = await thorClient.transactions.getTransactionReceipt(result.id);

  if (receipt) {
    if (receipt.reverted) {
      throw new Error('交易失败');
    }
    console.log('交易成功');
    break;
  }

  // 等待 2 秒后重试
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 4. Nonce 管理

```ts
// ✅ 确保每笔交易的 nonce 唯一
const nonce = Date.now() + Math.floor(Math.random() * 1000);

// ✅ 或者使用全局计数器
let globalNonce = Date.now();
function getNextNonce() {
  return globalNonce++;
}
```

## 常见错误

### 1. chainTag 不匹配

```ts
// ❌ 在测试网使用主网的 chainTag
chainTag: 0x4a  // 主网标识

// ✅ 在测试网使用测试网的 chainTag
chainTag: 0xf6  // 测试网标识
```

### 2. Gas 不足

```ts
// ❌ Gas 限制太低
gas: 10000  // 不足以完成操作

// ✅ 使用估算值
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);
gas: gasResult.totalGas
```

### 3. 交易过期

```ts
// ❌ 过期时间太短
expiration: 1  // 1 个区块,很容易过期

// ✅ 使用合理的过期时间
expiration: 32  // 32 个区块,约 5 分钟
```

### 4. 代付功能未启用

```ts
// ❌ 使用双重签名但未启用 features
const signedTx = Transaction.of(txBody).signAsSenderAndGasPayer(
  senderKey,
  gasPayerKey
);  // 会失败

// ✅ 启用 features
txBody.reserved = { features: 1 };
const signedTx = Transaction.of(txBody).signAsSenderAndGasPayer(
  senderKey,
  gasPayerKey
);
```
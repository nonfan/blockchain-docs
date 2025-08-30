# ThorClient

ThorClient 是 VeChain 官方 SDK 的核心模块,用于与 VeChainThor 区块链交互。它将区块链的底层 HTTP 接口（RESTful API）封装成易用的对象接口。

无论是获取区块、账户、日志、交易信息,还是执行交易签名与发送,ThorClient 都提供了直观的 API。

## 核心概念

ThorClient 通过以下模块与区块链交互:

- **accounts** - 账户信息查询
- **blocks** - 区块数据获取
- **logs** - 事件和转账日志查询
- **transactions** - 交易构建、发送和查询
- **contracts** - 合约调用
- **gas** - Gas 估算

## 初始化 ThorClient

### 基本初始化

```ts
import { ThorClient } from '@vechain/sdk-network';

// 连接测试网
const testnetClient = ThorClient.at('https://testnet.vechain.org');

// 连接主网
const mainnetClient = ThorClient.at('https://mainnet.vechain.org');
```

### 使用 SimpleHttpClient

```ts
import { ThorClient, SimpleHttpClient } from '@vechain/sdk-network';

const httpClient = new SimpleHttpClient('https://testnet.vechain.org');
const thorClient = new ThorClient(httpClient);
```

### 启用轮询模式

轮询模式会自动监听新区块。

```ts
const thorClient = ThorClient.at('https://testnet.vechain.org', {
  isPollingEnabled: true  // 启用自动轮询
});

// 监听新区块
thorClient.on('newBlock', (block) => {
  console.log('新区块:', block.number);
});
```

### 网络配置

```ts
// 常用节点 URL
const NETWORKS = {
  mainnet: 'https://mainnet.vechain.org',
  testnet: 'https://testnet.vechain.org',
  solo: 'http://localhost:8669'  // 本地开发节点
};

// 根据环境选择网络
const nodeUrl = process.env.NODE_ENV === 'production'
  ? NETWORKS.mainnet
  : NETWORKS.testnet;

const thorClient = ThorClient.at(nodeUrl);
```

## Accounts 模块

### 获取账户信息

```ts
import { Address } from '@vechain/sdk-core';

const address = Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');

// 获取账户详情
const account = await thorClient.accounts.getAccount(address);

console.log('账户信息:', {
  balance: account.balance,     // VET 余额（Wei）
  energy: account.energy,       // VTHO 余额（Wei）
  hasCode: account.hasCode      // 是否是合约账户
});
```

### 获取合约字节码

```ts
// 判断是否是合约账户
const bytecode = await thorClient.accounts.getBytecode(address);

if (bytecode.code !== '0x') {
  console.log('这是一个合约账户');
  console.log('字节码长度:', bytecode.code.length);
} else {
  console.log('这是一个普通账户');
}
```

### 读取合约存储

```ts
import { ThorId } from '@vechain/sdk-core';

// 读取存储槽 0
const position = ThorId.of(0);
const storage = await thorClient.accounts.getStorageAt(
  contractAddress,
  position
);

console.log('存储值:', storage.value);
```

### API 概览

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getAccount(address)` | 获取账户信息 | `{ balance, energy, hasCode }` |
| `getBytecode(address)` | 获取合约字节码 | `{ code }` |
| `getStorageAt(address, position)` | 读取合约存储槽 | `{ value }` |

## Blocks 模块

VeChain 提供两种区块格式:
- **Compressed**: 基础信息（不含交易详情）
- **Expanded**: 完整信息（包含交易详情）

### 获取区块

```ts
// 通过区块号获取
const block1 = await thorClient.blocks.getBlockCompressed(1);
console.log('区块 1:', {
  id: block1.id,
  number: block1.number,
  timestamp: block1.timestamp,
  gasLimit: block1.gasLimit
});

// 获取最新区块
const bestBlock = await thorClient.blocks.getBestBlockCompressed();
console.log('最新区块号:', bestBlock.number);

// 获取最终确认区块
const finalBlock = await thorClient.blocks.getFinalBlockCompressed();
console.log('最终确认区块:', finalBlock.number);
```

### 获取完整区块信息

```ts
// 包含交易详情的区块
const expandedBlock = await thorClient.blocks.getBestBlockExpanded();

console.log('区块详情:', {
  number: expandedBlock.number,
  transactions: expandedBlock.transactions.length,
  gasUsed: expandedBlock.gasUsed
});

// 遍历区块中的交易
expandedBlock.transactions.forEach((tx, index) => {
  console.log(`交易 ${index}:`, {
    id: tx.id,
    origin: tx.origin,
    clauses: tx.clauses.length
  });
});
```

### 通过哈希获取区块

```ts
const blockId = '0x000f4240fa8c7c5b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7';
const block = await thorClient.blocks.getBlockCompressed(blockId);
```

### API 概览

| 方法 | 说明 | 参数 |
|------|------|------|
| `getBlockCompressed(id)` | 获取基础区块信息 | 区块号或哈希 |
| `getBlockExpanded(id)` | 获取完整区块信息 | 区块号或哈希 |
| `getBestBlockCompressed()` | 获取最新区块 | - |
| `getBestBlockExpanded()` | 获取最新区块（含交易） | - |
| `getFinalBlockCompressed()` | 获取最终确认区块 | - |
| `getFinalBlockExpanded()` | 获取最终确认区块（含交易） | - |

## Logs 模块

### 查询事件日志

```ts
// Transfer 事件的 topic0
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// 查询 VTHO 合约的 Transfer 事件
const logs = await thorClient.logs.filterRawEventLogs({
  range: {
    unit: 'block',
    from: 0,
    to: 100000
  },
  options: {
    offset: 0,
    limit: 100
  },
  criteriaSet: [
    {
      address: '0x0000000000000000000000000000456E65726779',  // VTHO 合约
      topic0: TRANSFER_TOPIC
    }
  ]
});

console.log(`找到 ${logs.length} 条事件日志`);

logs.forEach(log => {
  console.log('事件日志:', {
    address: log.address,
    topics: log.topics,
    data: log.data,
    meta: {
      blockNumber: log.meta.blockNumber,
      txID: log.meta.txID
    }
  });
});
```

### 查询转账日志

```ts
// 查询 VET 转账记录
const transferLogs = await thorClient.logs.filterTransferLogs({
  range: {
    unit: 'block',
    from: 0,
    to: 100000
  },
  options: {
    offset: 0,
    limit: 50
  },
  criteriaSet: [
    {
      sender: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
      recipient: '0x9e7911de289c3c856ce7f421034f66b6cde49c39'
    }
  ]
});

transferLogs.forEach(log => {
  console.log('转账记录:', {
    sender: log.sender,
    recipient: log.recipient,
    amount: log.amount,
    blockNumber: log.meta.blockNumber
  });
});
```

### 高级过滤

```ts
// 查询特定地址发出的所有 Transfer 事件
const address = '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed';
const topic1 = '0x000000000000000000000000' + address.slice(2).toLowerCase();

const logs = await thorClient.logs.filterRawEventLogs({
  range: {
    unit: 'block',
    from: 0,
    to: 100000
  },
  criteriaSet: [
    {
      address: tokenContractAddress,
      topic0: TRANSFER_TOPIC,
      topic1: topic1  // from 参数
    }
  ]
});
```

### API 概览

| 方法 | 说明 | 用途 |
|------|------|------|
| `filterRawEventLogs(criteria)` | 查询事件日志 | 合约事件监听 |
| `filterTransferLogs(criteria)` | 查询转账日志 | VET/VTHO 转账记录 |

## Transactions 模块

### 构建交易

```ts
import { Clause, VET, Address } from '@vechain/sdk-core';

// 创建 Clause
const clauses = [
  Clause.transferVET(
    Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'),
    VET.of(1)
  )
];

// 估算 Gas
const gasResult = await thorClient.gas.estimateGas(
  clauses,
  '0x2669514f9fe96bc7301177ba774d3da8a06cace4'  // 发送方地址
);

// 构建交易体
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

console.log('交易体:', txBody);
```

### 发送交易

```ts
import { Transaction, HexUInt } from '@vechain/sdk-core';

// 签名交易
const privateKey = '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5';
const signedTx = Transaction.of(txBody).sign(
  HexUInt.of(privateKey).bytes
);

// 发送交易
const result = await thorClient.transactions.sendTransaction(signedTx);
console.log('交易已发送:', result.id);

// 等待确认
const receipt = await thorClient.transactions.waitForTransaction(result.id);

if (receipt.reverted) {
  console.log('交易失败');
} else {
  console.log('交易成功');
}
```

### 查询交易

```ts
const txId = '0x9c8cf4f5d1b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9';

// 获取交易详情
const tx = await thorClient.transactions.getTransaction(txId);
console.log('交易详情:', {
  id: tx.id,
  chainTag: tx.chainTag,
  blockRef: tx.blockRef,
  clauses: tx.clauses,
  gas: tx.gas
});

// 获取交易回执
const receipt = await thorClient.transactions.getTransactionReceipt(txId);
console.log('交易回执:', {
  gasUsed: receipt.gasUsed,
  gasPayer: receipt.gasPayer,
  paid: receipt.paid,
  reverted: receipt.reverted,
  outputs: receipt.outputs
});
```

### API 概览

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `buildTransactionBody(clauses, gas)` | 构建交易体 | `TransactionBody` |
| `sendTransaction(signedTx)` | 发送已签名交易 | `{ id }` |
| `sendRawTransaction(raw)` | 发送原始交易 | `{ id }` |
| `getTransaction(id)` | 获取交易详情 | `Transaction` |
| `getTransactionReceipt(id)` | 获取交易回执 | `Receipt` |
| `waitForTransaction(id)` | 等待交易确认 | `Receipt` |

## Contracts 模块

### 调用合约（只读）

```ts
import { abi } from '@vechain/sdk-core';

// 合约地址
const contractAddress = '0x0000000000000000000000000000456E65726779';

// balanceOf 函数 ABI
const balanceOfABI = {
  constant: true,
  inputs: [{ name: '_owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: 'balance', type: 'uint256' }],
  type: 'function'
};

// 编码函数调用
const data = abi.encodeFunctionInput(balanceOfABI, [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'
]);

// 调用合约
const result = await thorClient.contracts.executeCall(contractAddress, data);

// 解码返回值
const balance = abi.decodeFunctionOutput(balanceOfABI, result.data)[0];
console.log('VTHO 余额:', balance.toString());
```

### 调用合约（写入）

```ts
// 构建合约调用的 Clause
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

const callData = abi.encodeFunctionInput(transferABI, [
  '0x9e7911de289c3c856ce7f421034f66b6cde49c39',
  '1000000000000000000'
]);

const clause = {
  to: contractAddress,
  value: '0',
  data: callData
};

// 估算 Gas 并发送交易
const gasResult = await thorClient.gas.estimateGas([clause], senderAddress);
const txBody = await thorClient.transactions.buildTransactionBody([clause], gasResult.totalGas);
const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
await thorClient.transactions.sendTransaction(signedTx);
```

## Gas 模块

### 估算 Gas

```ts
// 基本估算
const gasResult = await thorClient.gas.estimateGas(clauses, senderAddress);
console.log('估算 Gas:', {
  totalGas: gasResult.totalGas,
  baseGasPrice: gasResult.baseGasPrice
});

// 添加安全边际
const gasResult2 = await thorClient.gas.estimateGas(
  clauses,
  senderAddress,
  { gasPadding: 0.2 }  // 增加 20%
);

console.log('带边际的 Gas:', gasResult2.totalGas);
```

## chainTag

`chainTag` 标识交易要发送到哪个网络,防止跨网络发送错误。

```ts
// 获取当前网络的 chainTag
const bestBlock = await thorClient.blocks.getBestBlockCompressed();
const chainTag = bestBlock.id.slice(0, 4);

console.log('Chain Tag:', chainTag);
// 主网: 0x4a
// 测试网: 0xf6
```

### 网络标识

| 网络 | chainTag | 说明 |
|------|----------|------|
| 主网 | `0x4a` | VeChainThor 主网 |
| 测试网 | `0xf6` | VeChain 测试网 |

## Fee Delegation（代付功能）

VeChain 的独特功能,允许第三方代付交易 Gas 费用。

### 使用代付

```ts
const senderAccount = {
  address: '0x2669514f9fe96bc7301177ba774d3da8a06cace4',
  privateKey: '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5'
};

const gasPayerAccount = {
  address: '0x88b2551c3ed42ca663796c10ce68c88a65f73fe2',
  privateKey: '0x432f38e766e766...'
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
  HexUInt.of(senderAccount.privateKey).bytes,
  HexUInt.of(gasPayerAccount.privateKey).bytes
);

// 发送交易
const result = await thorClient.transactions.sendTransaction(signedTx);

// 查询回执确认代付方
const receipt = await thorClient.transactions.getTransactionReceipt(result.id);
console.log('代付方:', receipt.gasPayer);  // 应该是 gasPayerAccount.address
```

### 代付角色

| 角色 | 职责 | 说明 |
|------|------|------|
| Sender（发起者） | 构造并签名交易 | 发起交易的用户 |
| Gas Payer（代付者） | 支付 VTHO 并签名 | 代付 Gas 的账户 |
| 节点 | 验证双方签名并执行 | 区块链节点 |

## 实战示例

### 示例 1: 监控账户余额

```ts
async function monitorBalance(address: string) {
  const thorClient = ThorClient.at('https://testnet.vechain.org', {
    isPollingEnabled: true
  });

  // 初始余额
  let lastBalance = '0';

  thorClient.on('newBlock', async () => {
    const account = await thorClient.accounts.getAccount(Address.of(address));
    const currentBalance = account.balance;

    if (currentBalance !== lastBalance) {
      console.log('余额变化:', {
        old: lastBalance,
        new: currentBalance,
        change: BigInt(currentBalance) - BigInt(lastBalance)
      });

      lastBalance = currentBalance;
    }
  });
}

// 使用
monitorBalance('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');
```

### 示例 2: 批量查询余额

```ts
async function getBatchBalances(addresses: string[]) {
  const thorClient = ThorClient.at('https://testnet.vechain.org');

  const balances = await Promise.all(
    addresses.map(async (addr) => {
      const account = await thorClient.accounts.getAccount(Address.of(addr));
      return {
        address: addr,
        vet: account.balance,
        vtho: account.energy
      };
    })
  );

  return balances;
}

// 使用
const addresses = [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
  '0x9e7911de289c3c856ce7f421034f66b6cde49c39',
  '0x88b2551c3ed42ca663796c10ce68c88a65f73fe2'
];

const balances = await getBatchBalances(addresses);
console.log('批量余额:', balances);
```

### 示例 3: 事件监听器

```ts
class EventListener {
  private thorClient: ThorClient;
  private lastBlock: number = 0;

  constructor(nodeUrl: string) {
    this.thorClient = ThorClient.at(nodeUrl, {
      isPollingEnabled: true
    });
  }

  async start(contractAddress: string, eventTopic: string) {
    const bestBlock = await this.thorClient.blocks.getBestBlockCompressed();
    this.lastBlock = bestBlock.number;

    this.thorClient.on('newBlock', async (block) => {
      await this.processNewBlock(block.number, contractAddress, eventTopic);
    });
  }

  private async processNewBlock(
    currentBlock: number,
    contractAddress: string,
    eventTopic: string
  ) {
    if (currentBlock <= this.lastBlock) return;

    // 查询新区块的事件
    const logs = await this.thorClient.logs.filterRawEventLogs({
      range: {
        unit: 'block',
        from: this.lastBlock + 1,
        to: currentBlock
      },
      criteriaSet: [
        {
          address: contractAddress,
          topic0: eventTopic
        }
      ]
    });

    // 处理事件
    logs.forEach(log => {
      console.log('新事件:', {
        blockNumber: log.meta.blockNumber,
        txID: log.meta.txID,
        topics: log.topics,
        data: log.data
      });
    });

    this.lastBlock = currentBlock;
  }
}

// 使用
const listener = new EventListener('https://testnet.vechain.org');
listener.start(
  '0x0000000000000000000000000000456E65726779',  // VTHO 合约
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'  // Transfer 事件
);
```

## 最佳实践

### 1. 错误处理

```ts
async function safeGetAccount(address: string) {
  try {
    const account = await thorClient.accounts.getAccount(Address.of(address));
    return account;
  } catch (error) {
    console.error('获取账户失败:', error);
    return null;
  }
}
```

### 2. 连接池管理

```ts
class ThorClientPool {
  private clients: ThorClient[] = [];
  private currentIndex: number = 0;

  constructor(nodeUrls: string[]) {
    this.clients = nodeUrls.map(url => ThorClient.at(url));
  }

  getClient(): ThorClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }
}

// 使用多个节点提高可用性
const pool = new ThorClientPool([
  'https://mainnet.vechain.org',
  'https://sync-mainnet.vechain.org'
]);

const client = pool.getClient();
```

### 3. 缓存优化

```ts
class CachedThorClient {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration: number = 10000;  // 10 秒

  constructor(private thorClient: ThorClient) {}

  async getAccount(address: string) {
    const key = `account:${address}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    const account = await this.thorClient.accounts.getAccount(Address.of(address));
    this.cache.set(key, { data: account, timestamp: Date.now() });

    return account;
  }
}
```

## 总结

ThorClient 是与 VeChain 区块链交互的核心工具。

**关键模块:**
- `accounts` - 账户查询
- `blocks` - 区块数据
- `logs` - 事件日志
- `transactions` - 交易管理
- `contracts` - 合约调用
- `gas` - Gas 估算

**重要功能:**
- 支持轮询模式监听新区块
- 提供代付功能降低用户门槛
- 批量操作提高效率
- 完整的交易生命周期管理

**推荐阅读:**
- [Clause 文档](clause.md) - 了解交易子句
- [Transaction 文档](transaction.md) - 了解交易构建
- [Contract 文档](contract.md) - 了解合约交互
- [Wallet 文档](wallet.md) - 了解钱包管理

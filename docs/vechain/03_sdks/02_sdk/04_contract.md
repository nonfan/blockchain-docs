# 合约交互（Contract）

本文档详细介绍如何使用 VeChain SDK 与智能合约进行交互,包括读取合约状态、调用合约函数、处理事件等。

## 核心概念

智能合约交互主要包括两类操作:

- **读取操作（Call）**: 不改变区块链状态,不需要签名,无需 Gas
- **写入操作（Send）**: 改变区块链状态,需要签名,消耗 Gas

## ABI（应用二进制接口）

ABI 定义了合约的接口,包括函数、事件、错误等。

### ABI 结构

```ts
interface ABI {
  type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive';
  name?: string;
  inputs?: Array<{
    name: string;
    type: string;
    indexed?: boolean;  // 仅用于事件
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  constant?: boolean;
  payable?: boolean;
}
```

### 常见的 ABI 示例

```ts
// ERC20/VIP-180 Token ABI
const tokenABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
];
```

## 读取合约数据

使用 `ThorClient` 读取合约状态不需要签名,也不消耗 Gas。

### 基本读取

```ts
import { ThorClient, abi } from '@vechain/sdk-core';

const thorClient = ThorClient.at('https://testnet.vechain.org');

// 合约地址
const contractAddress = '0x0000000000000000000000000000456E65726779';

// 函数 ABI
const balanceOfABI = {
  constant: true,
  inputs: [{ name: '_owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: 'balance', type: 'uint256' }],
  type: 'function'
};

// 编码函数调用
const encodedData = abi.encodeFunctionInput(balanceOfABI, [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'
]);

// 调用合约
const result = await thorClient.contracts.executeCall(
  contractAddress,
  encodedData
);

// 解码返回值
const decoded = abi.decodeFunctionOutput(balanceOfABI, result.data);
console.log('余额:', decoded[0].toString());
```

### 批量读取

VeChain 支持在一次请求中读取多个合约数据。

```ts
// 准备多个调用
const calls = [
  {
    to: contractAddress,
    data: abi.encodeFunctionInput(balanceOfABI, [address1])
  },
  {
    to: contractAddress,
    data: abi.encodeFunctionInput(balanceOfABI, [address2])
  },
  {
    to: contractAddress,
    data: abi.encodeFunctionInput(balanceOfABI, [address3])
  }
];

// 批量调用
const results = await Promise.all(
  calls.map(call =>
    thorClient.contracts.executeCall(call.to, call.data)
  )
);

// 解码结果
results.forEach((result, index) => {
  const balance = abi.decodeFunctionOutput(balanceOfABI, result.data)[0];
  console.log(`地址 ${index + 1} 余额:`, balance.toString());
});
```

### 读取复杂数据类型

```ts
// 读取结构体
const getUserABI = {
  constant: true,
  inputs: [{ name: '_id', type: 'uint256' }],
  name: 'getUser',
  outputs: [
    { name: 'id', type: 'uint256' },
    { name: 'name', type: 'string' },
    { name: 'addr', type: 'address' },
    { name: 'active', type: 'bool' }
  ],
  type: 'function'
};

const data = abi.encodeFunctionInput(getUserABI, [123]);
const result = await thorClient.contracts.executeCall(contractAddress, data);
const [id, name, addr, active] = abi.decodeFunctionOutput(getUserABI, result.data);

console.log('用户信息:', {
  id: id.toString(),
  name,
  address: addr,
  active
});
```

## 写入合约数据

写入操作需要构建交易、签名并发送。

### 基本写入

```ts
import { ThorClient, Transaction, Clause, HexUInt, abi } from '@vechain/sdk-core';

const thorClient = ThorClient.at('https://testnet.vechain.org');

// 合约地址
const contractAddress = '0x...';

// 发送方信息
const sender = {
  address: '0x2669514f9fe96bc7301177ba774d3da8a06cace4',
  privateKey: '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5'
};

// transfer 函数 ABI
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

// 编码函数调用
const callData = abi.encodeFunctionInput(transferABI, [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
  '1000000000000000000'  // 1 token (18 decimals)
]);

// 创建 Clause
const clause = {
  to: contractAddress,
  value: '0',
  data: callData
};

// 估算 Gas
const gasResult = await thorClient.gas.estimateGas([clause], sender.address);

// 构建交易
const txBody = await thorClient.transactions.buildTransactionBody(
  [clause],
  gasResult.totalGas
);

// 签名
const signedTx = Transaction.of(txBody).sign(
  HexUInt.of(sender.privateKey).bytes
);

// 发送
const result = await thorClient.transactions.sendTransaction(signedTx);
console.log('交易已发送:', result.id);

// 等待确认
const receipt = await thorClient.transactions.waitForTransaction(result.id);

if (receipt.reverted) {
  console.log('交易失败');
} else {
  console.log('交易成功');

  // 解码返回值
  if (receipt.outputs[0]?.data) {
    const output = abi.decodeFunctionOutput(transferABI, receipt.outputs[0].data);
    console.log('返回值:', output);
  }
}
```

### Payable 函数

调用 payable 函数时可以同时转账 VET。

```ts
import { VET } from '@vechain/sdk-core';

// payable 函数 ABI
const depositABI = {
  constant: false,
  inputs: [],
  name: 'deposit',
  outputs: [],
  payable: true,
  type: 'function'
};

const callData = abi.encodeFunctionInput(depositABI, []);

const clause = {
  to: contractAddress,
  value: VET.of(1).toString(),  // 转账 1 VET
  data: callData
};

// 构建并发送交易
// ...
```

### 批量写入

一个交易可以调用多个合约函数。

```ts
const clauses = [
  // 1. 授权 Token
  {
    to: tokenAddress,
    value: '0',
    data: abi.encodeFunctionInput(approveABI, [spenderAddress, amount])
  },

  // 2. 调用 DeFi 合约
  {
    to: defiAddress,
    value: '0',
    data: abi.encodeFunctionInput(stakeABI, [amount])
  }
];

// 估算 Gas
const gasResult = await thorClient.gas.estimateGas(clauses, sender.address);

// 构建并发送交易
const txBody = await thorClient.transactions.buildTransactionBody(
  clauses,
  gasResult.totalGas
);

const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
await thorClient.transactions.sendTransaction(signedTx);
```

## 事件监听

### 查询历史事件

```ts
// Transfer 事件 ABI
const transferEventABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'value', type: 'uint256' }
  ],
  name: 'Transfer',
  type: 'event'
};

// Transfer 事件的 topic0 (事件签名哈希)
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// 查询事件日志
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
      address: contractAddress,
      topic0: transferTopic,
      topic1: '0x000000000000000000000000' + senderAddress.slice(2)  // from 参数
    }
  ]
});

// 解码事件
logs.forEach(log => {
  const decoded = abi.decodeEventLog(transferEventABI, log.data, log.topics);
  console.log('Transfer 事件:', {
    from: decoded.from,
    to: decoded.to,
    value: decoded.value.toString()
  });
});
```

### 监听实时事件

```ts
import { ThorClient } from '@vechain/sdk-core';

const thorClient = ThorClient.at('https://testnet.vechain.org', {
  isPollingEnabled: true  // 启用轮询
});

// 记录最后处理的区块
let lastBlock = await thorClient.blocks.getBestBlockCompressed();

// 定时检查新区块
setInterval(async () => {
  const currentBlock = await thorClient.blocks.getBestBlockCompressed();

  if (currentBlock.number > lastBlock.number) {
    // 查询新区块的事件
    const logs = await thorClient.logs.filterRawEventLogs({
      range: {
        unit: 'block',
        from: lastBlock.number + 1,
        to: currentBlock.number
      },
      criteriaSet: [
        {
          address: contractAddress,
          topic0: transferTopic
        }
      ]
    });

    // 处理事件
    logs.forEach(log => {
      const decoded = abi.decodeEventLog(transferEventABI, log.data, log.topics);
      console.log('新的 Transfer 事件:', decoded);
    });

    lastBlock = currentBlock;
  }
}, 10000);  // 每 10 秒检查一次
```

## 部署合约

### 基本部署

```ts
import { ThorClient, Transaction, HexUInt, abi } from '@vechain/sdk-core';

// 合约字节码（从 Solidity 编译获得）
const bytecode = '0x608060405234801561001057600080fd5b50...';

// 如果构造函数有参数,需要编码
const constructorABI = {
  inputs: [
    { name: '_name', type: 'string' },
    { name: '_symbol', type: 'string' }
  ],
  type: 'constructor'
};

const constructorParams = abi.encodeParameters(
  constructorABI.inputs.map(i => i.type),
  ['MyToken', 'MTK']
);

// 拼接字节码和构造函数参数
const deployData = bytecode + constructorParams.slice(2);

// 创建部署 Clause
const clause = {
  to: null,  // 部署合约时 to 为 null
  value: '0',
  data: deployData
};

// 估算 Gas
const thorClient = ThorClient.at('https://testnet.vechain.org');
const gasResult = await thorClient.gas.estimateGas([clause], sender.address);

// 构建交易
const txBody = await thorClient.transactions.buildTransactionBody(
  [clause],
  gasResult.totalGas
);

// 签名并发送
const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
const result = await thorClient.transactions.sendTransaction(signedTx);

console.log('部署交易已发送:', result.id);

// 等待确认
const receipt = await thorClient.transactions.waitForTransaction(result.id);

if (receipt.reverted) {
  console.log('部署失败');
} else {
  // 合约地址在 receipt.outputs[0].contractAddress
  const contractAddress = receipt.outputs[0].contractAddress;
  console.log('合约已部署,地址:', contractAddress);
}
```

### 部署时转账

部署 payable 构造函数的合约时可以转账。

```ts
const clause = {
  to: null,
  value: VET.of(10).toString(),  // 部署时转账 10 VET
  data: deployData
};
```

## 常用合约交互模式

### ERC20/VIP-180 Token

```ts
class TokenContract {
  constructor(
    private address: string,
    private thorClient: ThorClient
  ) {}

  // 查询余额
  async balanceOf(owner: string): Promise<string> {
    const balanceOfABI = {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      type: 'function'
    };

    const data = abi.encodeFunctionInput(balanceOfABI, [owner]);
    const result = await this.thorClient.contracts.executeCall(this.address, data);
    const balance = abi.decodeFunctionOutput(balanceOfABI, result.data)[0];

    return balance.toString();
  }

  // 查询总供应量
  async totalSupply(): Promise<string> {
    const totalSupplyABI = {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: '', type: 'uint256' }],
      type: 'function'
    };

    const data = abi.encodeFunctionInput(totalSupplyABI, []);
    const result = await this.thorClient.contracts.executeCall(this.address, data);
    const supply = abi.decodeFunctionOutput(totalSupplyABI, result.data)[0];

    return supply.toString();
  }

  // 转账
  async transfer(
    from: { address: string; privateKey: string },
    to: string,
    amount: string
  ): Promise<string> {
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

    const callData = abi.encodeFunctionInput(transferABI, [to, amount]);

    const clause = {
      to: this.address,
      value: '0',
      data: callData
    };

    const gasResult = await this.thorClient.gas.estimateGas([clause], from.address);
    const txBody = await this.thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    const signedTx = Transaction.of(txBody).sign(
      HexUInt.of(from.privateKey).bytes
    );

    const result = await this.thorClient.transactions.sendTransaction(signedTx);
    return result.id;
  }

  // 授权
  async approve(
    owner: { address: string; privateKey: string },
    spender: string,
    amount: string
  ): Promise<string> {
    const approveABI = {
      constant: false,
      inputs: [
        { name: '_spender', type: 'address' },
        { name: '_value', type: 'uint256' }
      ],
      name: 'approve',
      outputs: [{ name: 'success', type: 'bool' }],
      type: 'function'
    };

    const callData = abi.encodeFunctionInput(approveABI, [spender, amount]);

    const clause = {
      to: this.address,
      value: '0',
      data: callData
    };

    const gasResult = await this.thorClient.gas.estimateGas([clause], owner.address);
    const txBody = await this.thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    const signedTx = Transaction.of(txBody).sign(
      HexUInt.of(owner.privateKey).bytes
    );

    const result = await this.thorClient.transactions.sendTransaction(signedTx);
    return result.id;
  }

  // 查询授权额度
  async allowance(owner: string, spender: string): Promise<string> {
    const allowanceABI = {
      constant: true,
      inputs: [
        { name: '_owner', type: 'address' },
        { name: '_spender', type: 'address' }
      ],
      name: 'allowance',
      outputs: [{ name: 'remaining', type: 'uint256' }],
      type: 'function'
    };

    const data = abi.encodeFunctionInput(allowanceABI, [owner, spender]);
    const result = await this.thorClient.contracts.executeCall(this.address, data);
    const allowance = abi.decodeFunctionOutput(allowanceABI, result.data)[0];

    return allowance.toString();
  }
}

// 使用示例
const thorClient = ThorClient.at('https://testnet.vechain.org');
const token = new TokenContract('0x...', thorClient);

// 查询余额
const balance = await token.balanceOf('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');
console.log('余额:', balance);

// 转账
const txId = await token.transfer(
  {
    address: '0x...',
    privateKey: '0x...'
  },
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
  '1000000000000000000'
);
console.log('转账交易:', txId);
```

### NFT (ERC721/VIP-181)

```ts
class NFTContract {
  constructor(
    private address: string,
    private thorClient: ThorClient
  ) {}

  // 查询 NFT 拥有者
  async ownerOf(tokenId: string): Promise<string> {
    const ownerOfABI = {
      constant: true,
      inputs: [{ name: '_tokenId', type: 'uint256' }],
      name: 'ownerOf',
      outputs: [{ name: '', type: 'address' }],
      type: 'function'
    };

    const data = abi.encodeFunctionInput(ownerOfABI, [tokenId]);
    const result = await this.thorClient.contracts.executeCall(this.address, data);
    const owner = abi.decodeFunctionOutput(ownerOfABI, result.data)[0];

    return owner;
  }

  // 转移 NFT
  async transferFrom(
    from: { address: string; privateKey: string },
    to: string,
    tokenId: string
  ): Promise<string> {
    const transferFromABI = {
      constant: false,
      inputs: [
        { name: '_from', type: 'address' },
        { name: '_to', type: 'address' },
        { name: '_tokenId', type: 'uint256' }
      ],
      name: 'transferFrom',
      outputs: [],
      type: 'function'
    };

    const callData = abi.encodeFunctionInput(transferFromABI, [
      from.address,
      to,
      tokenId
    ]);

    const clause = {
      to: this.address,
      value: '0',
      data: callData
    };

    const gasResult = await this.thorClient.gas.estimateGas([clause], from.address);
    const txBody = await this.thorClient.transactions.buildTransactionBody(
      [clause],
      gasResult.totalGas
    );

    const signedTx = Transaction.of(txBody).sign(
      HexUInt.of(from.privateKey).bytes
    );

    const result = await this.thorClient.transactions.sendTransaction(signedTx);
    return result.id;
  }

  // 查询 Token URI
  async tokenURI(tokenId: string): Promise<string> {
    const tokenURIABI = {
      constant: true,
      inputs: [{ name: '_tokenId', type: 'uint256' }],
      name: 'tokenURI',
      outputs: [{ name: '', type: 'string' }],
      type: 'function'
    };

    const data = abi.encodeFunctionInput(tokenURIABI, [tokenId]);
    const result = await this.thorClient.contracts.executeCall(this.address, data);
    const uri = abi.decodeFunctionOutput(tokenURIABI, result.data)[0];

    return uri;
  }
}
```

## ABI 编码和解码

### 编码函数输入

```ts
import { abi } from '@vechain/sdk-core';

// 单个参数
const encoded1 = abi.encodeParameter('uint256', '123');

// 多个参数
const encoded2 = abi.encodeParameters(
  ['address', 'uint256', 'string'],
  ['0x7567d83b7b8d80addcb281a71d54fc7b3364ffed', '1000', 'hello']
);

// 使用函数 ABI
const functionABI = {
  name: 'transfer',
  inputs: [
    { name: '_to', type: 'address' },
    { name: '_value', type: 'uint256' }
  ],
  type: 'function'
};

const encoded3 = abi.encodeFunctionInput(functionABI, [
  '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
  '1000000000000000000'
]);
```

### 解码函数输出

```ts
// 解码单个返回值
const decoded1 = abi.decodeParameter('uint256', '0x...');

// 解码多个返回值
const decoded2 = abi.decodeParameters(
  ['uint256', 'string', 'bool'],
  '0x...'
);

// 使用函数 ABI
const decoded3 = abi.decodeFunctionOutput(functionABI, '0x...');
console.log(decoded3[0]); // 第一个返回值
console.log(decoded3[1]); // 第二个返回值
```

### 编码和解码事件

```ts
// 事件 ABI
const eventABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'value', type: 'uint256' }
  ],
  name: 'Transfer',
  type: 'event'
};

// 解码事件
const decoded = abi.decodeEventLog(
  eventABI,
  log.data,    // 非索引参数
  log.topics   // 索引参数
);

console.log('From:', decoded.from);
console.log('To:', decoded.to);
console.log('Value:', decoded.value.toString());
```

## 最佳实践

### 1. 错误处理

```ts
async function callContract() {
  try {
    const result = await thorClient.contracts.executeCall(
      contractAddress,
      callData
    );

    // 检查是否回滚
    if (result.reverted) {
      console.error('调用失败');
      return;
    }

    const decoded = abi.decodeFunctionOutput(functionABI, result.data);
    return decoded;
  } catch (error) {
    console.error('合约调用错误:', error);
    throw error;
  }
}
```

### 2. Gas 优化

```ts
// ✅ 批量读取
const results = await Promise.all([
  contract.balanceOf(address1),
  contract.balanceOf(address2),
  contract.balanceOf(address3)
]);

// ✅ 批量写入（一笔交易）
const clauses = [
  { to: token1, value: '0', data: approveData1 },
  { to: token2, value: '0', data: approveData2 }
];

// ❌ 分别发送（浪费 Gas）
await contract.approve(...);
await contract.approve(...);
```

### 3. ABI 管理

```ts
// 使用常量存储 ABI
const ERC20_ABI = [...];
const ERC721_ABI = [...];

// 或从文件加载
import tokenABI from './abis/Token.json';
```

### 4. 类型安全

```ts
// 使用 TypeScript 接口
interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

async function getTokenInfo(address: string): Promise<TokenInfo> {
  // 实现...
}
```

## 总结

合约交互是 DApp 开发的核心,掌握以下要点:

**关键知识:**
- ABI 定义了合约接口
- 读取操作不需要 Gas,写入操作需要
- 使用 `abi` 工具进行编码和解码
- 事件用于监听合约状态变化

**推荐实践:**
- 封装常用合约为类
- 批量操作节省 Gas
- 正确处理错误和回滚
- 使用类型安全的接口

**推荐阅读:**
- [Clause 文档](clause.md) - 了解交易子句
- [Transaction 文档](transaction.md) - 了解交易构建
- [ThorClient 文档](thor-client.md) - 了解客户端 API

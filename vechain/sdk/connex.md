# Connex

> 官方提供的浏览器环境 SDK，用于与 VeChainThor 网络交互。前端 DApp 与钱包（如 Veworld）连接、签名交易、调用合约等。

## 安装

Connex 支持三种安装方式，各自环境略有差异，但功能一致。

### 浏览器环境

浏览器实现：这种常规使用与类似于 EIP-1193 标准的 dApp 开发一致。在这种情况下，Connex 促进了与 `Sync/Sync2` 或 `VeWorld`
的连接。此方法有两个子方法：`NPM` 和 `CDN`。

:::code-group

```bash [NPM]
npm install @vechain/connex
```

```html [CDN]

<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>Connex Test Project</title>

  <!-- install the latest v2 -->
  <script src="https://unpkg.com/@vechain/connex@2"></script>
</head>

<body>
<script>
  // Initialize Connex on mainnet
  const connex = new Connex({
    node: 'https://mainnet.veblocks.net/',
    network: 'main'
  })

  // Simple log of genesis block id
  console.log(connex.thor.genesis.id)
</script>
</body>

</html>
```

:::

以下是使用 Connex 和 React 的代码片段：

```tsx
import {Connex} from '@vechain/connex'
import {useMemo} from 'react'

/**
 * Connex instance
 */
const connexInstance = new Connex({
  node: 'https://mainnet.veblocks.net/',
  network: 'main'
})

export default function useConnext() {
  // 封装hook全局使用，使用useMemo可以避免二次渲染生成connex
  const connex: Connex = useMemo(() => {
    return connexInstance
  }, [connexInstance])

  return connex;
}
```

### NodeJS/CLI环境

```bash
npm install @vechain/connex-framework @vechain/connex-driver
```

以下是**创建低层级 Connex 实例**的标准示例 —— 适用于 Node.js / CLI 环境，使用 `@vechain/connex-framework` 和
`@vechain/connex-driver` 包来构建 connex 实例，方便你进行链上数据访问、合约调用或发送交易：

```js
const {Driver, SimpleNet, SimpleWallet, Framework} = require('@vechain/connex-framework');

async function createConnex() {
  // 连接 VeChain 节点（你可以替换为 testnet/mainnet）
  const url = 'https://mainnet.veblocks.net';
  const net = new SimpleNet(url);

  // 初始化钱包并导入私钥
  const wallet = new SimpleWallet();
  wallet.import('0xPRIVATE_KEY_HERE'); // 替换成你的私钥
  wallet.signer(wallet.list()[0]); // 选择当前签名者

  // 创建 Driver（驱动器）
  const driver = await Driver.connect(net, wallet);

  // 创建 Connex 实例（Framework）
  const connex = new Framework(driver);

  return connex;
}
```

## Connex 模块

Connex 是 VeChain 提供的官方区块链交互标准接口，封装了链上数据访问（`Thor`）与用户签名交互（`Vendor`）两大核心模块。

它允许开发者轻松读取区块链信息、调用合约方法，并通过钱包发起安全交易，是构建 VeChain DApp 的基础工具。

### Connex.Thor

> `Connex.Thor` 区块链数据访问模块, 提供对 VeChainThor 区块链状态的读取能力，包括：
> - 区块、交易、账户信息获取
> - 合约方法调用（只读 `call`）
> - 构造合约交易数据（`asClause`）

**1. 创世区块 `connex.thor.genesis`** : 获取的就是 VeChain 区块链的第一区块，也就是创世区块（Genesis Block）。

```ts
console.log(connex.thor.genesis)

> {
  "beneficiary": "0x0000000000000000000000000000000000000000",
  "gasLimit": 10000000,
  "gasUsed": 0,
  "id": "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127",
  "number": 0,
  "parentID": "0xffffffff00000000000000000000000000000000000000000000000000000000",
  "receiptsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
  "signer": "0x0000000000000000000000000000000000000000",
  "size": 170,
  "stateRoot": "0x4ec3af0acbad1ae467ad569337d2fe8576fe303928d35b8cdd91de47e9ac84bb",
  "timestamp": 1530014400,
  "totalScore": 0,
  "transactions": [],
  "txsRoot": "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0"
}
```

**2. 获取区块链状态 `connex.thor.status`**: 它返回当前链的实时状态信息。

```ts
console.log(connex.thor.status)

> {
  "head": {
    "id": "0x0154c76eb09527cd6028a364bd446af975252b4a8cbc3de587081f7ab7c06d50",
    "number": 22333294, // 最新区块高度
    "timestamp": 1753862360,
    "parentID": "0x0154c76d991cd3477d534599d2b43daca7f85e4650ef24ceda2fbba822ccb2c4",
    "txsFeatures": 1,
    "gasLimit": 40000000,
    "baseFeePerGas": "0x9184e72a000"
  },
  "progress": 1,
  "finalized": "0x0154c56cf88638fcead21bb7235dfff22ad8c091cd1816fea62aae2abc3b5d57"
}
```

**3. 实时追踪区块变化 `connex.thor.ticker`**: Ticker 是一个异步生成器，每当链上产生一个新区块，它就会 "tick" 一次。

- 监听新区块生成事件
- 驱动前端 UI 自动刷新（如交易状态、区块号、余额等）
- 实现轮询逻辑而不浪费资源

```ts
const ticker = connex.thor.ticker();

async function watchBlocks() {
  while (true) {
    await ticker.next(); // 等待新区块
    const status = connex.thor.status;
    console.log('📦 New block:', status.head);
  }
}

watchBlocks();
```

> [!INFO]
> 链上状态只有在新区块产生时才可能“发生变化”， 所以监听新区块是一种 精准、高效、资源友好 的 UI 刷新机制。
> 相比起用 setInterval 每 2 秒轮询链数据，`ticker.next()` 是：更节能、更及时、更准确。

**4. 区块完整信息 `connex.thor.block`**:

```ts
// Connex 获取最新区块
connex.thor.block().get().then(block => {
  console.log("当前区块高度:", block.number);
  console.log("交易数量:", block.transactions.length);
})

> {
  "id": "0xabc123...",
  "number": 22296276,
  "parentID": "0xdef456...",
  "timestamp": 1753000400,
  "gasLimit": 40000000,
  "beneficiary": "0xb4094c25f86d628fdd571afc4077f0d0196afb48",
  "gasUsed": 10321,
  "totalScore": 206413592,
  "txRoot": "0x...",
  "stateRoot": "0x...",
  "signer": "0xb4094c25f86d628fdd571afc4077f0d0196afb48",
  "transactions": [
    "0x015436d40ff80e77e60c6c838e91734e5fd31e01676d4be4a733dff7fa72b89f",
    "0xabc..."
  ],
  "isTrunk": true,
  "txFeatures": 1
}

```

**5. 账户访客 `connex.thor.account(address)`**: 它提供了一组方法来访问该地址的链上数据，例如余额、代码、存储槽、合约方法等。

**Account Visitor（账户访客）能力：**

- `.get()`: 获取账户基本信息（余额、codeHash、hasCode 等）
- `.getCode()`: 获取该地址的字节码（合约代码）
- `.getStorage(key)`: 读取特定存储槽的值（对某些合约有用）
- `.method(abi)`: 构造合约调用器，用于 `.call()` 或 `.asClause()`

:::code-group

```ts 
const account = connex.thor.account('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed')
account.get().then(accInfo => {
  console.log(accInfo)
})

> {
  "balance": "0xe95ea52e8e07eddd24e",
  "energy": "0x920d91d3ff3bb7f1d527",
  "hasCode": false
}
```

```ts [getCode]
const account = connex.thor.account('0x0000000000000000000000000000456E65726779')
account.getCode().then(code => {
  console.log(code)
})

> {
  "code": "0x6080604052600436106100af576000357c010000000000000000000000000000000000..."
}

> {
  "code": "0x" // 非合约地址
}
```

```ts [getStorage]
const acc = connex.thor.account('0x0000000000000000000000000000456E65726779')
acc.getStorage('0x0000000000000000000000000000000000000000000000000000000000000001').then(storage => {
  console.log(storage)
})

> {
  "value": "0x7107c9b15a7254dd92173d5421359b33bf40ea4ef0fa278ceaf1d320659d5c7b..."
}
```

```ts [method]
const nameABI = {
  "constant": true,
  "inputs": [],
  "name": "name",
  "outputs": [{"name": "", "type": "string"}],
  "payable": false,
  "stateMutability": "pure",
  "type": "function"
}

const acc = connex.thor.account('0x0000000000000000000000000000456E65726779')
const method = acc.method(nameABI)
```

:::

在 Connex 中，`.method(abi)` 是 Account Visitor 提供的一个方法，用于：基于 ABI 构造一个合约函数调用器（Method Caller 或
Clause Builder）。

**它返回一个封装对象，你可以用它来：**

- `.call(...args)`: 只读地调用 view/pure 函数，不消耗 gas，不发交易
- `.asClause(...args)`: 构造交易片段（clause），可发送到链上执行，用于 payable/写入函数
- `.transact(...args)`: 用于直接调用合约函数并发起链上交易，用于 payable/写入函数

**`.method(abi)` 返回的 Thor.Method 对象:** 配置链上调用参数的方法（链式调用）。

| 方法                              | 说明                                         |
|---------------------------------|--------------------------------------------|
| `.value(val: string \| number)` | 设置调用的 `msg.value`，也就是发送给合约的 VET 金额。        |
| `.caller(addr: string)`         | 设置调用者地址，用于模拟调用时（`call()`），不设置默认为当前 signer。 |
| `.gas(gas: string)`             | 设置此次调用允许使用的最大 Gas 限制（非必须）。                 |
| `.gasPrice(gp: string)`         | 设置调用使用的 gasPrice，单位为 wei。                  |
| `.gasPayer(addr: string)`       | 设置谁负责支付 Gas（用于支持 Gas delegation）。          |

```ts
const transferABI = {
  constant: false,
  inputs: [
    {name: "_to", type: "address"},
    {name: "_amount", type: "uint256"}
  ],
  name: "transfer",
  outputs: [
    {name: "success", type: "bool"}
  ],
  payable: false,
  stateMutability: "nonpayable",
  type: "function"
};

const transferMethod = connex.thor
  .account('0x0000000000000000000000000000456E65726779')
  .method(transferABI);

transferMethod
  .caller('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed') // 设置模拟调用的发起人地址（Bob）
  .gas(100000) // 限定最大 gas（模拟使用）
  .gasPrice('1000000000000000'); // 模拟调用的 gasPrice（单位为 wei）

transferMethod.call('0xd3ae78222beadb038203be21ed5ce7c9b1bff602', 1).then(output => {
  console.log(output);
});
```

---

**`.call(...args)` 示例：** 只读地调用 view/pure 函数。

```ts
const contractAddress = "0x0000000000000000000000000000456E65726779";
const method = connex.thor.account(contractAddress).method(nameABI);

const result = await method.call();
console.log("Token Name:", result.decoded[0]);
```

**`.asClause(...args)` 示例：** 构造交易片段（多操作交易） 。

```ts
const method = connex.thor
  .account("0x合约地址")
  .method(transferABI);

const clause = method
  .value("0") // 可选：发送 VET 数量（通常为 0）
  .asClause("0x收款地址", "1000000000000000000"); // 发送 1 token
```

**`.transact()` 示例：** 这是 Connex 提供的一个 语法糖方法，用于简化：`.asClause(...args)`（构造交易片段）然后
`.sign('tx', [clause])`（发起签名请求）

```ts
const transferABI = {
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    {name: '_to', type: 'address'},
    {name: '_amount', type: 'uint256'}
  ],
  outputs: [{name: 'success', type: 'bool'}]
};

const method = connex.thor.account(tokenAddress).method(transferABI);

await method.transact('0x123...abc', '1000000000000000000').request(); // 发送 1 Token
```

> [!TIP] 签名钱包
> 在 Connex 版本 2.1.0 中，VeWorld 的自动检测已被禁用。它需要更复杂的处理才能自动连接到
>
VeWorld，具体取决于用户安装的内容。[自动支持 VeWorld 助手](https://blog.vechain.energy/connex-2-1-0-helper-to-automatically-support-veworld-and-sync2-b0633835fa0f)

**6. 交易访问者 `connex.thor.transaction`:** 获取并“访问”某个交易的执行详情（类似访问者模式的行为）

:::code-group

```ts [获取交易的基本信息]
const transaction = connex.thor.transaction('tx_id')

transaction.get().then(tx => {
  console.log(tx)
})
> {
  "id": "0x9daa5b584a98976dfca3d70348b44ba5332f966e187ba84510efb810a0f9f851",
  "chainTag": 39,
  "blockRef": "0x00003abac0432454",
  "expiration": 720,
  "clauses": [
    {
      "to": "0x7567d83b7b8d80addcb281a71d54fc7b3364ffed",
      "value": "0x152d02c7e14af6800000",
      "data": "0x"
    }
  ],
  "gasPriceCoef": 128,
  "gas": 21000,
  "origin": "0xe59d475abe695c7f67a8a2321f33a856b0b4c71d",
  "nonce": "0x12256df6fb",
  "dependsOn": null,
  "size": 128,
  "meta": {
    "blockID": "0x00003abbf8435573e0c50fed42647160eabbe140a87efbe0ffab8ef895b7686e",
    "blockNumber": 15035,
    "blockTimestamp": 1530164750
  }
}
```

```ts [获取交易的执行结果]
const transaction = connex.thor.transaction('tx_id')

transaction.getReceipt().then(tx => {
  console.log(tx)
})
> {
  "gasUsed": 21000,
  "gasPayer": "0xe59d475abe695c7f67a8a2321f33a856b0b4c71d",
  "paid": "0x1b5b8c4e33f51f5e8",
  "reward": "0x835107ddc632302c",
  "reverted": false,
  "meta": {
    "blockID": "0x00003abbf8435573e0c50fed42647160eabbe140a87efbe0ffab8ef895b7686e",
    "blockNumber": 15035,
    "blockTimestamp": 1530164750,
    "txID": "0x9daa5b584a98976dfca3d70348b44ba5332f966e187ba84510efb810a0f9f851",
    "txOrigin": "0xe59d475abe695c7f67a8a2321f33a856b0b4c71d"
  },
  "outputs": [
    {
      "contractAddress": null,
      "events": [],
      "transfers": []
    }
  ]
}
```

:::

**7. 过滤器 `connex.thor.filter`:** 用于监听链上事件（logs）或 VET 资金流转（transfers）

支持两类过滤器：

- 事件过滤器（`event`） – 监听合约触发的事件（Log）
- 转账过滤器（`transfer`） – 监听原生 VET 的转账

:::code-group

```ts [事件过滤器]
// 1. 获取事件的 topic: 必须精确匹配参数类型
const topic = ethers.id("Transfer(address,address,uint256)");

// 2. 创建过滤器
const filter = connex.thor.filter('event', {
  address: '0x合约地址',
  topics: [
    topic // 事件的 topic（事件签名的 keccak256 hash）
  ]
});

// 3. 查询事件：Max_Count最大不能超过256
const result = await filter.order('desc').range([fromBlock, toBlock]).apply(0, Max_Count);
```

```ts [转账过滤器]
const transferEventABI = {
  anonymous: false,
  inputs: [
    {indexed: true, name: '_from', type: 'address'},
    {
      indexed: true,
      name: '_to',
      type: 'address',
    },
    {indexed: false, name: '_value', type: 'uint256'},
  ],
  name: 'Transfer',
  type: 'event',
};
const transferEvent = connex.thor
  .account('Token Address')
  .event(transferEventABI);

const block = await connex.thor.block().get();
if (!block) return;

const filter = transferEvent.filter([
  {
    _to: 'receipt address',
  },
]);

filter
  .order('desc') // Work from the last event
  .range({
    unit: 'block',
    from: 10000,
    to: block.number,
  });
filter.apply(0, 1).then((logs) => {
  console.log(logs);
});
```

```ts [监听地址 A → 地址 B 的转账]
const contractAddress = '0xYourTokenContractAddress';
const fromAddress = '0xFromAddress';
const toAddress = '0xToAddress';

const transferEvent = connex.thor.account(contractAddress).event({
  anonymous: false,
  inputs: [
    { indexed: true, name: '_from', type: 'address' },
    { indexed: true, name: '_to', type: 'address' },
    { indexed: false, name: '_value', type: 'uint256' }
  ],
  name: 'Transfer',
  type: 'event'
});

// 当前区块高度
const block = await connex.thor.block().get();

// 创建过滤器
const filter = transferEvent.filter([{ _from: fromAddress, _to: toAddress }])
  .range({ unit: 'block', from: block.number - 5000, to: block.number })
  .order('desc');

// 应用过滤器，最多返回 256 条
const logs = await filter.apply(0, 10);

console.log(logs);
```

:::

**8. 交易模拟器 `connex.thor.explain()`**:
> 是 VeChain Connex 中提供的一个 交易模拟器，用于预测交易在链上执行的结果，但 不会真正提交交易。这是 DApp
> 开发中非常关键的工具，主要用于防止失败交易、预先判断行为效果。

```ts
const transferMethod = connex.thor
  .account(tokenAddress)
  .method(transferAbi);

const clause = transferMethod.asClause(toAddress, amount);
const result = await connex.thor.explain([clause]).execute()

if (result[0].reverted) {
  console.error('交易会失败:', result.vmError || result.revertReason);
} else {
  console.log('预计成功，返回值:', result.decoded);
}
```

### Connex.Vendor

> `Connex.Vendor` 用户交互与交易签名模块, 发起需要用户签名的行为，例如：
> - 发送交易（tx）
> - 签名消息（message）
> - 构造多操作交易（multi-clause）
> - 支持 Gas 赞助（VIP-191）

由于默认的 `Connex.Vendor` 不支持最新的 Veworld 钱包签署消息，因此我们封装一个 Vendor 助手，可以自动连接 Veworld。

```ts
type NetworkName = 'test' | 'main';

const NetworkGenesisIds: Record<NetworkName, string> = {
  main: '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
  test: '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127',
};

export default async function getVechainVendor(networkName: NetworkName): Promise<Connex.Vendor> {
  try {
    if ('vechain' in window && window.vechain) {
      const connexFramework = await import('@vechain/connex-framework');
      return connexFramework.newVendor(
        window.vechain.newConnexSigner(NetworkGenesisIds[networkName])
      );
    }
    const Connex = await import('@vechain/connex');
    return new Connex.default.Vendor(networkName);
  } catch (error) {
    throw new Error(`Failed to initialize VeChain vendor for ${networkName} network`);
  }
}
```

**Vendor 模块用途概览:**

| 功能       | 方法                      | 用途说明              |
|----------|-------------------------|-------------------|
| 发起交易     | `sign('tx', clauses)`   | 用户签名并广播交易（VET/合约） |
| 身份认证（登录） | `sign('cert', payload)` | 获取带 signer 的认证签名  |
| 设置备注     | `.comment(string)`      | 给交易加说明备注（可选）      |
| 设置签名人    | `.signer(address)`      | 指定哪个地址签名（可选）      |
| 设置交易过期高度 | `.expiration(number)`   | 设置交易在哪个高度前有效      |

**Connex.Vendor.sign 方法签名：**

- `Vendor.sign(kind: 'tx'|'cert', msg: Array<TxMessage|CertMessage>): TxSigningService|CertSigningService`
- 如果 `kind === 'tx'`，返回 `Connex.Vendor.TxSigningService`（交易签名服务）
- 如果 `kind === 'cert'`，返回 `Connex.Vendor.CertSigningService`（证书签名服务）

**TxMessage 结构（交易签名用）:**

```ts
type TxMessage = {
  to: string;        // 接收方地址（或合约地址）
  value: string;     // 转账金额（单位为 wei 的字符串）
  data: string;      // 交易数据（如合约方法调用的 ABI 编码）
  comment?: string;  // 用户可读备注（可选）
  abi?: object;      // ABI 描述，仅钱包页面可以复制ABI，无法在区块链浏览器解析参数
}
```

```ts
const service = connex.vendor.sign('tx', [
  {
    to: '0xabc...',
    value: '1000000000000000000',
    data: '0x',
    comment: '发送 1 VET'
  },
  {
    // 其他交易子句
    // ...clasue
  }
]);

await service.signer('0xmyaddress').gas(20000).request();

```

---

**CertMessage 结构（身份认证/协议签名）:**

```ts
type CertMessage = {
  purpose: 'identification' | 'agreement'; // 认证用途：登录 或 协议确认
  payload: {
    type: 'text';       // 当前仅支持 'text'
    content: "签名内容";    // 要求用户签名的内容
  }
}
```

```ts
await vendor.sign('cert', {
  purpose: "identification",
  payload: {
    type: "text",
    content: "交易签署"
  }
}).request();
```

**启用 VIP-191 Gas 费委托（Gas Sponsorship）**

> VIP-191 是一种机制，允许通过设置 Fee Delegation 服务，由第三方 Sponsor（赞助人）来支付用户交易的 Gas 费用。适用于新用户免
> Gas 场景，常用于 DApp 提升用户体验。


**前提准备**：在 [VeChain.Energy](https://app.vechain.energy/) 部署Gas赞助网址，且部署了支持交易赞助的合约（合约支持
VIP-191）。

> Gas赞助合约负责给谁支付Gas费，你也可以部署一个合约给任何人。

```ts
const clause = {
  to: '0xd3ae78222beadb038203be21ed5ce7c9b1bff602',
  value: '1000000000000000000', // 1 VET
  data: '0x',
  comment: 'Transfer 1 VET'
};

connex.vendor
  .sign('tx', [clause])
  .delegate(sponsorServiceUrl, sponsorAddress) // sponsorAddress 可选
  .request()
  .then(result => {
    console.log('VIP-191 交易成功：', result);
  })
  .catch(error => {
    console.error('VIP-191 交易失败：', error);
  });
```

### 类型集合

**1. `Thor.Status`: 表示当前节点的状态：**

- `progress`：同步进度（0-1）
- `head`：当前节点最新区块摘要，包含 id, number, timestamp 等

**2. `Thor.Block`: 描述一个完整区块内容**

| 字段             | 类型         | 描述                       |
|----------------|------------|--------------------------|
| `id`           | `string`   | 区块的哈希值（block identifier） |
| `number`       | `number`   | 区块高度（Block Number）       |
| `parentID`     | `string`   | 上一个区块的哈希                 |
| `timestamp`    | `number`   | 区块时间戳（单位：秒）              |
| `gasLimit`     | `number`   | 此区块的 Gas 限制（上限）          |
| `beneficiary`  | `string`   | 出块者地址（会收到奖励）             |
| `gasUsed`      | `number`   | 实际使用的 Gas 总量             |
| `totalScore`   | `number`   | 主链的累积工作量（区块权重）           |
| `txRoot`       | `string`   | 交易根（Merkle Root）         |
| `stateRoot`    | `string`   | 状态根哈希                    |
| `signer`       | `string`   | 区块签名者地址                  |
| `transactions` | `string[]` | 此区块中所有交易的 ID 列表          |
| `isTrunk`      | `boolean`  | 是否在主链上（true 代表是）         |
| `txFeatures`   | `number`   | 当前支持的交易特性（位运算值）          |

**3. `Thor.Transaction`: 描述一个交易的基本信息**

| 字段             | 类型                 | 描述                              |             |
|----------------|--------------------|---------------------------------|-------------|
| `id`           | `string`           | 交易哈希 ID                         |             |
| `chainTag`     | `number`           | 主链识别标记（取自 genesis block 的最后一字节） |             |
| `blockRef`     | `string`           | 引用块的高度和块哈希                      |             |
| `expiration`   | `number`           | 交易过期块数量                         |             |
| `clauses`      | `Clause[]`         | 交易包含的多个子操作                      |             |
| `gasPriceCoef` | `number`           | Gas 价格系数                        |             |
| `gas`          | `number`           | 最大 Gas 使用量                      |             |
| `nonce`        | `string`           | 随机数，用于防止重放攻击                    |             |
| `origin`       | `string`           | 发起交易者地址                         |             |
| `delegator`    | `string`           | 如果使用 VIP-191，Gas 支付者地址          |             |
| `dependsOn`    | \`string           | null\`                          | 依赖的上一个交易 ID |
| `size`         | `number`           | RLP 编码后的交易大小（字节）                |             |
| `meta`         | `Transaction.Meta` | 包含区块 ID、时间戳等附加信息                |             |

**4. `Thor.Receipt`: 交易执行后的结果**

| 字段         | 类型                 | 描述                    |
|------------|--------------------|-----------------------|
| `gasUsed`  | `number`           | 实际消耗的 Gas 量           |
| `gasPayer` | `string`           | 实际支付 Gas 的地址（VIP-191） |
| `paid`     | `string`           | 实际支付的能量（hex）          |
| `reward`   | `string`           | 节点因出块获得的奖励            |
| `reverted` | `boolean`          | 交易是否被 VM 回滚           |
| `outputs`  | `Receipt.Output[]` | 每个 clause 的返回值与事件     |
| `meta`     | `Receipt.Meta`     | 区块与交易相关元数据            |

**5. `VM.Clause`: 交易中的单个子操作（操作单元）**

| 字段      | 类型       | 描述                      |                       |
|---------|----------|-------------------------|-----------------------|
| `to`    | `string` | `null`                  | 目标合约地址或 `null` 表示创建合约 |
| `value` | `string` | `number`                | 发送的 VET 数量（单位为 wei）   |
| `data`  | `string` | ABI 编码的函数调用或合约部署的初始化字节码 |                       |

**6. `Receipt.Output`: Clause 执行后的输出**

| 字段                | 类型              | 描述              |
|-------------------|-----------------|-----------------|
| `contractAddress` | `string`        | 创建合约后返回的地址（如有）  |
| `events`          | `VM.Event[]`    | 执行过程中产生的事件      |
| `transfers`       | `VM.Transfer[]` | 执行过程中产生的 VET 转账 |

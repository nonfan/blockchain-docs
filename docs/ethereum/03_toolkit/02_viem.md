# Viem

> [Viem 是一个现代的 **TypeScript 原生库**<Badge type="tip" text="2.x"/>](https://viem.sh/)，用于与 EVM 兼容的区块链进行交互。它是一个**模块化、轻量、强类型且无依赖的库**
> ，常用于构建 DApp、脚本、工具等。相比传统的 ethers.js，viem 更注重类型安全、Tree-shaking 和插件扩展能力。

**Viem 与 ethers.js 的对比**

| 特性              | Viem                           | Ethers.js                            |
|-----------------|--------------------------------|--------------------------------------|
| 类型安全            | ✅ 完整 TypeScript 类型推导           | ⚠️ 部分类型定义，类型宽泛                       |
| Tree-shaking 支持 | ✅ 优化打包体积                       | ❌ 不支持，打包体积较大                         |
| 模块化/插件机制        | ✅ 支持插件，如钱包连接、合约模块              | ❌ 不支持插件机制                            |
| 无外部依赖           | ✅ 完全无依赖，可在浏览器中直接运行             | ⚠️ 依赖部分 Node.js 模块，浏览器兼容需配置          |
| 原生多链支持          | ✅ 默认支持多链，如 mainnet, arbitrum 等 | ⚠️ 需要手动配置网络链信息                       |
| 钱包连接方式          | 通过 `WalletClient` 与第三方库集成      | 通常结合 `ethers.providers.Web3Provider` |
| 合约交互体验          | ✅ 强类型函数名与参数校验                  | ⚠️ 函数名字符串调用，缺乏编译期校验                  |
| 调试体验            | ✅ 报错提示明确、函数签名清晰                | ⚠️ 错误信息偏底层                           |
| 社区成熟度           | 🚧 新兴项目，文档完善中                  | ✅ 成熟，社区活跃，教程丰富                       |
| 适合场景            | 高度类型安全、模块化开发场景                 | 快速原型开发、脚本任务、成熟项目                     |

## 安装与初始化

```bash
npm install viem
# 或者
yarn add viem
```

**快速引入:**

```js
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});
```

## 客户端类型（Public / Wallet / WebSocket）

Viem 使用模块化的客户端设计，允许开发者根据用途创建不同类型的客户端。

### 公共客户端

> 用于链上数据读取，无需签名。

```js
import {createPublicClient, http} from 'viem';
import {mainnet} from 'viem/chains';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});
```

### 钱包客户端

> 用于交易签名和合约调用。

```js
import {createWalletClient, http} from 'viem';
import {mainnet} from 'viem/chains';
import {privateKeyToAccount} from 'viem/accounts';

const account = privateKeyToAccount('0xYourPrivateKey');
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});
```

### 自定义 Provider（Transport）

Viem 支持多种自定义传输方式，如：

- HTTP（默认）
- WebSocket
- 自定义 JSON-RPC 实现

```js
import {http, webSocket} from 'viem';

const wsClient = createPublicClient({
  chain: mainnet,
  transport: webSocket('wss://mainnet.infura.io/ws/v3/YOUR_API_KEY'),
});
```

**自定义链配置：**

```js
import {defineChain} from 'viem'
const monadTestnet = defineChain({
  id: 10143, // ✅ Monad Testnet Chain ID
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
      webSocket: ["wss://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
      webSocket: ["wss://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://explorer.testnet.monad.xyz",
    },
  },
});
```

## 获取链上数据

> Viem 提供了丰富的链上数据读取 API，可以通过 publicClient 获取区块信息、交易、Gas 价格等。

- 获取账户余额 `getBalance`

```js 
const balance = await publicClient.getBalance({
  address: '0xUserAddress',
});
console.log('ETH Balance:', balance);
```

- 获取当前区块号 `getBlockNumber`

```js
const blockNumber = await publicClient.getBlockNumber();
console.log('Block Number:', blockNumber);
```

- 获取当前 Gas Price `getGasPrice`

```js
const gasPrice = await publicClient.getGasPrice();
console.log('Gas Price:', gasPrice);
```

- 获取完整区块信息 `getBlock`

```js
const block = await publicClient.getBlock({blockNumber});
console.log('Block Info:', block);
```

- 获取交易详情 `getTransaction`

```js
const tx = await publicClient.getTransaction({hash: '0xTransactionHash'});
console.log('Tx Info:', tx);
```

- 获取交易收据 `getTransactionReceipt`

```js
const receipt = await publicClient.getTransactionReceipt({hash: '0xTransactionHash'});
console.log('Receipt:', receipt);
```

## 钱包账户与签名

使用私钥/助记词导入钱包

```js
import {privateKeyToAccount, mnemonicToAccount} from 'viem/accounts';

const account1 = privateKeyToAccount('0xYourPrivateKey');
const account2 = mnemonicToAccount('seed phrase ...');
```

本地签名消息 `signMessage`

```js
const signature = await walletClient.signMessage({
  account,
  message: 'Hello Viem',
});
```

签名交易 `signTransaction`

```js
const tx = await walletClient.signTransaction({
  account,
  to: '0xReceiverAddress',
  value: parseEther('0.01'),
});
```

## 合约交互（读/写）

Viem 提供了强类型的方式来与智能合约进行交互，包括读取合约状态和发送交易调用函数。

- 定义 ABI

你需要提供合约的 ABI，通常使用 JSON 格式或直接编写 TypeScript 对象：

```js
const abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'account', type: 'address'}],
    outputs: [{name: '', type: 'uint256'}],
  },
];
```

- 读取合约状态（readContract）

```js
import {readContract} from 'viem/actions';

const balance = await readContract(client, {
  abi,
  address: '0xYourTokenAddress',
  functionName: 'balanceOf',
  args: ['0xUserAddress'],
});

console.log('Balance:', balance);
```

- 写入合约（writeContract）

```js
import {createWalletClient, http} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';

const account = privateKeyToAccount('0xYourPrivateKey');
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

const hash = await walletClient.writeContract({
  address: '0xYourContractAddress',
  abi,
  functionName: 'transfer',
  args: ['0xRecipientAddress', BigInt(1e18)],
});

console.log('Tx Hash:', hash);
```

### 编码与解码参数

- `encodeFunctionData`

将函数名与参数编码为交易数据（data 字段），可用于：构造 `eth_call` 请求和构造交易 `tx.data`

```js
import {encodeFunctionData} from 'viem';

const data = encodeFunctionData({
  abi,
  functionName: 'balanceOf',
  args: ['0xabc...'],
});
// 0x70a08231000000000000000000000000abc...
```

- `decodeFunctionResult`

将返回的 data（`eth_call` 或 `eth_getTransactionReceipt` 中的 result 字段）解码成人类可读格式。

```js
import {decodeFunctionResult} from 'viem';

const decoded = decodeFunctionResult({
  abi,
  functionName: 'balanceOf',
  data: '0x0000000000000000000000000000000000000000000000000000000000000064',
});
```

## 交易构造与发送

- 构造交易对象：`prepareTransactionRequest`

```js
const request = await walletClient.prepareTransactionRequest({
  account,
  to: '0xReceiverAddress',
  value: parseEther('0.01'),
});
```

会自动填充 `nonce`, `gas`, `gasPrice`, `chainId` 等字段，可以进一步传入 `data`, `gas`, `maxFeePerGas`,
`maxPriorityFeePerGas` 覆盖默认值。

- 发送交易：`sendTransaction`

```js
const hash = await walletClient.sendTransaction({
  account,
  to: '0xReceiverAddress',
  value: parseEther('0.01'),
});

```

会自动调用钱包签名并广播交易；返回交易哈希（可用于等待确认） ；如果用的是本地私钥账号（非浏览器钱包），会立即广播，不弹框。

- 估算 gas：`estimateGas`

> 用于预估交易所需 gas 量（避免 out-of-gas），返回值为 BigInt，可以作为 gasLimit 用于发送交易。

```js
const gas = await publicClient.estimateGas({
  account,
  to: '0xReceiverAddress',
  value: parseEther('0.01'),
});
```

## ENS 与 Utility 工具

- 解析 ENS 域名

```js
const address = await publicClient.resolveName({name: 'vitalik.eth'});
```

- 单位转换工具

```js
import {parseEther, formatEther} from 'viem';

formatEther(1000000000000000000n); // => "1.0"
parseEther('1.0'); // => 1000000000000000000n

```

- 十六进制编码与解码工具

```js
import {hexToString, stringToHex} from 'viem';

hexToString('0x68656c6c6f'); // => "hello"
stringToHex('hello'); // => "0x68656c6c6f"
```

## Event 与日志监听

- `getLogs` 获取日志

```js
import {parseAbiItem} from 'viem'
const logs = await publicClient.getLogs({
  address: '0xContractAddress',
  event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
})
```

- 事件过滤器构建

```js
import {parseAbiItem} from 'viem'
const logs = await publicClient.getLogs({
  address: '0xContractAddress',
  fromBlock: blockNumber - 1000n,
  event: parseAbiItem('event Approval(address indexed owner, address indexed spender, uint256 value)'),
})
```

- 监听链上事件 `watchContractEvent`

```js
import {parseAbiItem} from 'viem'
const unwatch = publicClient.watchContractEvent(
  {
    address: '0xContractAddress',
    abi,
    eventName: 'Transfer',
  },
  {
    onLogs: (logs) => {
      console.log('Transfer logs:', logs)
    },
  }
)
```

- 监听新区块 `watchBlockNumber`

```js
publicClient.watchBlockNumber({
  onBlockNumber: (blockNumber) => {
    console.log('新块号:', blockNumber);
  },
});

```

## 进阶用法

### Multicall 批量调用

```js
const result = await publicClient.multicall({
  contracts: [
    {
      address: '0xYourToken',
      abi,
      functionName: 'balanceOf',
      args: ['0x1'],
    },
    {
      address: '0xYourToken',
      abi,
      functionName: 'balanceOf',
      args: ['0x2'],
    },
  ],
})
```

### 自定义 RPC 方法调用

> 可发送任何标准或非标准 RPC 方法，非常适合定制化扩展。

```js
const gasPrice = await publicClient.request({
  method: 'eth_gasPrice',
});
```

### 传输容错（fallback）

```js
import {createPublicClient, http, fallback} from 'viem'
import {mainnet} from 'viem/chains'
const client = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http('https://eth-mainnet.g.alchemy.com/v2/...'),
    http('https://mainnet.infura.io/v3/...'),
  ]),
})
```

## 环境说明

- 浏览器：使用 `WalletClient` 连接注入钱包；读数据使用 `PublicClient`
- Node.js/SSR：使用 `PublicClient` 做读操作；需要签名时使用 `WalletClient` 并安全管理密钥
- 前端框架：`Wagmi` 在 React 中封装 `Viem` 的传输与客户端
- 浏览器缺失的 Node API 可按需 polyfill（如 `Buffer` 与 `process`）


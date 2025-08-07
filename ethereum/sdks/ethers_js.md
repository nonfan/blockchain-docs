# <div class="flex">Ethers.js <Badge type="tip" text="ether.js v6"/> </div>

> Ethers.js 是一个轻量、模块化、强大且注重安全的 JavaScript 库，专为与以太坊区块链进行交互而设计。它广泛用于前端 DApp
> 开发，也常用于 Node.js 脚本、合约部署与交互等场景。

## 简介与环境搭建

Ethers.js 是一个用于与以太坊兼容链进行交互的 JavaScript 库，核心特点如下：

- 内置安全机制（BigNumber、签名校验等）
- 采用纯模块系统，可单独引入 `providers`、`contracts`、`wallets`、`abi` 等子模块
- 支持多种 Provider（默认、Infura、Alchemy、本地 JSON-RPC 等）
- 支持浏览器与 Node.js 环境
- 体积小、零依赖、适合前端

### 安装

**依赖库：**

```bash
npm install ethers
# 或者
yarn add ethers
```

**按需引入：**

```js
// 导入整个 ethers 模块
import {ethers} from "ethers";

// 按需导入特定模块
import {BrowserProvider, parseUnits} from "ethers";

// 导入特定子模块
import {HDNodeWallet} from "ethers/wallet";

// 在浏览器中通过 CDN 引入
<script type="module">
  import {ethers} from "https://cdn.ethers.io/lib/ethers-6.7.0.esm.min.js";
</script>
```

## Provider

> Provider 是与区块链的只读连接，用于查询区块链状态（如账户余额、交易详情、事件日志等）或调用只读合约方法。

### 常见 Provider 类型

- `JsonRpcProvider`：连接到以太坊节点（如 Geth、Hardhat、Ganache）。

```js
const provider = new ethers.JsonRpcProvider("http://localhost:8545");
```

- `BrowserProvider`：用于浏览器环境，包装 MetaMask 等 Web3 提供者。

```js
const provider = new ethers.BrowserProvider(window.ethereum);
```

- `DefaultProvider`：连接多个后端服务（如 INFURA、Alchemy），提供可靠性和冗余。

```js
const provider = ethers.getDefaultProvider("homestead"); // 以太坊主网， 需要 API Key（第二参数传入）

const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com"); // 公共RPC，不需要API Key

```

### 常用方法

- `getBlockNumber()`：获取最新区块号。

```js
async function getBlockNumber() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const blockNumber = await provider.getBlockNumber();
  console.log("Current block:", blockNumber);
}
```

- `getBalance(address)`：查询账户余额。
- `getTransaction(transactionHash)`：获取交易详情。
- `getTransactionReceipt(transactionHash)`：获取交易收据。
- `getGasPrice()`：获取当前 gas 价格。
- `resolveName(name)`：解析 ENS 名称为地址(将人类可读的 ENS 名称（如 `vitalik.eth`）解析为实际的以太坊地址)。
- `on(eventName, listener)`：监听事件（如新区块）。

```js
const provider = new ethers.JsonRpcProvider("http://localhost:8545");
provider.on("block", (blockNumber) => console.log("New block:", blockNumber));
```

## Signer

> Signer 管理账户，负责签名交易或消息。

### 创建 Signer

:::code-group

```js [私钥获取]
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
```

```js [metamask 获取]
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

:::

### 常用方法

- `getAddress()`：获取签名者地址。

```js
async function getSignerAddress() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  console.log("Address:", await signer.getAddress());
}
```

- `sendTransaction(transaction)`：发送交易。

```js
async function sendEther(signer, to, value) {
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseEther(value),
    gasLimit: 21000,
  });
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Tx confirmed");
}
```

- `signMessage(message)`：签名消息。

```js
async function signMessage(signer, message) {
  const signature = await signer.signMessage(message);
  console.log("Signature:", signature);
}
```

- `connect(provider)`：连接到新 Provider。

```js
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY");
const provider = new ethers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_API_KEY");
const connectedWallet = wallet.connect(provider);
```

## Contract

> `Contract` 用于与智能合约交互，通过 ABI 调用方法或监听事件。

## 单位处理

在以太坊中，最小单位是 `wei`，`1 ETH = 1e18 wei`。为方便开发者使用和显示，Ethers.js 提供了以下工具函数来处理单位换算。

| 方法                             | 作用                            |
|--------------------------------|-------------------------------|
| `parseEther(value)`            | 将字符串形式的以太转换为 `BigInt` 的 `wei` |
| `formatEther(value)`           | 将 `wei` 转换为字符串形式的以太           |
| `parseUnits(value, decimals)`  | 将指定小数位的单位转换为 `wei`            |
| `formatUnits(value, decimals)` | 将 `wei` 格式化为指定小数位的单位          |

```js
import {parseEther, formatEther, parseUnits, formatUnits} from "ethers";

// 将 "1.5" ETH 转为 wei（BigInt）
const wei = parseEther("1.5"); // 1500000000000000000n

// 将 wei 转换为 ETH 字符串
console.log(formatEther(wei)); // "1.5"


// 将 "123.456" 转为 6 位小数的单位（如 USDC）
const usdcAmount = parseUnits("123.456", 6); // 123456000n

// 将 6 位小数单位转为字符串
console.log(formatUnits(usdcAmount, 6)); // "123.456"
```

> [!TIP] 总结
> - 通常 `parseEther`、`formatEther` 用于 ETH 金额处理。
> - 若是 ERC20 代币（如 USDT、USDC），需根据其 decimals 使用 `parseUnits` 与 `formatUnits`。
> - 所有转换结果都是 BigInt，以防止精度损失。

## 钱包与助记词

> Ethers.js 提供了强大的钱包管理功能，包括创建、恢复、导入导出等。钱包对象可用于签名交易、消息和连接网络。

### 创建钱包

`Wallet.createRandom()` 会使用安全随机数生成一个全新的钱包，并自动生成助记词（BIP-39）。

```js
const wallet = ethers.Wallet.createRandom();
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("Mnemonic:", wallet.mnemonic.phrase);
```

### 恢复钱包

`Wallet.fromPhrase() ` 支持标准 BIP-39 助记词恢复，默认 derivation path 为 `m/44'/60'/0'/0/0`。

```js
const mnemonic = "apple banana cherry ...";
const wallet = ethers.Wallet.fromPhrase(mnemonic);
console.log("Recovered Address:", wallet.address);
```

**通过私钥恢复钱包:**

```js
const wallet = new ethers.Wallet("0xabc123...私钥");
console.log(wallet.address);
```

### 钱包加密与导出

生成的 JSON 文件可用于 `MetaMask` 或 `Web3` 钱包导入，支持密码保护。

```js
const encryptedJson = await wallet.encrypt("your-password");
console.log("加密 JSON keystore:", encryptedJson);
```

### 解密导入 Keystore

```js
const wallet = await Wallet.fromEncryptedJson(encryptedJson, "your-password");
console.log("解密后的地址:", wallet.address);
```

## ENS（以太坊名称服务）

ENS 允许使用名称（如 `vitalik.eth`）替代地址。

```js
async function getEnsBalance(ensName) {
  const provider = ethers.getDefaultProvider("homestead");
  const balance = await provider.getBalance(ensName);
  return ethers.formatEther(balance);
}
getEnsBalance("vitalik.eth").then(balance => console.log("Balance:", balance));
```

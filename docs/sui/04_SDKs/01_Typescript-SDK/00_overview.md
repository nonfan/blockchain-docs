# SDK 概述

> Sui TypeScript SDK 是一个模块化的工具库，用于与 Sui 区块链交互。用它向 RPC 节点发送查询，构建和签署事务，并与 Sui 或本地网络交互。

`@mysten/sui` 是 Sui 官方提供的 TypeScript/JavaScript SDK，提供了完整的功能来：

- [x] 连接到 Sui 网络
- [x] 管理钱包和密钥对
- [x] 查询链上数据
- [x] 构建和发送交易
- [x] 与智能合约交互
- [x] 订阅链上事件
- [x] 异步操作和批量查询
- [x] 类型安全的 TypeScript API
- [x] Gas 管理和赞助交易
- [x] BCS 编码和解码

## Sui 网络

如下列举 Sui 网络节点：

| 网络      | 节点                                  | 水龙头                                 |
|---------|-------------------------------------|-------------------------------------|
| local   | `http://127.0.0.1:9000` default     | `http://127.0.0.1:9123/v2/gas`      |
| Devnet  | `https://fullnode.devnet.sui.io:443` | `https://faucet.devnet.sui.io/gas`  |
| Testnet | `https://fullnode.testnet.sui.io:443` | `https://faucet.testnet.sui.io/gas` |
| Mainnet | `https://fullnode.mainnet.sui.io:443` | `null`                              |

> [!WARNING] 生产环境防范
> 生产应用使用专用节点/共享服务，而不是公共端点。Mysten Labs 维护的公共端点（`fullnode.<NETWORK>.sui.io：443`）受速率限制，每 30 秒左右只支持 100 个请求。不要在流量大的生产应用中使用公共端点。

## Sui 模块化包

SDK 包含一组模块化包，你可以独立使用，也可以一起使用。导入你所需的内容，保持代码轻量紧凑。

- `@mysten/sui/client` - 用于与 Sui RPC 节点交互的客户端。
- `@mysten/sui/bcs` - 一个带有预定义类型类型的 Sui BCS 构建器。
- `@mysten/sui/transactions` — 用于构建和交互事务的公用事业。
- `@mysten/sui/keypairs/*` - 针对特定 KeyPair 实现的模块化导出。
- `@mysten/sui/verify` - 验证交易和消息的方法。
- `@mysten/sui/cryptography` — 密码学的共享类型和类。
- `@mysten/sui/multisig` - 处理多重签名的实用工具。
- `@mysten/sui/utils` - 用于格式化和解析各种 Sui 类型的工具。
- `@mysten/sui/faucet` - 从水龙头请求 SUI 的方法。
- `@mysten/sui/zklogin` - 用于使用 zkLogin 的工具。


## 安装和配置

### 环境要求

- Node.js <Badge type="tip" text=">=16.x"/>
- npm <Badge type="tip" text=">=9.x"/>
- Yarn <Badge type="tip" text=">=1.22.x"/>

### 安装 SDK

```bash
# 使用 npm
npm install @mysten/sui

# 使用 yarn
yarn add @mysten/sui

# 使用 pnpm
pnpm add @mysten/sui
```

### TypeScript 配置

创建或更新 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

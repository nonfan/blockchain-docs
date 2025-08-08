<script setup>import * as data from '../../.vitepress/data/wagmi';
const Hooks = data.Hooks;
const Actions = data.Actions;
</script>

# Wagmi

Wagmi（We Are All Gonna Make It）是一个强大的 React 库，专为 Web3 开发设计，提供了简洁的 API
和多链支持。它可以轻松处理钱包连接、交易签名、智能合约交互等任务，并支持多种钱包（如 MetaMask、Ledger Live）以及 Sign-in with
Ethereum 功能。Wagmi 还具有缓存、请求去重和持久化的特性，适合开发去中心化应用（DApp）、NFT 平台、DeFi 平台和 Web3 社交应用等。

## 安装

### 自动安装

对于新项目，建议使用 `create-wagmi` 命令行界面 （CLI） 设置您的 Wagmi 应用程序。这将使用 TypeScript 创建一个新的 Wagmi
项目并安装所需的依赖项。

:::code-group

```bash [npm]
npm create wagmi@latest
```

```bash [yarn]
yarn create wagmi
```

:::

### 手动安装

要开始使用 Wagmi，需要安装相关依赖。以下是安装步骤：

:::code-group

```bash [npm]
npm install wagmi viem@2.x @tanstack/react-query
```

```bash [yarn]
yarn add wagmi viem@2.x @tanstack/react-query
```

```js [CDN]
<script type="module">
  import React from 'https://esm.sh/react@18.2.0'
  import {QueryClient} from 'https://esm.sh/@tanstack/react-query'
  import {createClient} from 'https://esm.sh/viem@2.x'
  import {createConfig} from 'https://esm.sh/wagmi'
</script>
```

:::

- `wagmi`：核心库，提供与以太坊交互的 React Hooks。
- `@tanstack/react-query`：Wagmi 依赖的库，用于处理数据查询和缓存。

#### 创建配置

:::code-group

```ts [config]
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts [添加新RPC]
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

export const config = createConfig({
  chains: [mainnet, sepolia, monadTestnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
});
```

:::

#### WagmiProvider

将您的应用程序包装在 `WagmiProvider` React Context Provider 中，并将您之前创建的配置传递给 `config` 属性。

```tsx
import {WagmiProvider} from 'wagmi'
import {config} from './config'

function App() {
  return (
    <WagmiProvider config={config}>
      {/** ... */}
    </WagmiProvider>
  )
}
```

#### 设置 TanStack 查询

在 `WagmiProvider` 中，将您的应用程序包装在 `TanStack Query` React Context Provider（例如 QueryClientProvider）中，并将新的
QueryClient 实例传递给客户端属性。

```tsx
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {WagmiProvider} from 'wagmi'
import {config} from './config'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/** ... */}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## 连接钱包

用户连接钱包的能力是任何 Dapp 的核心功能。它允许用户执行诸如：写入合约、签署消息或发送交易等任务。

### 第三方钱包

| 库名称                                                 | 中文名                | 简介                             | 特点                  |
|-----------------------------------------------------|--------------------|--------------------------------|---------------------|
| **[ConnectKit](https://docs.family.co/connectkit)** | ConnectKit（连接组件工具） | Wagmi 团队维护的官方 UI 组件            | 极简、风格统一、完全兼容 wagmi  |
| **[AppKit](https://reown.com/appkit)**              | AppKit（应用工具组件）     | 基于 ConnectKit 的进一步封装，强调全流程用户引导 | 引导 + 连接 + 状态管理一体化   |
| **[RainbowKit](https://www.rainbowkit.com/)**       | 彩虹套件               | 由 Rainbow 团队出品的钱包连接 UI 工具      | 视觉体验最优秀之一，适合主流 DApp |
| **[Dynamic](https://www.dynamic.xyz/)**             | Dynamic（动态钱包 SDK）  | 允许你支持多种社交登录+钱包连接（Web2→Web3）    | 登录即钱包，适合 Web2 用户过渡  |
| **[Privy](https://privy.io/)**                      | 枢密院（Privy）         | 支持嵌入式钱包、邮箱/Google 登录等隐私钱包      | 内嵌钱包 + 身份管理，适合非加密用户 |

### 手动构建钱包

- 配置 `Wagmi`

```tsx
import {http, createConfig} from 'wagmi'
import {base, mainnet, optimism} from 'wagmi/chains'
import {injected, metaMask, safe, walletConnect} from 'wagmi/connectors'

const projectId = '<WALLETCONNECT_PROJECT_ID>'

export const config = createConfig({
  chains: [mainnet, base],
  connectors: [
    injected(),
    walletConnect({projectId}),
    metaMask(),
    safe(),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
})
```

> [!TIP] WalletConnect
> 如果您想使用 WalletConnect，请务必将 `projectId` 替换为您自己的 WalletConnect 项目 ID！
> [去获取项目 ID](https://cloud.reown.com/)

- `WagmiProvider` 导入配置文件 `config`。

```tsx
<WagmiProvider config={config}>
```

- 显示钱包选项

```tsx
import * as React from 'react'
import {Connector, useConnect} from 'wagmi'

export function WalletOptions() {
  const {connectors, connect} = useConnect()

  return connectors.map((connector) => (
    <WalletOption
      key={connector.uid}
      connector={connector}
      onClick={() => connect({connector})}
    />
  ))
}

function WalletOption({connector, onClick}: {
  connector: Connector
  onClick: () => void
}) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      const provider = await connector.getProvider()
      setReady(!!provider)
    })()
  }, [connector])

  return (
    <button disabled={!ready} onClick={onClick}>
      {connector.name}
    </button>
  )
}
```

## Hooks 集合

> 用于账户、钱包、合约、交易、签名、ENS 等的 React Hooks。

```tsx
import {useAccount} from 'wagmi'
```

<table>
  <thead>
    <tr>
      <th>Wagmi Hook</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="hook of Hooks">
    <th><a :href="'https://wagmi.sh/' + hook.link" target="_blank">{{ hook.text }}</a></th>
    <th>{{hook.description}}</th>
    </tr>
</tbody>
</table>

## Actions 集合

> 账户、钱包、合约、交易、签名、ENS 等的函数。

```tsx
import {getAccount} from '@wagmi/core'
```

<table>
  <thead>
    <tr>
      <th>Wagmi Action</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="actions of Actions">
    <th><a :href="'https://wagmi.sh/' + actions.link" target="_blank">{{ actions.text }}</a></th>
    <th>{{actions.description}}</th>
    </tr>
</tbody>
</table>


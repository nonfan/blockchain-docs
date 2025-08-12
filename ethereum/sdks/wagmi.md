<script setup>import * as data from '../../.vitepress/data/wagmi';
const Hooks = data.Hooks;
const Actions = data.Actions;
</script>

# Wagmi

[Wagmi（We Are All Gonna Make It）<Badge type="tip" text="2.x"/>](https://wagmi.sh/) 是一个强大的 React 库，专为 Web3
开发设计，提供了简洁的 API
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

> [!WARNING] TypeScript
> 类型当前需要使用 TypeScript >=5.0.4。为确保一切正常工作，请确保您的 `tsconfig.json` 将严格模式设置为 `true`。

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

#### 使用 Wagmi

> 现在一切都已设置完毕，Wagmi 和 TanStack 查询提供程序内的每个组件都可以使用 Wagmi React Hooks。

:::code-group

```tsx [profile.tsx]
import {useAccount, useEnsName} from 'wagmi'

export function Profile() {
  const {address} = useAccount()
  const {data, error, status} = useEnsName({address})
  if (status === 'pending') return <div>Loading ENS name</div>
  if (status === 'error')
    return <div>Error fetching ENS name: {error.message}</div>
  return <div>ENS name: {data}</div>
}
```

```tsx [app.tsx]
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {WagmiProvider} from 'wagmi'
import {config} from './config'
import {Profile} from './profile'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Profile/>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

```ts [config.ts]
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

:::

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

#### ConnectKit

> Wagmi 团队维护的官方 UI 组件

:::code-group

```bash [安装]
npm install connectkit
```

```ts [config.ts]
import {WagmiProvider, createConfig, http} from "wagmi";
import {mainnet} from "wagmi/chains";
import {ConnectKitProvider, getDefaultConfig} from "connectkit";

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [mainnet],
    transports: {
      // RPC URL for each chain
      [mainnet.id]: http(
        `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
      ),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

    // Required App Info
    appName: "Your App Name",

    // Optional App Info
    appDescription: "Your App Description",
    appUrl: "https://family.co", // your app's url
    appIcon: "https://family.co/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  }),
);

export default config
```

```tsx [ConnectKitProvider]
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ConnectKitProvider, ConnectKitButton} from "connectkit";
import config from "@/lib/config.ts";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="light">  {/*钱包容器*/}
          <ConnectKitButton/> {/*集成式钱包组件*/}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
```

:::

### 手动构建钱包

- 配置 `Wagmi`

:::code-group

```tsx [手动配置]
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

:::

> [!WARNING] WalletConnect
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

## 钱包连接器

> 用于连接常见钱包和区块链协议的适配器。

:::code-group

```ts {4,8} [BaseAccount]
// 基本Base链 SDK 的连接器。
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {baseAccount} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [baseAccount()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts {4,8} [Injected]
// 浏览器环境注入的以太坊 provider
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {injected} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts {4,8} [MetaMask]
// MetaMask SDK 的连接器。
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {metaMask} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [metaMask()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts {4,8} [Safe]
// 用于连接 Safe 应用 SDK 的适配器。
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {safe} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [safe()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts {4,9-11} [WalletConnect]
// WalletConnect 的连接器。https://reown.com/
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {walletConnect} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    walletConnect({
      projectId: '3fcc6bba6f1de962d911bb5b5c3dba68',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

```ts {4,9-15} [Mock]
// 用于模拟 Wagmi 功能的连接器。
import {createConfig, http} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'
import {mock} from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    mock({
      accounts: [
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      ],
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
```

:::

## Transports

`createConfig` 可以为每条链配置一组 传输层（Transports）。传输层是负责将发出的 JSON-RPC 请求发送到 RPC 提供者（比如
Alchemy、Infura 等）的中间层。

换句话说，传输层充当客户端和区块链节点之间的桥梁，确保请求正确发送并获得响应。

### custom

自定义传输（Custom Transport）通过自定义方式连接到 JSON-RPC API，封装了 Viem 库中的自定义传输功能。

```ts
import {
  createConfig,
  custom
} from 'wagmi'
import {mainnet} from 'wagmi/chains'
import {customRpc} from './rpc'

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: custom({
      async request({method, params}) {
        const response = await customRpc.request(method, params)
        return response
      }
    })
  },
})
```

### fallback

后备传输（fallback Transport） 会依次使用多个传输（Transports）。当某个传输请求失败时，它会自动切换到列表中的下一个传输继续请求。该功能封装了
Viem 库中的后备传输机制。

```ts
import {
  createConfig,
  fallback,
  http,
} from 'wagmi'
import {mainnet} from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: fallback([
      http('https://foo-bar-baz.quiknode.pro/...'),
      http('https://mainnet.infura.io/v3/...'),
    ])
  },
})
```

### http

http 传输（http Transport） 通过 HTTP 连接到 JSON-RPC API，封装了 Viem 库中的 http 传输功能。

```ts
import {
  createConfig,
  http
} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http('https://foo-bar-baz.quiknode.pro/...'),
    [sepolia.id]: http('https://foo-bar-sep.quiknode.pro/...'),
  },
})
```

### webSocket

WebSocket 传输（webSocket Transport） 通过 WebSocket 连接到 JSON-RPC API，封装了 Viem 库中的 webSocket 传输功能。

```ts
import {
  createConfig,
  webSocket
} from 'wagmi'
import {mainnet, sepolia} from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: webSocket('wss://foo-bar-baz.quiknode.pro/...'),
    [sepolia.id]: webSocket('wss://foo-bar-sep.quicknode.pro/...'),
  },
})
```

## WagmiProvider

Wagmi 的 React Context Provider 是一个 React 组件，用来在应用中全局提供 Wagmi 的配置和状态。

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

```ts
import { type WagmiProviderProps } from 'wagmi'
```

| Props 参数           | 说明                             |
|--------------------|--------------------------------|
| `config`           | Config 对象以注入上下文。               |
| `initialState`     | 初始状态，以水合到 Wagmi 配置中。对 SSR 很有用。 |
| `reconnectOnMount` | 控制组件挂载时是否自动尝试重新连接之前已连接的钱包。     |

## Hooks 集合

> 用于账户、钱包、合约、交易、签名、ENS 等的 React Hooks。

```tsx
import {useAccount} from 'wagmi'
```

wagmi 的 hooks 默认都会返回一个对象，常见的结构就是：

```text
{
  data,        // 请求成功后的返回数据，比如交易结果、读取到的链上数据
  isLoading,   // 请求是否正在进行中（loading 状态）
  isError,     // 是否出错（true/false）
  error,       // 具体的错误信息对象
  isSuccess,   // 是否成功完成
  ...
}
```

```ts
const {data, isLoading, isError, error} = useContractRead({
  address: '0xContractAddress',
  abi: contractAbi,
  functionName: 'balanceOf',
  args: [userAddress],
})
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


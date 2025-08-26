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

### 第三方钱包

| 库名称                                                 | 中文名                | 简介                             | 特点                  |
|-----------------------------------------------------|--------------------|--------------------------------|---------------------|
| **[ConnectKit](https://docs.family.co/connectkit)** | ConnectKit（连接组件工具） | Wagmi 团队维护的官方 UI 组件            | 极简、风格统一、完全兼容 wagmi  |
| **[AppKit](https://reown.com/appkit)**              | AppKit（应用工具组件）     | 基于 ConnectKit 的进一步封装，强调全流程用户引导 | 引导 + 连接 + 状态管理一体化   |
| **[RainbowKit](https://www.rainbowkit.com/)**       | 彩虹套件               | 由 Rainbow 团队出品的钱包连接 UI 工具      | 视觉体验最优秀之一，适合主流 DApp |
| **[Dynamic](https://www.dynamic.xyz/)**             | Dynamic（动态钱包 SDK）  | 允许你支持多种社交登录+钱包连接（Web2→Web3）    | 登录即钱包，适合 Web2 用户过渡  |
| **[Privy](https://privy.io/)**                      | 枢密院（Privy）         | 支持嵌入式钱包、邮箱/Google 登录等隐私钱包      | 内嵌钱包 + 身份管理，适合非加密用户 |

### ConnectKit

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

### AppKit

> AppKit 提供与多个区块链生态系统的无缝集成。.它支持以太坊上的 Wagmi 和 Ethers v6， Solana 以及比特币和其他网络上的
> @solana/web3.js。具有通用提供程序库的 AppKit 核心，可实现跨任何区块链协议的兼容性。

![App Kit](/examples/appkit.png)

#### 安装依赖

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

**Wagmi 配置示例：**

:::code-group

```ts [config.ts]
import {createAppKit} from '@reown/appkit/react'
import {mainnet} from '@reown/appkit/networks'
import {WagmiAdapter} from '@reown/appkit-adapter-wagmi'

// 1. 从 https://dashboard.reown.com 获取你的 projectId
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 2. 创建一个可选的 metadata 对象，用于描述你的应用
const metadata = {
  name: 'AppKit',                                  // 应用名称
  description: 'AppKit Example',                   // 应用描述
  url: 'https://example.com',                       // 应用网址，必须和你的域名和子域名匹配
  icons: ['https://avatars.githubusercontent.com/u/179229932']  // 应用图标列表
}

// 3. 设置支持的网络，这里是 Ethereum 主网 (mainnet)
//    使用类型断言确保 networks 是一个至少包含一个元素的元组类型
const networks = [mainnet] as [typeof mainnet, ...typeof mainnet[]];

// 4. 创建一个 Wagmi 适配器，负责连接钱包等功能
const wagmiAdapter = new WagmiAdapter({
  networks,       // 支持的网络列表
  projectId,      // WalletConnect 的项目 ID
  ssr: true,      // 是否支持服务端渲染 (Server-Side Rendering)
})

// 5. 创建 AppKit 模态框，传入适配器、网络、主题模式、项目 ID、元数据和功能配置
createAppKit({
  adapters: [wagmiAdapter],    // 传入适配器数组
  networks,                   // 支持的网络列表
  themeMode: "light",          // 主题模式，这里是浅色模式
  projectId,                  // WalletConnect 项目 ID
  metadata,                   // 应用元数据
  features: {
    analytics: true           // 是否启用分析功能，默认为你在云端的配置
  }
})

// 导出 wagmiAdapter 的配置，用于后续在应用中使用
export default wagmiAdapter.wagmiConfig
```

```ts [自定义网络]
// 以Monad测试网为示例
import {defineChain} from "viem";

const customNetwork = defineChain({
  id: 10143,
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
})

const networks = [mainnet, customNetwork] as [typeof mainnet, typeof customNetwork]
```

```tsx [Main.tsx]
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import config from "@/lib/config.ts";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}
    >
      <QueryClientProvider client={queryClient}>
        <App/>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
```

```tsx [Web组件：ConnectButton.tsx]
// Web 组件是不需要导入的全局 html 元素。
export default function ConnectButton() {
  return <appkit-button/>
}
```

```tsx [Hook组件]
import {useAppKit} from "@reown/appkit/react";

export default function ConnectButton() {
  const {open} = useAppKit();

  return (
    <>
      <button onClick={() => open()}>Open Connect Modal</button>
      <button onClick={() => open({view: "Networks"})}>
        Open Network Modal
      </button>
    </>
  );
}
```

:::

### RainbowKit

> RainbowKit 是一个 React 库，可以轻松地将钱包连接添加到您的 dapp。它直观、响应迅速且可自定义。它直观、响应迅速且可自定义。

![RainbowKit](/examples/rainbowkit.png)

安装RainbowKit及其对等依赖项， `wagmi`， `viem`，和 `@tanstack/react-query`。

```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
```

:::code-group

```tsx {9,10,16-23} [Main.tsx 包装器]
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import config from "@/lib/config.ts";

import {darkTheme, RainbowKitProvider} from "@rainbow-me/rainbowkit";

const queryClient = new QueryClient();

import '@rainbow-me/rainbowkit/styles.css'; // 样式引入

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}
    >
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}> {/*lightTheme(默认)、darkTheme、midnightTheme*/}
          <App/>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
```

```ts [config.ts]
import {getDefaultConfig} from '@rainbow-me/rainbowkit';
import {http} from 'wagmi';
import {mainnet, sepolia} from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/...'),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/...'),
  },
});
```

```ts [自定义网络]
import {getDefaultConfig} from '@rainbow-me/rainbowkit';
import {http} from 'wagmi';
import {mainnet, sepolia} from 'wagmi/chains';
import {defineChain} from "viem";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const customNetwork = defineChain({
  id: 10143,
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
})

const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId,
  chains: [mainnet, customNetwork],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/...'),
    [customNetwork.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

export default config;
```

```tsx [ConnectButton]
import {ConnectButton} from '@rainbow-me/rainbowkit';

export const App = () => {
  return <ConnectButton/>;
};
```

:::

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
import {type WagmiProviderProps} from 'wagmi'
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
    <tr v-for="action of Actions">
    <th>
      <KeywordTip :href="'https://wagmi.sh/' + action.link" :keyword="action.text" :file="action.file" lang="tsx"></KeywordTip>
    </th>
    <th>{{action.description}}</th>
    </tr>
</tbody>
</table>

## 进阶

### multicall

> Multicall 就是为了解决这个问题：把多个 eth_call 打包成一个合约调用，链上 Multicall 合约帮你执行，最后一次性返回结果。

:::code-group

```ts [示例]
import {multicall} from '@wagmi/core'
import {config} from './config'

const wagmigotchiContract = {
  address: '0xecb504d39723b0be0e3a9aa33d646642d1051ee1',
  abi: wagmigotchiABI,
} as const
const mlootContract = {
  address: '0x1dfe7ca09e99d10835bf73044a23b73fc20623df',
  abi: mlootABI,
} as const

const result = await multicall(config, {
  contracts: [
    {
      ...wagmigotchiContract,
      functionName: 'getAlive',
    },
    {
      ...wagmigotchiContract,
      functionName: 'getBoredom',
    },
    {
      ...mlootContract,
      functionName: 'getChest',
      args: [69],
    },
    {
      ...mlootContract,
      functionName: 'getWaist',
      args: [69],
    },
  ],
})
```

```solidity [部署multicall合约]
// 例如Monad Test目前没有部署multicall合约，就需要自己亲自部署，在Etherscan有源码
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title Multicall3
/// @notice Aggregate results from multiple function calls
/// @dev Multicall & Multicall2 backwards-compatible
/// @dev Aggregate methods are marked `payable` to save 24 gas per call
/// @author Michael Elliot <mike@makerdao.com>
/// @author Joshua Levine <joshua@makerdao.com>
/// @author Nick Johnson <arachnid@notdot.net>
/// @author Andreas Bigger <andreas@nascent.xyz>
/// @author Matt Solomon <matt@mattsolomon.dev>
contract Multicall3 {
    struct Call {
        address target;
        bytes callData;
    }

    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Call3Value {
        address target;
        bool allowFailure;
        uint256 value;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    /// @notice Backwards-compatible call aggregation with Multicall
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return returnData An array of bytes containing the responses
    function aggregate(Call[] calldata calls) public payable returns (uint256 blockNumber, bytes[] memory returnData) {
        blockNumber = block.number;
        uint256 length = calls.length;
        returnData = new bytes[](length);
        Call calldata call;
        for (uint256 i = 0; i < length;) {
            bool success;
            call = calls[i];
            (success, returnData[i]) = call.target.call(call.callData);
            require(success, "Multicall3: call failed");
            unchecked {++i;}
        }
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls without requiring success
    /// @param requireSuccess If true, require all calls to succeed
    /// @param calls An array of Call structs
    /// @return returnData An array of Result structs
    function tryAggregate(bool requireSuccess, Call[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call calldata call;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            call = calls[i];
            (result.success, result.returnData) = call.target.call(call.callData);
            if (requireSuccess) require(result.success, "Multicall3: call failed");
            unchecked {++i;}
        }
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls and allow failures using tryAggregate
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return blockHash The hash of the block where the calls were executed
    /// @return returnData An array of Result structs
    function tryBlockAndAggregate(bool requireSuccess, Call[] calldata calls) public payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        returnData = tryAggregate(requireSuccess, calls);
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls and allow failures using tryAggregate
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return blockHash The hash of the block where the calls were executed
    /// @return returnData An array of Result structs
    function blockAndAggregate(Call[] calldata calls) public payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        (blockNumber, blockHash, returnData) = tryBlockAndAggregate(true, calls);
    }

    /// @notice Aggregate calls, ensuring each returns success if required
    /// @param calls An array of Call3 structs
    /// @return returnData An array of Result structs
    function aggregate3(Call3[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call3 calldata calli;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            calli = calls[i];
            (result.success, result.returnData) = calli.target.call(calli.callData);
            assembly {
            // Revert if the call fails and failure is not allowed
            // `allowFailure := calldataload(add(calli, 0x20))` and `success := mload(result)`
                if iszero(or(calldataload(add(calli, 0x20)), mload(result))) {
                // set "Error(string)" signature: bytes32(bytes4(keccak256("Error(string)")))
                    mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                // set data offset
                    mstore(0x04, 0x0000000000000000000000000000000000000000000000000000000000000020)
                // set length of revert string
                    mstore(0x24, 0x0000000000000000000000000000000000000000000000000000000000000017)
                // set revert string: bytes32(abi.encodePacked("Multicall3: call failed"))
                    mstore(0x44, 0x4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000)
                    revert(0x00, 0x64)
                }
            }
            unchecked {++i;}
        }
    }

    /// @notice Aggregate calls with a msg value
    /// @notice Reverts if msg.value is less than the sum of the call values
    /// @param calls An array of Call3Value structs
    /// @return returnData An array of Result structs
    function aggregate3Value(Call3Value[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 valAccumulator;
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call3Value calldata calli;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            calli = calls[i];
            uint256 val = calli.value;
            // Humanity will be a Type V Kardashev Civilization before this overflows - andreas
            // ~ 10^25 Wei in existence << ~ 10^76 size uint fits in a uint256
            unchecked {valAccumulator += val;}
            (result.success, result.returnData) = calli.target.call{value: val}(calli.callData);
            assembly {
            // Revert if the call fails and failure is not allowed
            // `allowFailure := calldataload(add(calli, 0x20))` and `success := mload(result)`
                if iszero(or(calldataload(add(calli, 0x20)), mload(result))) {
                // set "Error(string)" signature: bytes32(bytes4(keccak256("Error(string)")))
                    mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                // set data offset
                    mstore(0x04, 0x0000000000000000000000000000000000000000000000000000000000000020)
                // set length of revert string
                    mstore(0x24, 0x0000000000000000000000000000000000000000000000000000000000000017)
                // set revert string: bytes32(abi.encodePacked("Multicall3: call failed"))
                    mstore(0x44, 0x4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000)
                    revert(0x00, 0x84)
                }
            }
            unchecked {++i;}
        }
        // Finally, make sure the msg.value = SUM(call[0...i].value)
        require(msg.value == valAccumulator, "Multicall3: value mismatch");
    }

    /// @notice Returns the block hash for the given block number
    /// @param blockNumber The block number
    function getBlockHash(uint256 blockNumber) public view returns (bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
    }

    /// @notice Returns the block number
    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    /// @notice Returns the block coinbase
    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    /// @notice Returns the block difficulty
    function getCurrentBlockDifficulty() public view returns (uint256 difficulty) {
        difficulty = block.difficulty;
    }

    /// @notice Returns the block gas limit
    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    /// @notice Returns the block timestamp
    function getCurrentBlockTimestamp() public view returns (uint256 timestamp) {
        timestamp = block.timestamp;
    }

    /// @notice Returns the (ETH) balance of a given address
    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    /// @notice Returns the block hash of the last block
    function getLastBlockHash() public view returns (bytes32 blockHash) {
        unchecked {
            blockHash = blockhash(block.number - 1);
        }
    }

    /// @notice Gets the base fee of the given block
    /// @notice Can revert if the BASEFEE opcode is not implemented by the given chain
    function getBasefee() public view returns (uint256 basefee) {
        basefee = block.basefee;
    }

    /// @notice Returns the chain id
    function getChainId() public view returns (uint256 chainid) {
        chainid = block.chainid;
    }
}
```

```ts [配置Config使用Multicall3]
import {getDefaultConfig} from "@rainbow-me/rainbowkit";
import {http} from "wagmi";
import {defineChain} from "viem";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const customNetwork = defineChain({
  id: 10143,
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
  contracts: { // [!code focus:6]
    multicall3: {
      address: "0xeCf6cd06B29f902543C0A79c6a7D0b2090CB3356", // 你部署的地址
      blockCreated: 32354777, // 部署的区块高度
    },
  },
});

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId,
  chains: [customNetwork],
  transports: {
    [customNetwork.id]: http("https://testnet-rpc.monad.xyz"),
  },
});

export default config;

```

:::

### 搞懂wagmi各种库

> 搞懂 wagmi、@wagmi/core 和 wagmi/actions 的区别与关系

在使用 wagmi 开发 Web3 应用时，经常会遇到三个名字相似的包：

- `wagmi`
- `@wagmi/core`
- `wagmi/actions`

很多同学在写 React dApp 的时候可能会疑惑：

- 为什么有时候官方示例直接 `import { useAccount } from "wagmi"`。
- 而有些场景下却需要 `@wagmi/core` 或者 `wagmi/actions`?

本文就来彻底梳理它们的定位和关系。

#### wagmi

> wagmi 是 React 项目专用的包，内部基于 `@wagmi/core` 实现，并封装成了 React Hooks。

常见的 hook 如： [hooks-集合](#hooks-集合)

导入规则：`import { useAccount, useBalance } from 'wagmi'`

#### @wagmi/core

> `@wagmi/core` 是 wagmi 的 核心底层，它不依赖 React，可以单独在 Node.js、Vue、Svelte、Next.js server actions 等环境中使用。

它提供的能力主要是：

- 管理链配置（createConfig）
- 钱包连接器（injected, metaMask, walletConnect 等）
- 账户与链的全局状态管理

:::code-group

```ts [使用示例（非 React 环境）]
import {createConfig, getAccount} from '@wagmi/core'
import {http} from 'viem'
import {mainnet} from 'viem/chains'

const config = createConfig({
  chains: [mainnet],
  transports: {[mainnet.id]: http()}
})

console.log(getAccount(config))  // 获取当前账户信息
```

:::

> [!TIP] 适用场景
> - 不依赖 React 的项目
> - SSR / 后端脚本
> - 自定义框架

#### wagmi/actions

> `wagmi/actions` 是一组独立的**工具函数**，提供了对链的命令式调用（imperative API），不需要 React Hook。

它依赖 `@wagmi/core` 的 config，常见的 API 有：[actions-集合](#actions-集合)

```ts
import {getBalance, writeContract} from 'wagmi/actions'
import {config} from './config'

const balance = await getBalance(config, {address: '0x123...'})
console.log(balance.formatted)

await writeContract(config, {
  address: '0xTokenAddress',
  abi: erc20Abi,
  functionName: 'transfer',
  args: ['0xabc...', 1000n],
})
```

> [!TIP] 适用场景
> - 不想用 Hook，只需要直接发起一次请求
> - 在脚本、服务端或工具函数中调用区块链操作
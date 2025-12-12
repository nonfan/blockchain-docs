# 快速入门

## 搭建 Dapp

通过 vite 构建一个简单的应用：

```bash
npm create vite@latest linea-dapp --template react-ts
```

### 安装依赖

安装 MetaMask 嵌入式钱包 SDK 及其他必需包：

```bash
npm install @web3auth/modal wagmi viem@2.x @tanstack/react-query
```

依赖列表：

- `@web3auth/modal`：MetaMask 嵌入式钱包 SDK
- `wagmi`：React 状态管理库
- `viem@2.x`：Ethereum 客户端库
- `@tanstack/react-query`：数据获取库

安装完成后，你可以运行 `npm run dev` 来本地启动应用。

### 配置提供商（Provider）

在你的项目中创建一个使用 Web3Auth 和 Wagmi 的配置文件。这个文件将用于将你的应用状态与钱包和区块链连接提供商包裹起来。在你的应用 components 目录中，创建一个名为 `provider.tsx` 的新文件:

```tsx
"use client";
import React from "react";

// Web3Auth Imports
import { Web3AuthProvider, type Web3AuthContextConfig } from "@web3auth/modal/react";
import { IWeb3AuthState, WEB3AUTH_NETWORK } from "@web3auth/modal";

// Wagmi Imports
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient for Wagmi Hooks Configuration
const queryClient = new QueryClient();

const clientId = "YOUR_WEB3AUTH_CLIENT_ID";

// Web3Auth Configuration
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId, // Pass your Web3Auth Client ID, ideally using an environment variable // Get your Client ID from Web3Auth Dashboard
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // or WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
  }
};

// Provider Component
export default function Provider({ children }: 
  { children: React.ReactNode }) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  );
}
```


我们将使用 MetaMask 嵌入式钱包（Web3Auth）SDK 支持无缝认证，支持社交登录、外部钱包及更多功能。该 SDK 与 Wagmi 协同工作，提供完整的 Web3 认证与交互解决方案。

因此我们需要获取 `clientId`, 前往 [dashboard.web3auth.io](https://dashboard.web3auth.io/)要注册一个免费的 MetaMask 嵌入式钱包账户.

![Web3Auth Dashboard](/examples/linea/01_clientId.png)

### 应用提供商

在你的入口文件如 `main.ts` 使用组件 `Provider`:

```tsx
import "./polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Provider from "./Provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>
);
```

### 创建连接钱包按钮

创建一个简单的 Connect 钱包组件。在你的应用中 components 目录中，创建一个名为 `ConnectWallet.tsx` 的新文件：

```tsx
// app/components/ConnectWallet.tsx
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";

export default function ConnectWallet() {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();

  return (
    <div>
      {!isConnected ? (
        <button 
          className="docs-button" 
          disabled={connectLoading}
          onClick={connect}
        >
          {connectLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex gap-2">
          <span>Connected as: {userInfo?.email || userInfo?.name || 'User'}</span>
          <button 
            className="docs-button" 
            disabled={disconnectLoading}
            onClick={disconnect}
          >
            {disconnectLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      )}
    </div>
  )
}
```

### 集成连接钱包按钮

在你的应用中，将 `ConnectWallet` 组件集成到你的主应用组件中。例如，在 `App.tsx` 中：

```tsx
// app/App.tsx
import ConnectWallet from "./components/ConnectWallet.tsx";

export default function App() {
  return (
    <div className="container">
      <h1>Linea Dapp</h1>
      <ConnectWallet />
    </div>
  );
}
```

> [!DANGER] Uncaught ReferenceError: Buffer is not defined
> 安装依赖：缺少Node环境的buffer
> ```bash
> npm install buffer process
> ```
> 编写 `polyfills.ts` 文件在入口 `main.ts` 文件导入
> ```ts
>import { Buffer } from "buffer";
>import process from "process";
>
>const g = globalThis as typeof globalThis & {
>   Buffer?: typeof Buffer;
>   process?: typeof process;
>   global?: typeof globalThis;
> };
> g.global ??= globalThis;
> g.process ??= process;
> g.Buffer ??= Buffer;
>```



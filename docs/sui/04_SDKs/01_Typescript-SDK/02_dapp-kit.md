# Dapp Kit

> 构建 Sui dApp 前端的完整 React 工具包

> [!IMPORTANT] 本节重点
> 1. 什么是 dApp Kit？为什么需要它？
> 2. 如何安装和配置 dApp Kit？
> 3. 如何连接钱包？
> 4. 如何查询链上数据？
> 5. 如何发送交易？
> 6. 如何使用 React Hooks？

## 什么是 dApp Kit？

**@mysten/dapp-kit** 是 Sui 官方提供的 React 工具包，专为构建去中心化应用（dApp）前端而设计。它提供了：

- 🔌 **钱包连接**：支持多种 Sui 钱包（Sui Wallet、Suiet、Ethos 等）
- ⚛️ **React Hooks**：简化链上数据查询和交易发送
- 🎨 **UI 组件**：预构建的钱包连接按钮和模态框
- 🔄 **自动同步**：实时同步链上状态
- 💾 **状态管理**：内置钱包状态和账户管理
- 📱 **响应式设计**：支持移动端和桌面端

## 安装和配置

### 环境要求

- **React**: >= 18.0.0
- **Node.js**: >= 16.x
- **TypeScript**: >= 4.5.0（可选但推荐）

### 安装依赖

```bash
# 使用 npm
npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query

# 使用 yarn
yarn add @mysten/dapp-kit @mysten/sui @tanstack/react-query

# 使用 pnpm
pnpm add @mysten/dapp-kit @mysten/sui @tanstack/react-query
```

### 基础配置

创建 `src/App.tsx`：

```typescript
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';

// 配置
const queryClient = new QueryClient();
const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="devnet">
        <WalletProvider>
          {/* 你的应用组件 */}
          <YourApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## 连接钱包

### 使用钱包连接按钮

```typescript
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

function WalletSection() {
  const account = useCurrentAccount();

  return (
    <div>
      <ConnectButton />

      {account && (
        <div>
          <p>已连接地址: {account.address}</p>
        </div>
      )}
    </div>
  );
}
```

### 自定义钱包连接

```typescript
import {
  useConnectWallet,
  useDisconnectWallet,
  useWallets,
  useCurrentAccount,
} from '@mysten/dapp-kit';

function CustomWalletConnect() {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const account = useCurrentAccount();

  if (account) {
    return (
      <div>
        <p>已连接: {account.address}</p>
        <button onClick={() => disconnect()}>
          断开连接
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3>选择钱包</h3>
      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => connect({ wallet })}
          disabled={!wallet.isInstalled}
        >
          <img src={wallet.icon} alt={wallet.name} width="32" height="32" />
          {wallet.name}
          {!wallet.isInstalled && ' (未安装)'}
        </button>
      ))}
    </div>
  );
}
```

### 钱包状态管理

```typescript
import {
  useCurrentAccount,
  useCurrentWallet,
  useAccounts,
  useSwitchAccount,
} from '@mysten/dapp-kit';

function WalletInfo() {
  const currentAccount = useCurrentAccount();
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const accounts = useAccounts();
  const { mutate: switchAccount } = useSwitchAccount();

  return (
    <div>
      {/* 连接状态 */}
      <p>状态: {connectionStatus}</p>

      {/* 当前钱包 */}
      {currentWallet && (
        <div>
          <p>钱包: {currentWallet.name}</p>
          <p>版本: {currentWallet.version}</p>
        </div>
      )}

      {/* 当前账户 */}
      {currentAccount && (
        <div>
          <p>地址: {currentAccount.address}</p>
          <p>公钥: {currentAccount.publicKey}</p>
        </div>
      )}

      {/* 切换账户 */}
      {accounts.length > 1 && (
        <div>
          <h4>切换账户</h4>
          {accounts.map((account) => (
            <button
              key={account.address}
              onClick={() => switchAccount({ account })}
              disabled={account.address === currentAccount?.address}
            >
              {account.address}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 查询链上数据

### 查询余额

```typescript
import { useBalance, useCurrentAccount } from '@mysten/dapp-kit';

function Balance() {
  const account = useCurrentAccount();
  const { data: balance, isLoading, error } = useBalance({
    address: account?.address!,
  });

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;
  if (!balance) return <div>无余额数据</div>;

  return (
    <div>
      <h3>SUI 余额</h3>
      <p>{(Number(balance.totalBalance) / 1_000_000_000).toFixed(2)} SUI</p>
      <p>币对象数量: {balance.coinObjectCount}</p>
    </div>
  );
}
```

### 查询所有代币余额

```typescript
import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';

function AllBalances() {
  const account = useCurrentAccount();

  const { data, isLoading } = useSuiClientQuery('getAllBalances', {
    owner: account?.address!,
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      <h3>所有代币余额</h3>
      {data?.map((balance) => (
        <div key={balance.coinType}>
          <p>代币: {balance.coinType}</p>
          <p>余额: {balance.totalBalance}</p>
        </div>
      ))}
    </div>
  );
}
```

### 查询拥有的对象

```typescript
import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';

function OwnedObjects() {
  const account = useCurrentAccount();

  const { data, isLoading, error } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address!,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
      },
    },
    {
      enabled: !!account,
    }
  );

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <h3>拥有的对象</h3>
      {data?.data.map((obj) => (
        <div key={obj.data?.objectId}>
          <p>对象 ID: {obj.data?.objectId}</p>
          <p>类型: {obj.data?.type}</p>
          <p>版本: {obj.data?.version}</p>
        </div>
      ))}
    </div>
  );
}
```

### 查询对象详情

```typescript
import { useSuiClientQuery } from '@mysten/dapp-kit';

function ObjectDetail({ objectId }: { objectId: string }) {
  const { data, isLoading } = useSuiClientQuery('getObject', {
    id: objectId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showDisplay: true,
    },
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      <h3>对象详情</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### 查询交易历史

```typescript
import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';

function TransactionHistory() {
  const account = useCurrentAccount();

  const { data, isLoading } = useSuiClientQuery('queryTransactionBlocks', {
    filter: {
      FromAddress: account?.address!,
    },
    options: {
      showEffects: true,
      showInput: true,
    },
    limit: 10,
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      <h3>交易历史</h3>
      {data?.data.map((tx) => (
        <div key={tx.digest}>
          <p>摘要: {tx.digest}</p>
          <p>时间: {new Date(Number(tx.timestampMs)).toLocaleString()}</p>
          <p>状态: {tx.effects?.status?.status}</p>
        </div>
      ))}
    </div>
  );
}
```

## 发送交易

### 基础转账

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';

function Transfer() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransfer = () => {
    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [
      tx.pure(BigInt(parseFloat(amount) * 1_000_000_000))
    ]);

    tx.transferObjects([coin], tx.pure.address(recipient));

    signAndExecute(
      {
        transaction: tx,
        options: {
          showEffects: true,
        },
      },
      {
        onSuccess: (result) => {
          console.log('交易成功:', result);
          alert(`交易成功! Digest: ${result.digest}`);
        },
        onError: (error) => {
          console.error('交易失败:', error);
          alert(`交易失败: ${error.message}`);
        },
      }
    );
  };

  if (!account) {
    return <div>请先连接钱包</div>;
  }

  return (
    <div>
      <h3>转账 SUI</h3>
      <input
        type="text"
        placeholder="接收地址"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        type="number"
        placeholder="金额（SUI）"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleTransfer}>发送</button>
    </div>
  );
}
```

### 调用智能合约

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

function MintNFT({ packageId }: { packageId: string }) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleMint = (name: string, description: string, imageUrl: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::nft::mint`,
      arguments: [
        tx.pure(name),
        tx.pure(description),
        tx.pure(imageUrl),
      ],
    });

    signAndExecute(
      {
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (result) => {
          console.log('NFT 铸造成功:', result);

          // 获取创建的对象
          const createdObjects = result.objectChanges?.filter(
            (obj) => obj.type === 'created'
          );

          if (createdObjects && createdObjects.length > 0) {
            console.log('NFT ID:', createdObjects[0].objectId);
          }
        },
      }
    );
  };

  return (
    <div>
      <h3>铸造 NFT</h3>
      <button onClick={() => handleMint('My NFT', 'Description', 'https://...')}>
        铸造
      </button>
    </div>
  );
}
```

### 仅签名（不执行）

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignTransaction } from '@mysten/dapp-kit';

function SignOnly() {
  const { mutateAsync: signTransaction } = useSignTransaction();

  const handleSign = async () => {
    const tx = new Transaction();
    // ... 构建交易

    try {
      const { signature, bytes } = await signTransaction({
        transaction: tx,
      });

      console.log('签名:', signature);
      console.log('交易字节:', bytes);

      // 可以将签名和交易发送给后端处理
    } catch (error) {
      console.error('签名失败:', error);
    }
  };

  return <button onClick={handleSign}>仅签名</button>;
}
```

### 带加载状态的交易

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

function TransferWithLoading() {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const handleTransfer = () => {
    const tx = new Transaction();
    // ... 构建交易

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log('成功:', result);
        },
      }
    );
  };

  return (
    <button onClick={handleTransfer} disabled={isPending}>
      {isPending ? '处理中...' : '发送交易'}
    </button>
  );
}
```

## React Hooks API

### 钱包 Hooks

```typescript
// 连接钱包
const { mutate: connect } = useConnectWallet();

// 断开钱包
const { mutate: disconnect } = useDisconnectWallet();

// 获取所有可用钱包
const wallets = useWallets();

// 获取当前账户
const account = useCurrentAccount();

// 获取当前钱包
const { currentWallet, connectionStatus } = useCurrentWallet();

// 获取所有账户
const accounts = useAccounts();

// 切换账户
const { mutate: switchAccount } = useSwitchAccount();
```

### 查询 Hooks

```typescript
// 通用查询 Hook
const { data, isLoading, error } = useSuiClientQuery(
  'methodName',  // RPC 方法名
  { /* 参数 */ },
  { /* React Query 选项 */ }
);

// 查询余额
const { data: balance } = useBalance({
  address: '0x...',
});

// 无限滚动查询
const {
  data,
  fetchNextPage,
  hasNextPage,
  isLoading,
} = useSuiClientInfiniteQuery('getOwnedObjects', {
  owner: address,
  limit: 10,
});
```

### 交易 Hooks

```typescript
// 签名并执行交易
const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

// 仅签名
const { mutateAsync: signTransaction } = useSignTransaction();

// 执行交易（使用已有签名）
const { mutate: executeTransaction } = useExecuteTransaction();
```

### 自定义 Hook 示例

```typescript
import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';

// 获取用户的 NFT
function useUserNFTs(packageId: string) {
  const account = useCurrentAccount();

  return useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address!,
      filter: {
        StructType: `${packageId}::nft::NFT`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    },
    {
      enabled: !!account,
      refetchInterval: 10000, // 每 10 秒刷新
    }
  );
}

// 使用
function MyNFTs() {
  const { data, isLoading } = useUserNFTs('0xpackageId');

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      {data?.data.map((nft) => (
        <div key={nft.data?.objectId}>
          {/* 渲染 NFT */}
        </div>
      ))}
    </div>
  );
}
```

## 完整示例

### NFT 市场 dApp

```typescript
import { useState } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x...';

function NFTMarketplace() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // 查询市场上的 NFT
  const { data: marketNFTs, isLoading } = useSuiClientQuery('getOwnedObjects', {
    owner: PACKAGE_ID, // 市场合约地址
    filter: {
      StructType: `${PACKAGE_ID}::marketplace::Listing`,
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  });

  // 查询用户的 NFT
  const { data: userNFTs } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address!,
      filter: {
        StructType: `${PACKAGE_ID}::nft::NFT`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!account,
    }
  );

  // 铸造 NFT
  const handleMint = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::nft::mint`,
      arguments: [
        tx.pure('My NFT'),
        tx.pure('NFT Description'),
        tx.pure('https://example.com/image.png'),
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => alert('NFT 铸造成功!'),
        onError: (error) => alert(`失败: ${error.message}`),
      }
    );
  };

  // 上架 NFT
  const handleList = (nftId: string, price: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::marketplace::list`,
      arguments: [
        tx.object(nftId),
        tx.pure(BigInt(parseFloat(price) * 1_000_000_000)),
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => alert('NFT 上架成功!'),
      }
    );
  };

  // 购买 NFT
  const handleBuy = (listingId: string, price: string) => {
    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [
      tx.pure(BigInt(parseFloat(price) * 1_000_000_000))
    ]);

    tx.moveCall({
      target: `${PACKAGE_ID}::marketplace::buy`,
      arguments: [
        tx.object(listingId),
        coin,
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => alert('购买成功!'),
      }
    );
  };

  return (
    <div className="marketplace">
      <header>
        <h1>NFT 市场</h1>
        <ConnectButton />
      </header>

      {/* 市场 NFT */}
      <section>
        <h2>市场</h2>
        {isLoading ? (
          <div>加载中...</div>
        ) : (
          <div className="nft-grid">
            {marketNFTs?.data.map((listing) => (
              <div key={listing.data?.objectId} className="nft-card">
                <img src={listing.data?.display?.data?.image_url} alt="NFT" />
                <h3>{listing.data?.display?.data?.name}</h3>
                <p>{listing.data?.content?.fields?.price} SUI</p>
                <button onClick={() => handleBuy(
                  listing.data!.objectId,
                  listing.data!.content!.fields.price
                )}>
                  购买
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 我的 NFT */}
      {account && (
        <section>
          <h2>我的 NFT</h2>
          <button onClick={handleMint}>铸造新 NFT</button>

          <div className="nft-grid">
            {userNFTs?.data.map((nft) => (
              <div key={nft.data?.objectId} className="nft-card">
                <img src={nft.data?.display?.data?.image_url} alt="NFT" />
                <h3>{nft.data?.display?.data?.name}</h3>
                <button onClick={() => {
                  const price = prompt('输入价格 (SUI):');
                  if (price) handleList(nft.data!.objectId, price);
                }}>
                  上架出售
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NFTMarketplace;
```

## 最佳实践

### 1. 错误处理

```typescript
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

function TransactionWithErrorHandling() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleTransaction = () => {
    const tx = new Transaction();
    // ... 构建交易

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          // 检查交易状态
          if (result.effects?.status?.status === 'success') {
            console.log('✅ 交易成功');
          } else {
            console.error('❌ 交易失败:', result.effects?.status);
          }
        },
        onError: (error) => {
          // 处理不同类型的错误
          if (error.message.includes('Rejected')) {
            alert('用户拒绝了交易');
          } else if (error.message.includes('insufficient')) {
            alert('余额不足');
          } else {
            alert(`交易失败: ${error.message}`);
          }
        },
      }
    );
  };

  return <button onClick={handleTransaction}>发送交易</button>;
}
```

### 2. 加载状态管理

```typescript
function TransactionButton() {
  const { mutate: signAndExecute, isPending, isSuccess, isError } =
    useSignAndExecuteTransaction();

  return (
    <div>
      <button onClick={() => signAndExecute({ transaction: tx })} disabled={isPending}>
        {isPending && '⏳ 处理中...'}
        {isSuccess && '✅ 成功'}
        {isError && '❌ 失败'}
        {!isPending && !isSuccess && !isError && '发送交易'}
      </button>
    </div>
  );
}
```

### 3. 数据刷新

```typescript
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useQueryClient } from '@tanstack/react-query';

function DataWithRefresh() {
  const queryClient = useQueryClient();

  const { data } = useSuiClientQuery('getBalance', {
    address: '0x...',
  });

  const handleRefresh = () => {
    // 刷新特定查询
    queryClient.invalidateQueries({ queryKey: ['getBalance'] });

    // 或刷新所有查询
    // queryClient.invalidateQueries();
  };

  return (
    <div>
      <p>余额: {data?.totalBalance}</p>
      <button onClick={handleRefresh}>刷新</button>
    </div>
  );
}
```

### 4. 条件渲染

```typescript
import { useCurrentAccount, useBalance } from '@mysten/dapp-kit';

function ConditionalContent() {
  const account = useCurrentAccount();
  const { data: balance } = useBalance({
    address: account?.address!,
  });

  // 未连接钱包
  if (!account) {
    return <div>请先连接钱包</div>;
  }

  // 余额不足
  if (balance && BigInt(balance.totalBalance) < 1_000_000_000n) {
    return <div>余额不足，请先充值</div>;
  }

  // 正常内容
  return <div>欢迎使用 dApp!</div>;
}
```

### 5. 自动重连

```typescript
import { useAutoConnectWallet } from '@mysten/dapp-kit';

function App() {
  // 自动连接上次使用的钱包
  useAutoConnectWallet();

  return <YourApp />;
}
```

## 常见问题

### Q1: 如何支持多个网络？

**A:** 配置多个网络并允许用户切换：

```typescript
import { SuiClientProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function App() {
  const [network, setNetwork] = useState<keyof typeof networks>('devnet');

  return (
    <SuiClientProvider networks={networks} defaultNetwork={network}>
      <select value={network} onChange={(e) => setNetwork(e.target.value as any)}>
        <option value="devnet">Devnet</option>
        <option value="testnet">Testnet</option>
        <option value="mainnet">Mainnet</option>
      </select>

      <WalletProvider>
        <YourApp />
      </WalletProvider>
    </SuiClientProvider>
  );
}
```

### Q2: 如何处理钱包未安装？

**A:** 检查钱包安装状态：

```typescript
import { useWallets } from '@mysten/dapp-kit';

function WalletList() {
  const wallets = useWallets();

  return (
    <div>
      {wallets.map((wallet) => (
        <div key={wallet.name}>
          {wallet.isInstalled ? (
            <button onClick={() => connect({ wallet })}>
              连接 {wallet.name}
            </button>
          ) : (
            <a href={wallet.downloadUrl} target="_blank" rel="noreferrer">
              安装 {wallet.name}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Q3: 如何显示交易进度？

**A:** 使用加载状态和回调：

```typescript
function TransactionWithProgress() {
  const [status, setStatus] = useState<'idle' | 'signing' | 'executing' | 'success' | 'error'>('idle');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleTransaction = () => {
    setStatus('signing');

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          setStatus('executing');

          // 等待交易确认
          setTimeout(() => {
            setStatus('success');
          }, 2000);
        },
        onError: () => {
          setStatus('error');
        },
      }
    );
  };

  return (
    <div>
      {status === 'idle' && <button onClick={handleTransaction}>发送</button>}
      {status === 'signing' && <div>⏳ 请在钱包中签名...</div>}
      {status === 'executing' && <div>⏳ 交易执行中...</div>}
      {status === 'success' && <div>✅ 交易成功!</div>}
      {status === 'error' && <div>❌ 交易失败</div>}
    </div>
  );
}
```

## 参考资源

- [dApp Kit 官方文档](https://sdk.mystenlabs.com/dapp-kit)
- [API 参考](https://sdk.mystenlabs.com/dapp-kit/api)
- [示例项目](https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit/examples)
- [React Query 文档](https://tanstack.com/query/latest)

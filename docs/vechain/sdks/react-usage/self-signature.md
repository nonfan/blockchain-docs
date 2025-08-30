# 自签名交易

本文档详细介绍如何在 React 应用中实现 VeChain 自签名交易功能。自签名交易是指使用用户的私钥在本地对交易进行签名,无需通过钱包插件或外部服务,适用于需要自动化批量交易的场景。

## 核心概念

- **自签名**：使用私钥直接在代码中对交易进行签名,而非通过钱包插件
- **代付 Gas**：使用指定的代付账户支付交易的 Gas 费用,让用户无需持有 VTHO
- **批量交易**：支持同时处理多个账户的交易,并统一管理状态

## useSelfSignature

这是一个自定义 Hook,封装了使用私钥进行交易签名和发送的完整流程,支持多账户并发交易和状态管理。

```ts
import { useState } from 'react';
import { ThorClient } from '@vechain/sdk-network';
import { HexUInt, Transaction, TransactionClause } from '@vechain/sdk-core';
import { DEFAULT_DELEGATE_ACCOUNT } from '@/utils/config/accounts';
import { logError } from '@/utils/errorHandler';

// 交易状态枚举
type State = 'Pending' | 'Success' | 'Failed' | 'Cancel';

// 账户接口：包含地址和私钥
export interface Account {
  address: string;
  privateKey: string;
}

// 多账户状态映射：key 为地址,value 为状态
type StateMap = Record<string, State>;

function useSelfSignature() {
  // 维护多个账户的交易状态
  const [states, setStates] = useState<StateMap>({});

  /**
   * 发送自签名交易
   * @param account 发送方账户（包含私钥）
   * @param clauses 交易子句数组
   */
  const sendTransaction = async (account: Account, clauses: TransactionClause[]) => {
    if (!clauses.length) {
      throw new Error('至少需要一个 clause');
    }

    // 设置当前账户状态为等待中
    setStates((prev) => ({ ...prev, [account.address]: 'Pending' }));

    try {
      // 创建 Thor 客户端连接到节点
      const thorClient = ThorClient.at(import.meta.env.VITE_NODE, { isPollingEnabled: false });

      // 1. 预估 Gas 消耗
      const gasResult = await thorClient.gas.estimateGas(clauses, account.address);

      // 2. 构建交易体
      const txBody = await thorClient.transactions.buildTransactionBody(clauses, gasResult.totalGas);

      // 3. 启用代付功能（features: 1 表示启用 VIP-191 代付）
      const transactionBody = { ...txBody, reserved: { features: 1 } };

      // 获取代付账户私钥
      const gasPayerPrivateKey = DEFAULT_DELEGATE_ACCOUNT.privateKey;

      // 4. 双重签名：用户签名 + 代付方签名
      const signedTransaction = Transaction.of(transactionBody).signAsSenderAndGasPayer(
        HexUInt.of(account.privateKey).bytes,  // 发送方私钥
        HexUInt.of(gasPayerPrivateKey).bytes   // 代付方私钥
      );

      // 5. 发送交易到区块链
      const sendTransactionResult = await thorClient.transactions.sendTransaction(signedTransaction);

      // 6. 等待交易被打包确认
      const txReceipt = await thorClient.transactions.waitForTransaction(sendTransactionResult.id);

      // 7. 根据交易结果更新状态
      if (txReceipt?.reverted) {
        setStates((prev) => ({ ...prev, [account.address]: 'Failed' }));
      } else {
        setStates((prev) => ({ ...prev, [account.address]: 'Success' }));
      }
    } catch (e) {
      // 记录错误日志
      logError('sendTransaction', e, {
        module: 'self-signature',
        component: 'useSelfSignature',
        additionalData: { accountAddress: account.address, clausesLength: clauses.length },
      });
      setStates((prev) => ({ ...prev, [account.address]: 'Failed' }));
    }
  };

  /**
   * 手动设置指定地址的状态
   */
  const setWalletState = (address: string, state: State) => {
    setStates((prev) => ({ ...prev, [address]: state }));
  };

  /**
   * 重置所有账户状态
   */
  const resetStates = () => setStates({});

  return { states, sendTransaction, resetStates, setWalletState };
}

export default useSelfSignature;
```

### 返回值说明

| 属性             | 类型                          | 说明                                   |
| ---------------- | ----------------------------- | -------------------------------------- |
| `states`         | `Record<string, State>`       | 记录每个钱包地址对应的交易状态         |
| `sendTransaction`| `Function`                    | 执行签名并发送交易的异步函数           |
| `setWalletState` | `Function`                    | 手动设置某个地址的状态                 |
| `resetStates`    | `Function`                    | 清空所有状态,通常在关闭模态窗时调用    |

### 交易状态流转

```
初始 → Pending（交易发送中） → Success（成功）/ Failed（失败）
                                ↓
                             Cancel（用户取消）
```

---

## TransactionSignature 组件

用于展示批量交易的实时状态,包括每个账户的独立状态和整体进度。

```tsx
import React from 'react';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { BorderLoadingBox } from '@/components/BorderLoadingBox.tsx';

type State = 'Pending' | 'Success' | 'Failed' | 'Cancel';

// 不同状态对应的图标
const STATUS_ICON = {
  Pending: <Loader2 className="animate-spin text-blue-500 w-5 h-5 drop-shadow-sm" />,
  Success: <CheckCircle className="text-green-500 w-5 h-5 drop-shadow-sm" />,
  Failed: <XCircle className="text-red-500 w-5 h-5 drop-shadow-sm" />,
  Cancel: <span className="text-gray-400 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">•</span>,
};

// 状态文本
const STATUS_TEXT = {
  Pending: '等待中',
  Success: '成功',
  Failed: '失败',
  Cancel: '取消',
};

/**
 * 计算整体状态
 * - Waiting: 尚未开始
 * - Pending: 有交易正在处理
 * - Success: 全部成功
 * - Failed: 全部失败
 * - Mixed: 部分成功部分失败
 */
function getOverallStatus(states: Record<string, State>) {
  const stateList = Object.values(states);
  if (stateList.length === 0) return 'Waiting';

  const hasPending = stateList.includes('Pending');
  const allSuccess = stateList.length > 0 && stateList.every((s) => s === 'Success');
  const allFailed = stateList.length > 0 && stateList.every((s) => s === 'Failed');

  if (hasPending) return 'Pending';
  if (allSuccess) return 'Success';
  if (allFailed) return 'Failed';
  return 'Mixed';
}

// 整体状态图标（更大尺寸）
const OVERALL_ICON = {
  Waiting: <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto drop-shadow-lg" />,
  Pending: <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto drop-shadow-lg" />,
  Success: (
    <CheckCircle className="w-12 h-12 text-green-500 mx-auto drop-shadow-lg animate-in zoom-in duration-500" />
  ),
  Failed: (
    <XCircle className="w-12 h-12 text-red-500 mx-auto drop-shadow-lg animate-in zoom-in duration-500" />
  ),
  Mixed: (
    <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto drop-shadow-lg animate-in zoom-in duration-500" />
  ),
};

// 整体状态提示文本
const OVERALL_TEXT = {
  Waiting: '正在构建交易子句,请耐心等待...',
  Pending: '交易处理中,请耐心等待...',
  Success: '全部交易成功！',
  Failed: '全部交易失败。',
  Mixed: '部分交易成功,部分失败。',
};

interface Props {
  open: boolean;
  states: Record<string, State>;  // 每个地址对应的状态
  onClose: () => void;
}

function TransactionSignature({ open, states, onClose }: Props) {
  if (!open) return null;

  const walletList = Object.entries(states);
  const overallStatus = getOverallStatus(states);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-10 w-full max-w-2xl relative text-center animate-in slide-in-from-bottom-4 duration-500">
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100/80 transition-all duration-200 group">
          <XCircle className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
        </button>

        {/* 整体状态展示 */}
        <div className="font-bold text-2xl center-flex flex-col gap-4 mb-12">
          <div className="relative">{OVERALL_ICON[overallStatus]}</div>
          <div className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">批量交易状态</div>
          <div className="text-sm text-gray-500 font-normal">{OVERALL_TEXT[overallStatus]}</div>
        </div>

        {/* 等待状态或账户列表 */}
        {overallStatus === 'Waiting' ? (
          <div className="center-flex">
            <BorderLoadingBox>{OVERALL_TEXT[overallStatus]}</BorderLoadingBox>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {walletList.map(([address, state], index) => (
              <div
                key={address}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-50/80 to-gray-100/50 border border-gray-200/50"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 状态图标 */}
                <div className="flex-shrink-0">{STATUS_ICON[state]}</div>

                {/* 钱包地址 */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-gray-700 truncate">{address}</div>
                </div>

                {/* 状态标签 */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    state === 'Success' ? 'bg-green-100 text-green-800 border border-green-200' :
                    state === 'Failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                    state === 'Pending' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {STATUS_TEXT[state]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionSignature;
```

### 组件特性

- **整体状态汇总**：自动计算所有交易的整体状态
- **实时更新**：交易状态变化时自动刷新 UI
- **动画效果**：每个账户项依次出现,提供流畅的视觉体验
- **响应式设计**：支持滚动显示大量账户

---

## SelfTransactionContext

提供全局上下文管理,统一管理交易状态和模态窗显示,支持在应用的任何地方调用自签名交易。

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import TransactionSignature from '@/components/TransactionSignature';
import useSelfSignature, { Account } from '@/hooks/useSelfSignature';

type State = 'Pending' | 'Success' | 'Failed' | 'Cancel';

interface SelfTransactionContextType {
  states: Record<string, State>;           // 所有账户的状态映射
  isOpen: boolean;                         // 模态窗是否打开
  closeSignature: () => void;              // 关闭模态窗并重置状态
  resetStates: () => void;                 // 仅重置状态,不关闭模态窗
  setWalletState: (address: string, state: State) => void;  // 手动设置某个地址状态
  sendTransaction: (senderAccount: Account, clauses: any[]) => Promise<void>;  // 发送交易
}

const SelfTransactionContext = createContext<SelfTransactionContextType | undefined>(undefined);

/**
 * Provider 组件:将自签名交易功能注入到应用中
 * 应该在应用的顶层使用,如 App.tsx 或 _app.tsx
 */
export function SelfTransactionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { states, sendTransaction: sendTx, resetStates, setWalletState } = useSelfSignature();

  // 打开模态窗
  const openSignature = () => setIsOpen(true);

  // 关闭模态窗并重置所有状态
  const closeSignature = () => {
    resetStates();
    setIsOpen(false);
  };

  /**
   * 发送交易并自动打开模态窗
   */
  const sendTransaction = async (senderAccount: Account, clauses: any[]) => {
    openSignature();  // 先打开模态窗
    await sendTx(senderAccount, clauses);  // 再发送交易
  };

  return (
    <SelfTransactionContext.Provider
      value={{ states, isOpen, closeSignature, resetStates, setWalletState, sendTransaction }}
    >
      {children}
      {/* 模态窗组件 */}
      <TransactionSignature open={isOpen} onClose={closeSignature} states={states} />
    </SelfTransactionContext.Provider>
  );
}

/**
 * Hook:在组件中使用自签名交易功能
 * 必须在 SelfTransactionProvider 内部使用
 */
export function useSelfTransaction() {
  const context = useContext(SelfTransactionContext);
  if (!context) {
    throw new Error('useSelfTransaction must be used within a SelfTransactionProvider');
  }
  return context;
}

export default SelfTransactionProvider;
```

### 使用示例

#### 1. 在应用顶层注入 Provider

```tsx
// App.tsx
import { SelfTransactionProvider } from '@/contexts/SelfTransactionContext';

function App() {
  return (
    <SelfTransactionProvider>
      <YourApp />
    </SelfTransactionProvider>
  );
}
```

#### 2. 在组件中使用

```tsx
import { useSelfTransaction } from '@/contexts/SelfTransactionContext';
import { Clause } from '@vechain/sdk-core';

function MyComponent() {
  const { sendTransaction } = useSelfTransaction();

  const handleBatchTransfer = async () => {
    const account = {
      address: '0x...',
      privateKey: '0x...'
    };

    // 构建多个转账子句
    const clauses = [
      Clause.transferVET('0xRecipient1', '1000000000000000000'),  // 1 VET
      Clause.transferVET('0xRecipient2', '2000000000000000000'),  // 2 VET
    ];

    // 发送交易,模态窗会自动打开并显示进度
    await sendTransaction(account, clauses);
  };

  return <button onClick={handleBatchTransfer}>批量转账</button>;
}
```

#### 3. 批量处理多个账户

```tsx
import { useSelfTransaction } from '@/contexts/SelfTransactionContext';

function BatchProcessor() {
  const { sendTransaction, states } = useSelfTransaction();

  const handleBatchProcess = async () => {
    const accounts = [
      { address: '0x...1', privateKey: '0x...' },
      { address: '0x...2', privateKey: '0x...' },
      { address: '0x...3', privateKey: '0x...' },
    ];

    // 并发发送多个交易
    await Promise.allSettled(
      accounts.map(account =>
        sendTransaction(account, [
          /* clauses for this account */
        ])
      )
    );

    // 检查所有交易状态
    console.log('所有交易状态:', states);
  };

  return <button onClick={handleBatchProcess}>批量处理</button>;
}
```

---

## 注意事项

### 安全性

⚠️ **私钥管理**：
- 永远不要在代码中硬编码私钥
- 不要将私钥提交到版本控制系统
- 建议使用环境变量或加密存储管理私钥

⚠️ **代付账户**：
- 确保代付账户有足够的 VTHO 余额
- 定期监控代付账户的使用情况
- 考虑设置代付金额上限

### 性能优化

- **批量交易**：如需处理大量账户,建议分批次处理,避免同时发起过多请求
- **Gas 预估**：Gas 预估可能失败,建议添加重试机制
- **错误处理**：完善的错误日志有助于排查问题

### 用户体验

- 交易确认通常需要 10 秒左右,给用户明确的等待提示
- 失败后提供清晰的错误信息和重试选项
- 成功后可以提供交易哈希,方便用户在区块浏览器查看

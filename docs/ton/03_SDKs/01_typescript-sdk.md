# TypeScript SDK

> 使用 TypeScript 构建 TON 应用的完整指南

> [!IMPORTANT] 本节重点
> 1. 如何安装和配置 TON TypeScript SDK？
> 2. 如何连接到 TON 网络？
> 3. 如何查询链上数据？
> 4. 如何构建和发送交易？
> 5. 如何与智能合约交互？
> 6. 如何使用 TON Connect 连接钱包？

## SDK 概述

TON 生态提供了多个 TypeScript/JavaScript 库：

- **@ton/ton** - 核心 SDK，提供完整功能
- **@ton/core** - 底层数据结构和工具
- **@ton/crypto** - 加密相关功能
- **@tonconnect/sdk** - 钱包连接标准

## 安装和配置

### 环境要求

- **Node.js**: >= 18.0
- **TypeScript**: >= 4.5（可选）

### 安装依赖

```bash
# 核心库
npm install @ton/ton @ton/core @ton/crypto

# 钱包连接
npm install @tonconnect/sdk @tonconnect/ui

# 开发工具
npm install -D typescript @types/node
```

## 快速开始

### 创建项目

```bash
# 创建新项目
mkdir ton-app
cd ton-app
npm init -y

# 安装依赖
npm install @ton/ton @ton/core @ton/crypto

# 创建 TypeScript 配置
npx tsc --init
```

### 基础示例

创建 `src/index.ts`：

```typescript
import { TonClient, Address } from '@ton/ton';

async function main() {
    // 连接到测试网
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });

    // 查询余额
    const address = Address.parse('EQ...');
    const balance = await client.getBalance(address);
    
    console.log('余额:', balance);
}

main();
```

运行：

```bash
npx ts-node src/index.ts
```

## 连接到 TON 网络

### 创建客户端

```typescript
import { TonClient } from '@ton/ton';

// 连接到测试网
const testnetClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'your-api-key', // 可选，但推荐使用
});

// 连接到主网
const mainnetClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: 'your-api-key',
});

// 使用自定义 RPC
const customClient = new TonClient({
    endpoint: 'https://your-custom-rpc-url',
});
```

### 配置选项

```typescript
import { TonClient, HttpApi } from '@ton/ton';

const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'your-api-key',
    timeout: 30000, // 30 秒超时
});
```

## 地址和密钥管理

### 地址操作

```typescript
import { Address } from '@ton/core';

// 解析地址
const address = Address.parse('EQ...');

// 地址格式转换
console.log(address.toString());                    // 用户友好格式
console.log(address.toRawString());                 // 原始格式
console.log(address.toString({ bounceable: false })); // 不可弹回格式

// 检查地址相等
const isSame = address.equals(anotherAddress);

// 获取工作链
const workchain = address.workChain; // 0 或 -1
```

### 生成密钥对

```typescript
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

// 生成新助记词
const mnemonic = await mnemonicNew(24);
console.log('助记词:', mnemonic.join(' '));

// 从助记词派生密钥对
const keyPair = await mnemonicToPrivateKey(mnemonic);
console.log('公钥:', keyPair.publicKey.toString('hex'));
console.log('私钥:', keyPair.secretKey.toString('hex'));

// 创建钱包
const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
});

console.log('钱包地址:', wallet.address.toString());
```

### 导入密钥

```typescript
import { mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';

// 验证助记词
const mnemonic = 'your 24 word mnemonic phrase...'.split(' ');
const isValid = await mnemonicValidate(mnemonic);

if (isValid) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    // 使用密钥对...
}
```

## 查询链上数据

### 查询余额

```typescript
import { TonClient, Address, fromNano } from '@ton/ton';

const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
});

const address = Address.parse('EQ...');

// 查询余额（返回 bigint，单位为 nanoton）
const balance = await client.getBalance(address);
console.log('余额:', fromNano(balance), 'TON');
```

### 查询账户状态

```typescript
// 查询账户状态
const state = await client.getContractState(address);

console.log('状态:', state.state); // 'active', 'uninitialized', 'frozen'
console.log('余额:', state.balance);
console.log('最后交易:', state.lastTransaction);
```

### 查询交易历史

```typescript
// 查询交易历史
const transactions = await client.getTransactions(address, {
    limit: 10,
});

for (const tx of transactions) {
    console.log('交易哈希:', tx.hash().toString('hex'));
    console.log('时间:', new Date(tx.now * 1000));
    console.log('---');
}
```

### 调用 Get 方法

```typescript
import { TonClient, Address } from '@ton/ton';

const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
});

const contractAddress = Address.parse('EQ...');

// 调用 get 方法
const result = await client.runMethod(contractAddress, 'get_counter');

// 读取返回值
const counter = result.stack.readNumber();
console.log('计数器值:', counter);
```

### 解析复杂返回值

```typescript
// 调用返回多个值的方法
const result = await client.runMethod(contractAddress, 'get_data');

// 读取多个返回值
const id = result.stack.readNumber();
const owner = result.stack.readAddress();
const active = result.stack.readBoolean();

console.log('ID:', id);
console.log('所有者:', owner.toString());
console.log('激活:', active);
```

## 构建和发送交易

### 基础转账

```typescript
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano } from '@ton/core';

async function sendTON() {
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });

    // 从助记词创建钱包
    const mnemonic = 'your 24 word mnemonic...'.split(' ');
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });

    const contract = client.open(wallet);

    // 发送 TON
    await contract.sendTransfer({
        seqno: await contract.getSeqno(),
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: 'EQ...',
                value: toNano('1'),
                body: 'Hello TON!',
            }),
        ],
    });

    console.log('交易已发送');
}

sendTON();
```

### 发送多笔交易

```typescript
// 批量转账
await contract.sendTransfer({
    seqno: await contract.getSeqno(),
    secretKey: keyPair.secretKey,
    messages: [
        internal({
            to: 'EQ...1',
            value: toNano('1'),
        }),
        internal({
            to: 'EQ...2',
            value: toNano('2'),
        }),
        internal({
            to: 'EQ...3',
            value: toNano('3'),
        }),
    ],
});
```

### 调用智能合约

```typescript
import { beginCell, toNano } from '@ton/core';

// 构建消息体
const body = beginCell()
    .storeUint(1, 32)  // op code
    .storeUint(0, 64)  // query id
    .storeUint(100, 32) // amount
    .endCell();

// 发送到合约
await contract.sendTransfer({
    seqno: await contract.getSeqno(),
    secretKey: keyPair.secretKey,
    messages: [
        internal({
            to: 'EQ...contract',
            value: toNano('0.05'),
            body: body,
        }),
    ],
});
```

## TON Connect 钱包连接

### 安装 TON Connect

```bash
npm install @tonconnect/sdk @tonconnect/ui
```

### 创建 Manifest

创建 `public/tonconnect-manifest.json`：

```json
{
    "url": "https://your-app.com",
    "name": "Your App Name",
    "iconUrl": "https://your-app.com/icon.png",
    "termsOfUseUrl": "https://your-app.com/terms",
    "privacyPolicyUrl": "https://your-app.com/privacy"
}
```

### 基础使用

```typescript
import { TonConnectUI } from '@tonconnect/ui';

// 初始化 TON Connect
const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://your-app.com/tonconnect-manifest.json',
});

// 连接钱包
await tonConnectUI.connectWallet();

// 获取钱包信息
const wallet = tonConnectUI.wallet;
if (wallet) {
    console.log('钱包地址:', wallet.account.address);
    console.log('链:', wallet.account.chain);
}

// 监听连接状态
tonConnectUI.onStatusChange((wallet) => {
    if (wallet) {
        console.log('钱包已连接:', wallet.account.address);
    } else {
        console.log('钱包已断开');
    }
});
```

### 发送交易

```typescript
import { toNano } from '@ton/core';

// 发送交易
const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 分钟有效期
    messages: [
        {
            address: 'EQ...',
            amount: toNano('1').toString(),
            payload: 'Hello TON!',
        },
    ],
};

try {
    const result = await tonConnectUI.sendTransaction(transaction);
    console.log('交易成功:', result);
} catch (error) {
    console.error('交易失败:', error);
}
```

### React 集成

```bash
npm install @tonconnect/ui-react
```

```tsx
import { TonConnectUIProvider, TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// 在应用根组件包裹 Provider
function App() {
    return (
        <TonConnectUIProvider manifestUrl="https://your-app.com/tonconnect-manifest.json">
            <YourApp />
        </TonConnectUIProvider>
    );
}

// 使用连接按钮
function ConnectWallet() {
    return <TonConnectButton />;
}

// 获取钱包信息
function WalletInfo() {
    const wallet = useTonWallet();
    
    if (!wallet) {
        return <div>未连接钱包</div>;
    }
    
    return (
        <div>
            <p>地址: {wallet.account.address}</p>
            <p>链: {wallet.account.chain}</p>
        </div>
    );
}

// 发送交易
function SendTransaction() {
    const [tonConnectUI] = useTonConnectUI();
    
    const handleSend = async () => {
        await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: 'EQ...',
                    amount: toNano('1').toString(),
                },
            ],
        });
    };
    
    return <button onClick={handleSend}>发送 1 TON</button>;
}
```

## Cell 操作

### 构建 Cell

```typescript
import { beginCell, Cell } from '@ton/core';

// 构建简单 Cell
const cell = beginCell()
    .storeUint(0x12345678, 32)  // 存储 32 位无符号整数
    .storeInt(-100, 32)         // 存储 32 位有符号整数
    .storeCoins(toNano('1'))    // 存储金额
    .storeAddress(address)      // 存储地址
    .storeStringTail('Hello')   // 存储字符串
    .endCell();

// 构建嵌套 Cell
const innerCell = beginCell()
    .storeUint(1, 8)
    .endCell();

const outerCell = beginCell()
    .storeRef(innerCell)  // 存储引用
    .endCell();
```

### 解析 Cell

```typescript
// 解析 Cell
const slice = cell.beginParse();

const op = slice.loadUint(32);
const amount = slice.loadInt(32);
const coins = slice.loadCoins();
const address = slice.loadAddress();
const text = slice.loadStringTail();

console.log('Op:', op);
console.log('Amount:', amount);
console.log('Coins:', fromNano(coins));
console.log('Address:', address.toString());
console.log('Text:', text);
```

### Cell 序列化

```typescript
// 序列化为 BOC（Bag of Cells）
const boc = cell.toBoc();
console.log('BOC (base64):', boc.toString('base64'));
console.log('BOC (hex):', boc.toString('hex'));

// 从 BOC 反序列化
const cellFromBoc = Cell.fromBoc(boc)[0];
```

## 实用工具

### 单位转换

```typescript
import { toNano, fromNano } from '@ton/core';

// TON 转 nanoton
const nanotons = toNano('1.5');     // 1500000000n
const nanotons2 = toNano(1.5);      // 1500000000n

// nanoton 转 TON
const tons = fromNano(1500000000n); // "1.5"
const tons2 = fromNano('1500000000'); // "1.5"
```

### 地址验证

```typescript
import { Address } from '@ton/core';

function isValidAddress(addressString: string): boolean {
    try {
        Address.parse(addressString);
        return true;
    } catch {
        return false;
    }
}

console.log(isValidAddress('EQ...')); // true
console.log(isValidAddress('invalid')); // false
```

### 等待交易确认

```typescript
async function waitForTransaction(
    client: TonClient,
    address: Address,
    previousLt: bigint,
    timeout = 60000
): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        const state = await client.getContractState(address);
        
        if (state.lastTransaction && state.lastTransaction.lt > previousLt) {
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
}
```

## 完整示例

### Jetton 管理器

```typescript
import { TonClient, Address, toNano, fromNano, beginCell } from '@ton/ton';
import { WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

class JettonManager {
    private client: TonClient;
    private wallet: WalletContractV4;
    private keyPair: any;
    private jettonMasterAddress: Address;

    constructor(
        endpoint: string,
        mnemonic: string[],
        jettonMasterAddress: string
    ) {
        this.client = new TonClient({ endpoint });
        this.jettonMasterAddress = Address.parse(jettonMasterAddress);
    }

    async init(mnemonic: string[]) {
        this.keyPair = await mnemonicToPrivateKey(mnemonic);
        this.wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: this.keyPair.publicKey,
        });
    }

    // 获取 Jetton 钱包地址
    async getJettonWalletAddress(ownerAddress: Address): Promise<Address> {
        const result = await this.client.runMethod(
            this.jettonMasterAddress,
            'get_wallet_address',
            [{ type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }]
        );

        return result.stack.readAddress();
    }

    // 查询余额
    async getBalance(ownerAddress: Address): Promise<bigint> {
        try {
            const jettonWalletAddress = await this.getJettonWalletAddress(ownerAddress);
            
            const result = await this.client.runMethod(
                jettonWalletAddress,
                'get_wallet_data'
            );

            return result.stack.readBigNumber();
        } catch {
            return 0n;
        }
    }

    // 转账 Jetton
    async transfer(
        toAddress: Address,
        amount: bigint,
        forwardPayload?: string
    ): Promise<void> {
        const contract = this.client.open(this.wallet);
        const jettonWalletAddress = await this.getJettonWalletAddress(this.wallet.address);

        // 构建转账消息
        let body = beginCell()
            .storeUint(0xf8a7ea5, 32)  // op: transfer
            .storeUint(0, 64)          // query_id
            .storeCoins(amount)        // amount
            .storeAddress(toAddress)   // destination
            .storeAddress(this.wallet.address) // response_destination
            .storeBit(0)               // no custom_payload
            .storeCoins(toNano('0.01')); // forward_ton_amount

        if (forwardPayload) {
            body = body
                .storeBit(1)
                .storeRef(beginCell().storeStringTail(forwardPayload).endCell());
        } else {
            body = body.storeBit(0);
        }

        // 发送交易
        await contract.sendTransfer({
            seqno: await contract.getSeqno(),
            secretKey: this.keyPair.secretKey,
            messages: [
                internal({
                    to: jettonWalletAddress,
                    value: toNano('0.1'),
                    body: body.endCell(),
                }),
            ],
        });
    }

    // 销毁 Jetton
    async burn(amount: bigint): Promise<void> {
        const contract = this.client.open(this.wallet);
        const jettonWalletAddress = await this.getJettonWalletAddress(this.wallet.address);

        const body = beginCell()
            .storeUint(0x595f07bc, 32)  // op: burn
            .storeUint(0, 64)           // query_id
            .storeCoins(amount)         // amount
            .storeAddress(this.wallet.address) // response_destination
            .endCell();

        await contract.sendTransfer({
            seqno: await contract.getSeqno(),
            secretKey: this.keyPair.secretKey,
            messages: [
                internal({
                    to: jettonWalletAddress,
                    value: toNano('0.05'),
                    body: body,
                }),
            ],
        });
    }
}

// 使用示例
async function main() {
    const manager = new JettonManager(
        'https://testnet.toncenter.com/api/v2/jsonRPC',
        'your 24 word mnemonic...'.split(' '),
        'EQ...jetton_master_address'
    );

    await manager.init('your 24 word mnemonic...'.split(' '));

    // 查询余额
    const balance = await manager.getBalance(Address.parse('EQ...'));
    console.log('余额:', fromNano(balance));

    // 转账
    await manager.transfer(
        Address.parse('EQ...recipient'),
        toNano('100'),
        'Hello from TON!'
    );

    console.log('转账成功');
}

main();
```

## 最佳实践

### 1. 错误处理

```typescript
async function safeTransaction() {
    try {
        await contract.sendTransfer({
            seqno: await contract.getSeqno(),
            secretKey: keyPair.secretKey,
            messages: [/* ... */],
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error('交易失败:', error.message);
        }
        throw error;
    }
}
```

### 2. 重试机制

```typescript
async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    throw new Error('Max retries reached');
}
```

### 3. 配置管理

```typescript
interface Config {
    network: 'testnet' | 'mainnet';
    apiKey?: string;
    mnemonic: string;
}

function getClient(config: Config): TonClient {
    const endpoints = {
        testnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        mainnet: 'https://toncenter.com/api/v2/jsonRPC',
    };

    return new TonClient({
        endpoint: endpoints[config.network],
        apiKey: config.apiKey,
    });
}
```

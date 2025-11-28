# SPL Token

> Solana 区块链的标准代币协议

## 什么是 SPL Token？

**SPL Token**（Solana Program Library Token）是 Solana 区块链上的标准代币协议，类似于以太坊的 ERC-20/ERC-721 标准。它由 Solana 官方提供，是实现代币功能的基础设施。

### 核心特点

- ⚡ **高性能** - 利用 Solana 的高吞吐量，支持每秒数万笔代币交易
- 💰 **低成本** - 交易费用极低（通常 < $0.001）
- 🔧 **统一标准** - 同质化代币（FT）和非同质化代币（NFT）使用相同的底层程序
- 🛡️ **安全可靠** - 经过充分审计，被 Solana 生态广泛采用

## SPL Token 程序地址

```text
Token Program v1:     TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Token 2022 Program:   TokenzQd9iReCk1L66P7a6i8YQdhoU5eWj84wnm8iT
```

**Token 2022（Token Extensions）** 是升级版本，新增了：
- 转账费用（Transfer Fee）
- 转账钩子（Transfer Hook）
- 机密转账（Confidential Transfer）
- 利息计算（Interest Bearing）
- 永久委托（Permanent Delegate）

## 与以太坊标准对比

| 特性 | Solana SPL Token | 以太坊 ERC-20/721 |
|------|------------------|-------------------|
| **交易速度** | 400ms 确认 | 12-15 秒确认 |
| **交易费用** | ~$0.00025 | $1-50（取决于 Gas） |
| **TPS** | 65,000+ | 15-30 |
| **账户模型** | 每个代币需要关联账户（ATA） | 余额存储在合约内 |
| **同质化代币** | SPL Token | ERC-20 |
| **非同质化代币** | SPL Token（同一程序） | ERC-721/1155 |
| **扩展性** | Token 2022 内置扩展 | 需要新合约标准 |

## SPL Token 架构

### 核心概念

**1. Mint（铸造账户）**
- 代币的"合约地址"
- 存储代币元数据：总供应量、小数位数、铸造权限

**2. Token Account（代币账户）**
- 用户持有代币的账户
- 每个用户对每种代币都需要一个 Token Account
- 类似于以太坊的余额映射

**3. Associated Token Account（关联代币账户，ATA）**
- 自动派生的标准代币账户地址
- 格式：`PDA(owner, mint, token_program)`
- 简化用户体验，避免地址混淆

### 账户关系图

```
用户钱包 (Keypair)
    │
    ├─── SOL 余额 (Native)
    │
    └─── Associated Token Accounts
            ├─── USDC Token Account
            │       └─── 余额: 1000 USDC
            │
            ├─── NFT Token Account
            │       └─── 余额: 1 NFT
            │
            └─── BONK Token Account
                    └─── 余额: 1,000,000 BONK
```

## 主要功能

### 同质化代币（Fungible Token）

- ✅ 创建代币（初始化 Mint）
- ✅ 铸造代币（Mint To）
- ✅ 转账代币（Transfer）
- ✅ 销毁代币（Burn）
- ✅ 授权与委托（Approve / Delegate）
- ✅ 冻结与解冻账户（Freeze / Thaw）

**应用场景：**
- 稳定币（USDC、USDT）
- 治理代币（DAO 投票权）
- Meme 币（BONK、SAMO）
- 游戏代币

### 非同质化代币（Non-Fungible Token）

- ✅ 创建 NFT（Mint with decimals=0, supply=1）
- ✅ 元数据标准（Metaplex）
- ✅ NFT 系列（Collection）
- ✅ 版税机制（Creator Royalties）
- ✅ 可编程 NFT（pNFT）

**应用场景：**
- 数字艺术品
- 游戏道具
- 域名（.sol）
- 会员凭证

## 快速开始

### 安装依赖

```bash
npm install @solana/web3.js @solana/spl-token
```

### 基本示例

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer
} from '@solana/spl-token';

// 连接到 Solana 网络
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// 创建代币
const mint = await createMint(
  connection,
  payer,           // 付费账户
  mintAuthority,   // 铸造权限
  null,            // 冻结权限（可选）
  9                // 小数位数
);

console.log('代币地址:', mint.toBase58());
```

## 学习路径

### 📖 同质化代币（FT）

详细学习如何创建和管理 Solana 上的同质化代币，包括：
- 初始化代币 Mint
- 创建关联代币账户
- 铸造和转账
- 授权机制
- Token 2022 新特性

👉 [查看同质化代币教程](./01_ft)

### 🎨 非同质化代币（NFT）

学习 Solana NFT 的创建和管理：
- NFT 标准与 Metaplex
- 创建 NFT 系列
- 元数据上传
- 版税设置
- NFT 市场集成

👉 [查看非同质化代币教程](./02_nft)

## 生态工具

### 开发工具

- **Solana CLI** - 命令行工具
- **SPL Token CLI** - 代币操作命令行
- **Anchor** - Solana 开发框架
- **Metaplex** - NFT 标准与工具

### 钱包

- **Phantom** - 最流行的 Solana 钱包
- **Solflare** - 功能丰富的多链钱包
- **Backpack** - xNFT 钱包
- **Magic Eden** - NFT 市场钱包

### 区块浏览器

- **Solscan** - https://solscan.io
- **Solana Explorer** - https://explorer.solana.com
- **SolanaFM** - https://solana.fm

## 常见问题

### Q1: SPL Token 和 ERC-20 的主要区别？

**A:** 主要区别在于账户模型：
- **ERC-20**：余额存储在合约的映射中 `mapping(address => uint256)`
- **SPL Token**：每个用户需要创建独立的 Token Account 来持有代币

优势：SPL Token 的账户隔离模型更安全，避免了合约重入攻击。

### Q2: 为什么需要创建 Token Account？

**A:** Solana 的账户模型要求每种代币的余额存储在独立的账户中。Associated Token Account (ATA) 机制简化了这个过程，自动为每个用户派生标准地址。

### Q3: Token 2022 和 Token v1 的区别？

**A:** Token 2022 是升级版本，完全向后兼容，新增了：
- 转账费用
- 机密转账
- 转账钩子
- 利息计算
- 更多可扩展功能

新项目建议使用 Token 2022。

### Q4: 如何选择小数位数？

**A:** 常见设置：
- **9 位小数** - 标准设置（类似 SOL）
- **6 位小数** - 稳定币常用（类似 USDC）
- **0 位小数** - NFT（供应量=1）

## 参考资源

- [SPL Token 官方文档](https://spl.solana.com/token)
- [Token 2022 文档](https://spl.solana.com/token-2022)
- [Metaplex 文档](https://docs.metaplex.com/)
- [Solana Cookbook](https://solanacookbook.com/)

# 非同质化代币-NFT

> Solana 上的 NFT 标准与 Metaplex 协议

## 什么是 Solana NFT？

Solana NFT 是基于 **SPL Token** 程序实现的非同质化代币，与同质化代币使用相同的底层程序，但有以下特征：

- **小数位数 = 0** - 不可分割
- **总供应量 = 1** - 唯一性
- **Metaplex 元数据** - 丰富的 NFT 信息（名称、图片、属性等）

## Metaplex 标准

**Metaplex** 是 Solana 生态的 NFT 标准协议，类似于以太坊的 ERC-721，提供了：

- 📝 **元数据标准** - 统一的 NFT 信息存储格式
- 🎨 **NFT 系列（Collection）** - 将多个 NFT 归为一个系列
- 💰 **版税机制** - 自动分配创作者收益
- 🔒 **可编程 NFT (pNFT)** - 可配置转账规则
- 🏪 **Candy Machine** - NFT 发售工具

### 核心组件

| 组件 | 说明 |
|------|------|
| **Token Metadata Program** | 存储 NFT 元数据的主程序 |
| **Master Edition** | 限量版 NFT（限制供应量） |
| **Collection** | NFT 系列管理 |
| **Candy Machine** | NFT 铸造和发售工具 |
| **Auction House** | NFT 交易市场协议 |

## 架构设计

### NFT 账户结构

```
NFT (Mint Account)
    │
    ├─── Metadata Account (PDA)
    │       ├─── name: "Cool NFT #123"
    │       ├─── symbol: "COOL"
    │       ├─── uri: "https://arweave.net/..."
    │       ├─── creators: [{ address, share, verified }]
    │       ├─── sellerFeeBasisPoints: 500 (5%)
    │       └─── collection: Collection Mint
    │
    ├─── Master Edition Account (PDA)
    │       ├─── supply: 0 (原版)
    │       ├─── maxSupply: Some(0) (唯一)
    │       └─── edition: Master
    │
    └─── Token Account (持有者)
            └─── amount: 1
```

### 元数据 JSON 标准

```json
{
  "name": "Cool NFT #123",
  "symbol": "COOL",
  "description": "这是一个很酷的 NFT",
  "image": "https://arweave.net/image.png",
  "external_url": "https://example.com/nft/123",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/image.png",
        "type": "image/png"
      }
    ],
    "category": "image",
    "creators": [
      {
        "address": "creator_wallet_address",
        "share": 100
      }
    ]
  }
}
```

## 安装依赖

```bash
# 核心依赖
npm install @solana/web3.js @solana/spl-token

# Metaplex 依赖
npm install @metaplex-foundation/js
npm install @metaplex-foundation/mpl-token-metadata

# 文件上传（可选）
npm install @bundlr-network/client  # Arweave 上传
npm install nft.storage              # IPFS 上传
```

## 创建单个 NFT

:::code-group

```typescript [使用 Metaplex SDK]
import { Metaplex, keypairIdentity, bundlrStorage } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';

// 初始化连接
const connection = new Connection(clusterApiUrl('devnet'));
const wallet = Keypair.generate();

// 初始化 Metaplex
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet))
  .use(bundlrStorage({
    address: 'https://devnet.bundlr.network',
    providerUrl: 'https://api.devnet.solana.com',
    timeout: 60000,
  }));

// 上传元数据
const { uri } = await metaplex.nfts().uploadMetadata({
  name: "My NFT",
  description: "This is my first Solana NFT",
  image: "https://arweave.net/my-image.png",
  attributes: [
    { trait_type: "Background", value: "Blue" },
    { trait_type: "Eyes", value: "Green" }
  ]
});

console.log("元数据 URI:", uri);

// 创建 NFT
const { nft } = await metaplex.nfts().create({
  uri,
  name: "My NFT",
  sellerFeeBasisPoints: 500, // 5% 版税
  creators: [
    {
      address: wallet.publicKey,
      share: 100,
      verified: true
    }
  ]
});

console.log("NFT Mint:", nft.address.toBase58());
```

```typescript [使用原生指令]
import {
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  mintTo
} from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const payer = Keypair.generate();

// 1. 创建 Mint（小数位数 = 0）
const mint = await createMint(
  connection,
  payer,
  payer.publicKey,  // mint authority
  null,             // freeze authority
  0                 // decimals = 0 for NFT
);

// 2. 创建关联代币账户
const tokenAddress = await getAssociatedTokenAddress(mint, payer.publicKey);

const createTokenAccountIx = createAssociatedTokenAccountInstruction(
  payer.publicKey,
  tokenAddress,
  payer.publicKey,
  mint
);

// 3. 铸造 1 个 NFT
await mintTo(
  connection,
  payer,
  mint,
  tokenAddress,
  payer.publicKey,
  1  // 铸造数量 = 1
);

// 4. 创建元数据账户
const metadataPDA = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer()
  ],
  TOKEN_METADATA_PROGRAM_ID
)[0];

const createMetadataIx = createCreateMetadataAccountV3Instruction(
  {
    metadata: metadataPDA,
    mint: mint,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey
  },
  {
    createMetadataAccountArgsV3: {
      data: {
        name: "My NFT",
        symbol: "MNFT",
        uri: "https://arweave.net/metadata.json",
        sellerFeeBasisPoints: 500,  // 5% 版税
        creators: [
          {
            address: payer.publicKey,
            verified: true,
            share: 100
          }
        ],
        collection: null,
        uses: null
      },
      isMutable: true,
      collectionDetails: null
    }
  }
);

// 5. 创建 Master Edition（确保唯一性）
const masterEditionPDA = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
    Buffer.from('edition')
  ],
  TOKEN_METADATA_PROGRAM_ID
)[0];

const createMasterEditionIx = createCreateMasterEditionV3Instruction(
  {
    edition: masterEditionPDA,
    mint: mint,
    updateAuthority: payer.publicKey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    metadata: metadataPDA
  },
  {
    createMasterEditionArgs: {
      maxSupply: 0  // 0 = 唯一，不能再铸造
    }
  }
);

// 6. 发送交易
const transaction = new Transaction()
  .add(createTokenAccountIx)
  .add(createMetadataIx)
  .add(createMasterEditionIx);

const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
console.log("NFT 创建成功:", signature);
```

:::

## 创建 NFT 系列

### 1. 创建系列（Collection）

```typescript
import { Metaplex } from '@metaplex-foundation/js';

// 创建系列 NFT
const { nft: collectionNft } = await metaplex.nfts().create({
  name: "My NFT Collection",
  uri: "https://arweave.net/collection-metadata.json",
  sellerFeeBasisPoints: 500,
  isCollection: true,  // 标记为系列
});

console.log("系列地址:", collectionNft.address.toBase58());
```

### 2. 将 NFT 添加到系列

```typescript
// 创建属于系列的 NFT
const { nft } = await metaplex.nfts().create({
  name: "NFT #1",
  uri: "https://arweave.net/nft-1.json",
  sellerFeeBasisPoints: 500,
  collection: collectionNft.address,  // 指定系列
});

// 验证 NFT 属于该系列（需要系列创建者签名）
await metaplex.nfts().verifyCollection({
  mintAddress: nft.address,
  collectionMintAddress: collectionNft.address,
  isSizedCollection: true,
});
```

## 元数据上传

### 方案 1：上传到 Arweave（推荐）

```typescript
import { Metaplex, bundlrStorage } from '@metaplex-foundation/js';
import fs from 'fs';

const metaplex = Metaplex.make(connection)
  .use(bundlrStorage());

// 1. 上传图片
const imageBuffer = fs.readFileSync('./nft-image.png');
const imageUri = await metaplex.storage().upload(imageBuffer);

console.log("图片 URI:", imageUri);

// 2. 上传元数据 JSON
const { uri: metadataUri } = await metaplex.nfts().uploadMetadata({
  name: "My NFT",
  description: "NFT description",
  image: imageUri,
  attributes: [
    { trait_type: "Background", value: "Blue" }
  ]
});

console.log("元数据 URI:", metadataUri);
```

### 方案 2：上传到 IPFS

```typescript
import { NFTStorage, File } from 'nft.storage';
import fs from 'fs';

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

// 上传图片和元数据
const imageData = fs.readFileSync('./nft-image.png');
const metadata = await client.store({
  name: 'My NFT',
  description: 'NFT description',
  image: new File([imageData], 'image.png', { type: 'image/png' }),
  attributes: [
    { trait_type: 'Background', value: 'Blue' }
  ]
});

console.log("IPFS URI:", metadata.url);
```

### 方案 3：自托管服务器

```typescript
// 上传到自己的服务器
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('https://your-server.com/upload', {
  method: 'POST',
  body: formData
});

const { imageUrl } = await response.json();

// 元数据 JSON 也托管在自己服务器上
const metadataUrl = `https://your-server.com/metadata/${nftId}.json`;
```

## 版税机制

### 设置版税

```typescript
// 创建 NFT 时设置版税
const { nft } = await metaplex.nfts().create({
  name: "My NFT",
  uri: metadataUri,
  sellerFeeBasisPoints: 500,  // 5% 版税（500 basis points）
  creators: [
    {
      address: creator1.publicKey,
      share: 70,      // 创作者 1 获得 70%
      verified: true
    },
    {
      address: creator2.publicKey,
      share: 30,      // 创作者 2 获得 30%
      verified: false  // 需要后续验证
    }
  ]
});
```

### 更新版税

```typescript
// 更新现有 NFT 的版税
await metaplex.nfts().update({
  nftOrSft: nft,
  sellerFeeBasisPoints: 750,  // 改为 7.5%
  creators: [
    {
      address: newCreator.publicKey,
      share: 100,
      verified: true
    }
  ]
});
```

### 版税执行

**重要：** Solana NFT 的版税不是强制执行的（协议层面），需要市场平台配合：

| 市场 | 版税执行 | 说明 |
|------|---------|------|
| **Magic Eden** | ✅ 支持 | 默认执行版税 |
| **Tensor** | ⚠️ 可选 | 买家可选择是否支付 |
| **OpenSea** | ✅ 支持 | 执行创作者版税 |
| **Blur** | ❌ 不支持 | 0% 版税 |

**可编程 NFT (pNFT)** 可以在协议层面强制执行版税。

## 可编程 NFT (pNFT)

pNFT 允许设置转账规则，强制执行版税：

```typescript
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

// 创建可编程 NFT
const { nft } = await metaplex.nfts().create({
  name: "Programmable NFT",
  uri: metadataUri,
  tokenStandard: TokenStandard.ProgrammableNonFungible,  // pNFT
  ruleSet: ruleSetAddress,  // 规则集地址
  sellerFeeBasisPoints: 500,
  creators: [
    {
      address: wallet.publicKey,
      share: 100,
      verified: true
    }
  ]
});

// pNFT 的转账必须遵守规则集，无法绕过版税
```

## 批量铸造（Candy Machine）

Candy Machine 是 Metaplex 的 NFT 发售工具：

```bash
# 安装 Sugar CLI
npm install -g @metaplex-foundation/sugar-cli

# 初始化 Candy Machine 配置
sugar create-config

# 上传 NFT 资源
sugar upload

# 部署 Candy Machine
sugar deploy

# 验证部署
sugar verify

# 铸造 NFT
sugar mint
```

### Candy Machine 配置示例

```json
{
  "price": 1.0,
  "number": 1000,
  "symbol": "MYNFT",
  "sellerFeeBasisPoints": 500,
  "gatekeeper": null,
  "solTreasuryAccount": "wallet_address",
  "goLiveDate": "2024-01-01T00:00:00Z",
  "endSettings": null,
  "whitelistMintSettings": null,
  "hiddenSettings": null,
  "uploadMethod": "bundlr",
  "awsS3Bucket": null,
  "retainAuthority": true,
  "isMutable": true,
  "creators": [
    {
      "address": "creator_wallet",
      "share": 100
    }
  ]
}
```

## NFT 转账

### 标准 NFT 转账

```typescript
import { transfer } from '@solana/spl-token';

// 获取发送方和接收方的代币账户
const fromTokenAccount = await getAssociatedTokenAddress(mintAddress, fromWallet.publicKey);
const toTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mintAddress,
  toWallet.publicKey
);

// 转账 NFT
await transfer(
  connection,
  payer,
  fromTokenAccount,
  toTokenAccount.address,
  fromWallet.publicKey,
  1  // NFT 数量 = 1
);
```

### pNFT 转账

```typescript
// pNFT 需要使用特殊的转账指令
await metaplex.nfts().transfer({
  nftOrSft: nft,
  fromOwner: fromWallet.publicKey,
  toOwner: toWallet.publicKey,
  amount: token(1),
  authorizationDetails: {
    rules: ruleSet  // 必须符合规则集
  }
});
```

## 市场集成

### 列出 NFT 出售（Magic Eden）

```typescript
// 1. 授权市场程序
import { createApproveInstruction } from '@solana/spl-token';

const approveIx = createApproveInstruction(
  tokenAccount,           // NFT 代币账户
  marketplaceAuthority,   // 市场授权账户
  owner.publicKey,        // 所有者
  1                       // 数量
);

// 2. 创建挂单
const listingData = {
  price: 1.5 * LAMPORTS_PER_SOL,  // 1.5 SOL
  tokenAccount: tokenAccount,
  seller: owner.publicKey
};

// 具体 API 参考各市场平台文档
```

## 查询 NFT

### 查询钱包拥有的所有 NFT

```typescript
const nfts = await metaplex.nfts().findAllByOwner({
  owner: wallet.publicKey
});

for (const nft of nfts) {
  console.log("NFT:", nft.name);
  console.log("Mint:", nft.address.toBase58());
  console.log("Metadata URI:", nft.uri);

  // 获取完整元数据
  const metadata = await fetch(nft.uri).then(res => res.json());
  console.log("图片:", metadata.image);
}
```

### 查询 NFT 详细信息

```typescript
const nft = await metaplex.nfts().findByMint({
  mintAddress: new PublicKey("NFT_MINT_ADDRESS")
});

console.log("名称:", nft.name);
console.log("创作者:", nft.creators);
console.log("版税:", nft.sellerFeeBasisPoints / 100, "%");
console.log("系列:", nft.collection?.address.toBase58());
```

## 常见问题

### Q1: Solana NFT 和以太坊 NFT 的主要区别？

**A:** 主要区别：

| 特性 | Solana NFT | 以太坊 NFT |
|------|-----------|-----------|
| **基础协议** | SPL Token | ERC-721/1155 |
| **铸造成本** | ~$0.01 | $50-500 |
| **转账成本** | ~$0.0005 | $5-50 |
| **元数据** | Metaplex 标准 | OpenSea 标准 |
| **版税强制** | 需市场配合（或使用 pNFT） | 需市场配合 |
| **铸造速度** | 400ms | 12-15 秒 |

### Q2: 如何选择元数据存储方案？

**A:** 推荐优先级：

1. **Arweave（最推荐）** - 永久存储，Solana 生态标准
2. **IPFS** - 去中心化，但需要 Pin 服务
3. **自托管** - 完全控制，但需维护服务器

### Q3: 版税可以修改吗？

**A:** 取决于 NFT 类型：
- **isMutable: true** - 可以修改（需 updateAuthority）
- **isMutable: false** - 无法修改
- **pNFT** - 版税强制执行，无法绕过

### Q4: 如何防止 NFT 被盗？

**A:** 安全建议：
- 使用硬件钱包（Ledger）
- 启用钱包授权确认
- 小心钓鱼网站
- 定期检查已授权的程序
- 对于高价值 NFT，使用冷钱包存储

### Q5: Compressed NFT 是什么？

**A:** **Compressed NFT (cNFT)** 是 Metaplex 的新技术，使用 State Compression（Merkle Tree）大幅降低成本：

- 铸造成本：~$0.0001（比标准 NFT 便宜 1000 倍）
- 适合大规模项目（如 10 万个 NFT 系列）
- 功能完整，支持转账、销毁等

```typescript
// 创建 Compressed NFT 树
const { tree } = await metaplex.bubblegum().createTree({
  maxDepth: 14,      // 最多 16,384 个 NFT
  maxBufferSize: 64
});

// 铸造 cNFT
await metaplex.bubblegum().mint({
  tree: tree.address,
  metadata: {
    name: "Compressed NFT",
    uri: metadataUri
  }
});
```

## 参考资源

- [Metaplex 官方文档](https://docs.metaplex.com/)
- [Metaplex JS SDK](https://github.com/metaplex-foundation/js)
- [Sugar CLI 文档](https://docs.metaplex.com/tools/sugar/)
- [Magic Eden API](https://api.magiceden.dev/)
- [Solana NFT 最佳实践](https://solanacookbook.com/references/nfts.html)

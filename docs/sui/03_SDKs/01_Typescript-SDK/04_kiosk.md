# Kiosk SDK

> 构建 NFT 市场和管理数字资产的完整工具包

> [!IMPORTANT] 本节重点
> 1. 什么是 Kiosk？为什么需要它？
> 2. 如何创建和管理 Kiosk？
> 3. 如何上架和交易 NFT？
> 4. 如何实现版税和转移策略？
> 5. 如何构建 NFT 市场？

## 什么是 Kiosk？

**Kiosk** 是 Sui 上的原生 NFT 交易和管理系统。它提供了一个去中心化的框架来：

- 🏪 **创建商店**: 每个用户可以拥有自己的 Kiosk
- 💰 **交易 NFT**: 安全地买卖数字资产
- 🔒 **版权保护**: 强制执行版税和转移策略
- 🎨 **展示资产**: 公开展示或私密存储 NFT
- 🔐 **访问控制**: 灵��的权限管理

### Kiosk vs 传统钱包

| 特性 | 传统钱包 | Kiosk |
|------|---------|-------|
| NFT 存储 | ✅ | ✅ |
| 直接交易 | ✅ | ✅ |
| 版税执行 | ❌ | ✅ |
| 转移策略 | ❌ | ✅ |
| 市场集成 | 复杂 | 简单 |
| 批量操作 | 有限 | 强大 |

## 安装

```bash
npm install @mysten/kiosk @mysten/sui
```

## 基础概念

### Kiosk 类型

1. **个人 Kiosk**: 用户拥有的 NFT 商店
2. **企业 Kiosk**: 项目方或平台的集中管理
3. **市场 Kiosk**: 去中心化市场的交易场所

### 核心组件

- **Kiosk**: NFT 容器和交易场所
- **KioskOwnerCap**: Kiosk 所有权凭证
- **TransferPolicy**: 转移策略（版税、规则等）
- **TransferPolicyCap**: 策略管理凭证

## 创建和管理 Kiosk

### 创建 Kiosk

```typescript
import { KioskClient, KioskTransaction } from '@mysten/kiosk';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// 初始化
const client = new SuiClient({ url: getFullnodeUrl('devnet') });
const keypair = Ed25519Keypair.generate();

// 创建 Kiosk 客户端
const kioskClient = new KioskClient({
  client,
  network: 'devnet',
});

// 创建新的 Kiosk
async function createKiosk() {
  const tx = new Transaction();

  // 创建 Kiosk
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });
  kioskTx.create();

  // 执行交易
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  // 提取 Kiosk ID 和 Owner Cap
  const createdObjects = result.objectChanges?.filter(
    (obj) => obj.type === 'created'
  );

  const kiosk = createdObjects?.find((obj) =>
    obj.objectType?.includes('::kiosk::Kiosk')
  );

  const ownerCap = createdObjects?.find((obj) =>
    obj.objectType?.includes('::kiosk::KioskOwnerCap')
  );

  console.log('✅ Kiosk 已创建');
  console.log('Kiosk ID:', kiosk?.objectId);
  console.log('Owner Cap:', ownerCap?.objectId);

  return {
    kioskId: kiosk?.objectId!,
    ownerCapId: ownerCap?.objectId!,
  };
}
```

### 查询 Kiosk 信息

```typescript
// 获取用户的所有 Kiosk
async function getUserKiosks(address: string) {
  const kiosks = await kioskClient.getOwnedKiosks({
    address,
  });

  console.log(`找到 ${kiosks.kioskIds.length} 个 Kiosk`);

  for (const kioskId of kiosks.kioskIds) {
    const kiosk = await kioskClient.getKiosk({
      id: kioskId,
      options: {
        withKioskFields: true,
        withListingPrices: true,
      },
    });

    console.log('Kiosk:', {
      id: kiosk.id,
      owner: kiosk.owner,
      itemCount: kiosk.itemIds.length,
      profits: kiosk.profits,
    });
  }

  return kiosks;
}

// 获取 Kiosk 详情
async function getKioskDetails(kioskId: string) {
  const kiosk = await kioskClient.getKiosk({
    id: kioskId,
    options: {
      withKioskFields: true,
      withListingPrices: true,
      withObjects: true,
    },
  });

  console.log('Kiosk 详情:', {
    id: kiosk.id,
    owner: kiosk.owner,
    itemCount: kiosk.itemIds.length,
    items: kiosk.items,
    listings: kiosk.listingIds,
    profits: kiosk.profits,
  });

  return kiosk;
}
```

## NFT 管理

### 放入 NFT

```typescript
async function placeNFTInKiosk(
  kioskId: string,
  ownerCapId: string,
  nftId: string
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 放入 NFT
  kioskTx.place({
    itemType: '0xpackage::nft::NFT', // NFT 类型
    item: tx.object(nftId),
    kiosk: kioskId,
    kioskCap: ownerCapId,
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ NFT 已放入 Kiosk');
  return result;
}
```

### 上架 NFT

```typescript
async function listNFT(
  kioskId: string,
  ownerCapId: string,
  nftId: string,
  price: bigint
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 上架 NFT
  kioskTx.list({
    itemType: '0xpackage::nft::NFT',
    itemId: nftId,
    price,
    kiosk: kioskId,
    kioskCap: ownerCapId,
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ NFT 已上架，价格:', price);
  return result;
}
```

### 取消上架

```typescript
async function delistNFT(
  kioskId: string,
  ownerCapId: string,
  nftId: string
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 取消上架
  kioskTx.delist({
    itemType: '0xpackage::nft::NFT',
    itemId: nftId,
    kiosk: kioskId,
    kioskCap: ownerCapId,
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ NFT 已下架');
  return result;
}
```

### 取出 NFT

```typescript
async function takeNFTFromKiosk(
  kioskId: string,
  ownerCapId: string,
  nftId: string
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 取出 NFT
  const nft = kioskTx.take({
    itemType: '0xpackage::nft::NFT',
    itemId: nftId,
    kiosk: kioskId,
    kioskCap: ownerCapId,
  });

  // 转移给自己
  tx.transferObjects([nft], tx.pure(keypair.getPublicKey().toSuiAddress()));

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ NFT 已取出');
  return result;
}
```

## 购买 NFT

### 基础购买

```typescript
async function purchaseNFT(
  sellerKioskId: string,
  nftId: string,
  price: bigint
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 准备支付
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(price)]);

  // 购买 NFT
  const nft = kioskTx.purchase({
    itemType: '0xpackage::nft::NFT',
    itemId: nftId,
    price,
    kiosk: sellerKioskId,
    payment: coin,
  });

  // 转移给买家
  tx.transferObjects([nft], tx.pure(keypair.getPublicKey().toSuiAddress()));

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('✅ NFT 购买成功');
  return result;
}
```

### 带版税的购买

```typescript
async function purchaseWithRoyalty(
  sellerKioskId: string,
  nftId: string,
  price: bigint,
  transferPolicyId: string
) {
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ transaction: tx, kioskClient });

  // 准备支付
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(price)]);

  // 购买并处理版税
  const { item: nft, transferRequest } = kioskTx.purchaseAndResolve({
    itemType: '0xpackage::nft::NFT',
    itemId: nftId,
    price,
    kiosk: sellerKioskId,
    payment: coin,
    transferPolicy: transferPolicyId,
  });

  // 确认转移请求
  kioskTx.confirmRequest({
    itemType: '0xpackage::nft::NFT',
    transferRequest,
    policy: transferPolicyId,
  });

  // 转移给买家
  tx.transferObjects([nft], tx.pure(keypair.getPublicKey().toSuiAddress()));

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ NFT 购买成功（包含版税）');
  return result;
}
```

## 转移策略和版税

### 创建转移策略

```typescript
async function createTransferPolicy(nftType: string) {
  const tx = new Transaction();

  // 创建转移策略
  tx.moveCall({
    target: '0x2::transfer_policy::new',
    typeArguments: [nftType],
    arguments: [
      // Publisher 对象
      tx.object('0x...publisher_id'),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showObjectChanges: true,
    },
  });

  const policy = result.objectChanges?.find((obj) =>
    obj.objectType?.includes('::transfer_policy::TransferPolicy')
  );

  const policyCap = result.objectChanges?.find((obj) =>
    obj.objectType?.includes('::transfer_policy::TransferPolicyCap')
  );

  console.log('✅ 转移策略已创建');
  console.log('Policy ID:', policy?.objectId);
  console.log('Policy Cap:', policyCap?.objectId);

  return {
    policyId: policy?.objectId!,
    policyCapId: policyCap?.objectId!,
  };
}
```

### 添加版税规则

```typescript
async function addRoyaltyRule(
  policyId: string,
  policyCapId: string,
  royaltyBps: number // 基点，例如 500 = 5%
) {
  const tx = new Transaction();

  // 添加版税规则
  tx.moveCall({
    target: '0x2::royalty_rule::add',
    typeArguments: ['0xpackage::nft::NFT'],
    arguments: [
      tx.object(policyId),
      tx.object(policyCapId),
      tx.pure(royaltyBps), // 版税比例（基点）
      tx.pure(0), // 最小金额
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log(`✅ 已添加 ${royaltyBps / 100}% 版税规则`);
  return result;
}
```

### 添加锁定规则

```typescript
async function addLockRule(policyId: string, policyCapId: string) {
  const tx = new Transaction();

  // 添加锁定规则（NFT 必须放在 Kiosk 中）
  tx.moveCall({
    target: '0x2::kiosk_lock_rule::add',
    typeArguments: ['0xpackage::nft::NFT'],
    arguments: [
      tx.object(policyId),
      tx.object(policyCapId),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  console.log('✅ 已添加锁定规则');
  return result;
}
```

## 完整的 NFT 市场示例

### Kiosk 管理类

```typescript
class KioskManager {
  private kioskClient: KioskClient;
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private kioskId?: string;
  private ownerCapId?: string;

  constructor(
    client: SuiClient,
    keypair: Ed25519Keypair,
    network: 'mainnet' | 'testnet' | 'devnet' = 'devnet'
  ) {
    this.client = client;
    this.keypair = keypair;
    this.kioskClient = new KioskClient({ client, network });
  }

  // 初始化或获取 Kiosk
  async initialize() {
    const address = this.keypair.getPublicKey().toSuiAddress();
    const kiosks = await this.kioskClient.getOwnedKiosks({ address });

    if (kiosks.kioskIds.length > 0) {
      // 使用现有 Kiosk
      this.kioskId = kiosks.kioskIds[0];
      this.ownerCapId = kiosks.kioskOwnerCaps[0].objectId;
      console.log('✅ 使用现有 Kiosk:', this.kioskId);
    } else {
      // 创建新 Kiosk
      const result = await this.createKiosk();
      this.kioskId = result.kioskId;
      this.ownerCapId = result.ownerCapId;
    }

    return { kioskId: this.kioskId, ownerCapId: this.ownerCapId };
  }

  private async createKiosk() {
    const tx = new Transaction();
    const kioskTx = new KioskTransaction({
      transaction: tx,
      kioskClient: this.kioskClient,
    });

    kioskTx.create();

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: { showObjectChanges: true },
    });

    const createdObjects = result.objectChanges?.filter(
      (obj) => obj.type === 'created'
    ) as any[];

    return {
      kioskId: createdObjects.find((o) => o.objectType.includes('::Kiosk'))
        .objectId,
      ownerCapId: createdObjects.find((o) =>
        o.objectType.includes('::KioskOwnerCap')
      ).objectId,
    };
  }

  // 上架 NFT
  async listNFT(nftId: string, nftType: string, price: bigint) {
    if (!this.kioskId || !this.ownerCapId) {
      throw new Error('Kiosk 未初始化');
    }

    const tx = new Transaction();
    const kioskTx = new KioskTransaction({
      transaction: tx,
      kioskClient: this.kioskClient,
    });

    // 先放入 Kiosk
    kioskTx.place({
      itemType: nftType,
      item: tx.object(nftId),
      kiosk: this.kioskId,
      kioskCap: this.ownerCapId,
    });

    // 然后上架
    kioskTx.list({
      itemType: nftType,
      itemId: nftId,
      price,
      kiosk: this.kioskId,
      kioskCap: this.ownerCapId,
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });

    console.log('✅ NFT 已上架');
    return result;
  }

  // 购买 NFT
  async buyNFT(
    sellerKioskId: string,
    nftId: string,
    nftType: string,
    price: bigint,
    transferPolicyId?: string
  ) {
    const tx = new Transaction();
    const kioskTx = new KioskTransaction({
      transaction: tx,
      kioskClient: this.kioskClient,
    });

    const [coin] = tx.splitCoins(tx.gas, [tx.pure(price)]);

    let nft: any;

    if (transferPolicyId) {
      // 带转移策略的购买
      const { item, transferRequest } = kioskTx.purchaseAndResolve({
        itemType: nftType,
        itemId: nftId,
        price,
        kiosk: sellerKioskId,
        payment: coin,
        transferPolicy: transferPolicyId,
      });

      nft = item;

      kioskTx.confirmRequest({
        itemType: nftType,
        transferRequest,
        policy: transferPolicyId,
      });
    } else {
      // 普通购买
      nft = kioskTx.purchase({
        itemType: nftType,
        itemId: nftId,
        price,
        kiosk: sellerKioskId,
        payment: coin,
      });
    }

    // 转移给买家
    tx.transferObjects(
      [nft],
      tx.pure(this.keypair.getPublicKey().toSuiAddress())
    );

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });

    console.log('✅ NFT 购买成功');
    return result;
  }

  // 查询市场上的 NFT
  async getMarketListings(nftType: string) {
    // 这里需要实现自定义查询逻辑
    // 可以通过索引服务或遍历 Kiosk
    const allKiosks = await this.getAllKiosks();
    const listings = [];

    for (const kioskId of allKiosks) {
      const kiosk = await this.kioskClient.getKiosk({
        id: kioskId,
        options: {
          withListingPrices: true,
          withObjects: true,
        },
      });

      for (const listing of kiosk.listingIds) {
        const item = kiosk.items.get(listing);
        if (item && item.type === nftType) {
          listings.push({
            kioskId,
            itemId: listing,
            price: kiosk.listingPrices.get(listing),
            metadata: item,
          });
        }
      }
    }

    return listings;
  }

  private async getAllKiosks() {
    // 实现获取所有 Kiosk 的逻辑
    // 这通常需要索引服务支持
    return [];
  }

  // 提取利润
  async withdrawProfits() {
    if (!this.kioskId || !this.ownerCapId) {
      throw new Error('Kiosk 未初始化');
    }

    const tx = new Transaction();
    const kioskTx = new KioskTransaction({
      transaction: tx,
      kioskClient: this.kioskClient,
    });

    // 提取利润
    const profits = kioskTx.withdraw({
      kiosk: this.kioskId,
      kioskCap: this.ownerCapId,
    });

    // 转移给自己
    tx.transferObjects(
      [profits],
      tx.pure(this.keypair.getPublicKey().toSuiAddress())
    );

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });

    console.log('✅ 利润已提取');
    return result;
  }

  getKioskId() {
    return this.kioskId;
  }

  getOwnerCapId() {
    return this.ownerCapId;
  }
}
```

### 使用示例

```typescript
async function marketplaceExample() {
  const client = new SuiClient({ url: getFullnodeUrl('devnet') });
  const sellerKeypair = Ed25519Keypair.generate();
  const buyerKeypair = Ed25519Keypair.generate();

  // 卖家初始化 Kiosk
  const sellerKiosk = new KioskManager(client, sellerKeypair, 'devnet');
  await sellerKiosk.initialize();

  // 买家初始化 Kiosk
  const buyerKiosk = new KioskManager(client, buyerKeypair, 'devnet');
  await buyerKiosk.initialize();

  // 卖家上架 NFT
  await sellerKiosk.listNFT(
    'nft_object_id',
    '0xpackage::nft::NFT',
    1_000_000_000n // 1 SUI
  );

  // 买家购买 NFT
  await buyerKiosk.buyNFT(
    sellerKiosk.getKioskId()!,
    'nft_object_id',
    '0xpackage::nft::NFT',
    1_000_000_000n
  );

  // 卖家提取利润
  await sellerKiosk.withdrawProfits();
}
```

## React 集成

### Kiosk 市场组件

```typescript
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { KioskClient } from '@mysten/kiosk';

function KioskMarketplace() {
  const account = useCurrentAccount();
  const [kioskManager, setKioskManager] = useState<KioskManager | null>(null);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    if (account) {
      const manager = new KioskManager(client, keypair, 'devnet');
      manager.initialize().then(() => {
        setKioskManager(manager);
      });
    }
  }, [account]);

  // 查询市场列表
  useEffect(() => {
    if (kioskManager) {
      kioskManager
        .getMarketListings('0xpackage::nft::NFT')
        .then(setListings);
    }
  }, [kioskManager]);

  const handleBuy = async (listing: any) => {
    if (!kioskManager) return;

    try {
      await kioskManager.buyNFT(
        listing.kioskId,
        listing.itemId,
        '0xpackage::nft::NFT',
        listing.price
      );

      alert('购买成功!');
    } catch (error: any) {
      alert(`购买失败: ${error.message}`);
    }
  };

  return (
    <div className="marketplace">
      <h2>NFT 市场</h2>

      <div className="listings-grid">
        {listings.map((listing) => (
          <div key={listing.itemId} className="listing-card">
            <img src={listing.metadata.display?.image_url} alt="NFT" />
            <h3>{listing.metadata.display?.name}</h3>
            <p>{Number(listing.price) / 1_000_000_000} SUI</p>
            <button onClick={() => handleBuy(listing)}>购买</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 最佳实践

### 1. Kiosk 管理

```typescript
// ✅ 好的做法
// 检查 Kiosk 是否存在
const kiosks = await kioskClient.getOwnedKiosks({ address });
if (kiosks.kioskIds.length === 0) {
  // 创建新 Kiosk
}

// ❌ 避免
// 不检查直接创建，可能导致多个 Kiosk
```

### 2. 版税处理

```typescript
// ✅ 总是检查是否有转移策略
const hasPolicy = await checkTransferPolicy(nftType);
if (hasPolicy) {
  // 使用 purchaseAndResolve
} else {
  // 使用普通 purchase
}
```

### 3. 错误处理

```typescript
async function safePurchase(listing: any) {
  try {
    // 检查余额
    const balance = await client.getBalance({ owner: address });
    if (BigInt(balance.totalBalance) < listing.price) {
      throw new Error('余额不足');
    }

    // 执行购买
    await buyNFT(listing);
  } catch (error: any) {
    if (error.message.includes('not listed')) {
      console.error('NFT 已下架');
    } else if (error.message.includes('insufficient')) {
      console.error('余额不足');
    } else {
      console.error('购买失败:', error);
    }
  }
}
```

## 常见问题

### Q1: Kiosk 和普通钱包有什么区别？

**A:** Kiosk 提供了额外的功能：
- 强制执行版税
- 支持转移策略
- 更好的市场集成
- 批量操作支持

### Q2: 如何查看 Kiosk 中的所有 NFT？

**A:** 使用 `kioskClient.getKiosk()` 并设置 `withObjects: true`。

### Q3: 可以有多个 Kiosk 吗？

**A:** 可以，但通常一个用户只需要一个 Kiosk。

### Q4: 版税如何分配？

**A:** 版税在购买时自动从支付金额中扣除，发送给创作者。

### Q5: 如何处理 NFT 的转移限制？

**A:** 使用转移策略（TransferPolicy）定义规则，在交易时自动执行。

## 参考资源

- [Kiosk 官方文档](https://docs.sui.io/standards/kiosk)
- [GitHub 仓库](https://github.com/MystenLabs/sui/tree/main/sdk/kiosk)
- [示例项目](https://github.com/MystenLabs/sui/tree/main/sdk/kiosk/examples)
- [Kiosk 标准](https://docs.sui.io/standards/kiosk/kiosk-apps)

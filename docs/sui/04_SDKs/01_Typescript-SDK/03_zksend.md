# zkSend

> 使用零知识证明的链接资产分发工具

> [!IMPORTANT] 本节重点
> 1. 什么是 zkSend？
> 2. 如何创建可领取的资产链接？
> 3. 如何领取链接中的资产？
> 4. 如何构建自定义的空投应用？

## 什么是 zkSend？

**@mysten/zksend** 是 Sui 提供的资产分发工具包，允许你通过简单的链接发送和接收数字资产。主要特点：

- 🔗 **简单链接**: 通过 URL 分享资产
- 🎁 **无需钱包**: 接收者无需提前创建钱包
- 🔐 **零知识证明**: 保护资产隐私和安全
- 💸 **批量空投**: 轻松进行大规模资产分发
- 🎯 **灵活控制**: 支持自定义领取条件

## 使用场景

- **营销活动**: 通过社交媒体分发代币
- **游戏奖励**: 发送游戏内资产
- **红包系统**: 创建加密红包
- **批量空投**: 向多个地址发送资产
- **礼品卡**: 创建可转赠的数字礼品

## 安装

```bash
npm install @mysten/zksend @mysten/sui.js
```

## 基础概念

### zkSend 链接

zkSend 链接包含：
- 资产信息（代币、NFT 等）
- 领取凭证
- 过期时间（可选）
- 自定义元数据（可选）

### 工作流程

1. **创建**: 发送者创建包含资产的链接
2. **分享**: 通过任何渠道分享链接
3. **领取**: 接收者点击链接并领取资产
4. **转移**: 资产自动转移到接收者钱包

## 创建 zkSend 链接

### 基础示例

```typescript
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// 初始化
const client = new SuiClient({ url: getFullnodeUrl('devnet') });
const keypair = Ed25519Keypair.generate();

// 创建链接构建器
const linkBuilder = new ZkSendLinkBuilder({
  client,
  sender: keypair.getPublicKey().toSuiAddress(),
});

// 添加资产
linkBuilder.addClaimableObject({
  objectId: '0x...', // 要发送的对象 ID
});

// 或者添加代币
linkBuilder.addClaimableSui({
  amount: 1_000_000_000, // 1 SUI (in MIST)
});

// 创建交易
const { transactionBlock, link } = await linkBuilder.createSendTransaction();

// 签名并执行
const result = await client.signAndExecuteTransactionBlock({
  signer: keypair,
  transactionBlock,
});

console.log('zkSend 链接:', link.url);
console.log('领取码:', link.claim_code);
```

### 发送 SUI 代币

```typescript
async function sendSuiViaLink(amount: number) {
  const linkBuilder = new ZkSendLinkBuilder({
    client,
    sender: keypair.getPublicKey().toSuiAddress(),
  });

  // 添加 SUI
  linkBuilder.addClaimableSui({
    amount: BigInt(amount * 1_000_000_000), // 转换为 MIST
  });

  // 可选：设置过期时间
  linkBuilder.setExpirationTime(
    Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 天后过期
  );

  // 可选：添加描述
  linkBuilder.setDescription('欢迎奖励 - 1 SUI');

  // 创建交易
  const { transactionBlock, link } = await linkBuilder.createSendTransaction();

  // 执行交易
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock,
  });

  return {
    url: link.url,
    claimCode: link.claim_code,
    digest: result.digest,
  };
}

// 使用
const link = await sendSuiViaLink(1); // 发送 1 SUI
console.log('分享此链接:', link.url);
```

### 发送 NFT

```typescript
async function sendNFTViaLink(nftId: string) {
  const linkBuilder = new ZkSendLinkBuilder({
    client,
    sender: keypair.getPublicKey().toSuiAddress(),
  });

  // 添加 NFT
  linkBuilder.addClaimableObject({
    objectId: nftId,
  });

  linkBuilder.setDescription('限量版 NFT 礼物');

  const { transactionBlock, link } = await linkBuilder.createSendTransaction();

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock,
  });

  return link;
}
```

### 发送多个资产

```typescript
async function sendMultipleAssets() {
  const linkBuilder = new ZkSendLinkBuilder({
    client,
    sender: keypair.getPublicKey().toSuiAddress(),
  });

  // 添加 SUI
  linkBuilder.addClaimableSui({
    amount: 1_000_000_000n, // 1 SUI
  });

  // 添加多个 NFT
  linkBuilder.addClaimableObject({ objectId: 'nft_1' });
  linkBuilder.addClaimableObject({ objectId: 'nft_2' });

  // 添加自定义代币
  linkBuilder.addClaimableObject({ objectId: 'token_1' });

  linkBuilder.setDescription('新手礼包 - 1 SUI + 2 NFT + Token');

  const { transactionBlock, link } = await linkBuilder.createSendTransaction();

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock,
  });

  return link;
}
```

## 领取资产

### 基础领取

```typescript
import { ZkSendLink } from '@mysten/zksend';

async function claimAssets(linkUrl: string, claimCode: string) {
  // 解析链接
  const link = ZkSendLink.fromUrl(linkUrl);

  // 创建或使用现有钱包
  const recipientKeypair = Ed25519Keypair.generate();
  const recipientAddress = recipientKeypair.getPublicKey().toSuiAddress();

  // 创建领取交易
  const claimTx = await link.createClaimTransaction({
    recipient: recipientAddress,
    claimCode,
  });

  // 签名并执行
  const result = await client.signAndExecuteTransactionBlock({
    signer: recipientKeypair,
    transactionBlock: claimTx,
  });

  console.log('领取成功!', result.digest);
  return result;
}
```

### 检查链接状态

```typescript
async function checkLinkStatus(linkUrl: string) {
  const link = ZkSendLink.fromUrl(linkUrl);

  const status = await link.getStatus(client);

  console.log('链接状态:', {
    isClaimed: status.claimed,
    isExpired: status.expired,
    assets: status.assets,
    createdAt: new Date(status.created_at),
    expiresAt: status.expires_at ? new Date(status.expires_at) : null,
  });

  return status;
}
```

### 查看链接包含的资产

```typescript
async function viewLinkAssets(linkUrl: string) {
  const link = ZkSendLink.fromUrl(linkUrl);

  const assets = await link.getAssets(client);

  console.log('链接包含的资产:');
  assets.forEach((asset, index) => {
    console.log(`${index + 1}.`, {
      type: asset.type,
      objectId: asset.objectId,
      amount: asset.amount,
      metadata: asset.metadata,
    });
  });

  return assets;
}
```

## 批量空投

### 创建批量链接

```typescript
async function createBulkLinks(
  recipients: number,
  amountPerRecipient: number
) {
  const links = [];

  for (let i = 0; i < recipients; i++) {
    const linkBuilder = new ZkSendLinkBuilder({
      client,
      sender: keypair.getPublicKey().toSuiAddress(),
    });

    linkBuilder.addClaimableSui({
      amount: BigInt(amountPerRecipient * 1_000_000_000),
    });

    linkBuilder.setDescription(`空投 #${i + 1}`);

    const { transactionBlock, link } = await linkBuilder.createSendTransaction();

    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock,
    });

    links.push({
      url: link.url,
      claimCode: link.claim_code,
      digest: result.digest,
    });

    console.log(`✅ 创建链接 ${i + 1}/${recipients}`);
  }

  return links;
}

// 使用：创建 100 个链接，每个 0.1 SUI
const airdropLinks = await createBulkLinks(100, 0.1);

// 保存或分发链接
airdropLinks.forEach((link, index) => {
  console.log(`链接 ${index + 1}: ${link.url}`);
});
```

### 优化批量操作

```typescript
// 使用批量交易优化 Gas
async function createBulkLinksOptimized(
  recipients: number,
  amountPerRecipient: bigint
) {
  const batchSize = 10; // 每批处理 10 个
  const links = [];

  for (let batch = 0; batch < Math.ceil(recipients / batchSize); batch++) {
    const batchLinks = [];
    const batchTxs = [];

    // 准备批次中的所有链接
    for (let i = 0; i < batchSize && batch * batchSize + i < recipients; i++) {
      const linkBuilder = new ZkSendLinkBuilder({
        client,
        sender: keypair.getPublicKey().toSuiAddress(),
      });

      linkBuilder.addClaimableSui({ amount: amountPerRecipient });

      const { transactionBlock, link } = await linkBuilder.createSendTransaction();

      batchLinks.push(link);
      batchTxs.push(transactionBlock);
    }

    // 批量执行
    const results = await Promise.all(
      batchTxs.map((tx) =>
        client.signAndExecuteTransactionBlock({
          signer: keypair,
          transactionBlock: tx,
        })
      )
    );

    // 收集结果
    batchLinks.forEach((link, i) => {
      links.push({
        url: link.url,
        claimCode: link.claim_code,
        digest: results[i].digest,
      });
    });

    console.log(`✅ 完成批次 ${batch + 1}`);
  }

  return links;
}
```

## 红包系统

### 创建红包

```typescript
class RedPacket {
  private links: Array<{ url: string; claimCode: string; amount: bigint }> = [];

  constructor(
    private client: SuiClient,
    private keypair: Ed25519Keypair
  ) {}

  // 固定金额红包
  async createFixed(totalAmount: bigint, count: number) {
    const amountPerPacket = totalAmount / BigInt(count);

    for (let i = 0; i < count; i++) {
      const link = await this.createSingleLink(amountPerPacket);
      this.links.push({ ...link, amount: amountPerPacket });
    }

    return this.links;
  }

  // 随机金额红包
  async createRandom(totalAmount: bigint, count: number) {
    const amounts = this.distributeRandomly(totalAmount, count);

    for (const amount of amounts) {
      const link = await this.createSingleLink(amount);
      this.links.push({ ...link, amount });
    }

    return this.links;
  }

  private async createSingleLink(amount: bigint) {
    const linkBuilder = new ZkSendLinkBuilder({
      client: this.client,
      sender: this.keypair.getPublicKey().toSuiAddress(),
    });

    linkBuilder.addClaimableSui({ amount });
    linkBuilder.setExpirationTime(Date.now() + 24 * 60 * 60 * 1000); // 24 小时

    const { transactionBlock, link } = await linkBuilder.createSendTransaction();

    await this.client.signAndExecuteTransactionBlock({
      signer: this.keypair,
      transactionBlock,
    });

    return link;
  }

  // 随机分配算法
  private distributeRandomly(total: bigint, count: number): bigint[] {
    const amounts: bigint[] = [];
    let remaining = total;

    for (let i = 0; i < count - 1; i++) {
      // 随机金额，但不超过平均值的 2 倍
      const maxAmount = (remaining * 2n) / BigInt(count - i);
      const amount = BigInt(
        Math.floor(Math.random() * Number(maxAmount)) + 1
      );

      amounts.push(amount);
      remaining -= amount;
    }

    amounts.push(remaining); // 最后一个红包是剩余金额

    return amounts.sort(() => Math.random() - 0.5); // 打乱顺序
  }

  getLinks() {
    return this.links;
  }
}

// 使用示例
const redPacket = new RedPacket(client, keypair);

// 创建 10 个红包，总共 10 SUI
const fixedLinks = await redPacket.createFixed(10_000_000_000n, 10);
console.log('固定红包:', fixedLinks);

// 创建随机金额红包
const randomLinks = await redPacket.createRandom(10_000_000_000n, 10);
console.log('随机红包:', randomLinks);
```

## 在 React 中使用

### 创建链接组件

```typescript
import { useState } from 'react';
import { ZkSendLinkBuilder } from '@mysten/zksend';
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';

function CreateZkSendLink() {
  const [amount, setAmount] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const handleCreate = async () => {
    setLoading(true);

    try {
      const linkBuilder = new ZkSendLinkBuilder({
        client,
        sender: currentAccount.address,
      });

      linkBuilder.addClaimableSui({
        amount: BigInt(parseFloat(amount) * 1_000_000_000),
      });

      const { transactionBlock, link: zkLink } =
        await linkBuilder.createSendTransaction();

      signAndExecute(
        { transactionBlock },
        {
          onSuccess: () => {
            setLink(zkLink.url);
            alert('链接创建成功!');
          },
          onError: (error) => {
            alert(`失败: ${error.message}`);
          },
        }
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>创建 zkSend 链接</h3>

      <input
        type="number"
        placeholder="金额 (SUI)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
      />

      <button onClick={handleCreate} disabled={loading || !amount}>
        {loading ? '创建中...' : '创建链接'}
      </button>

      {link && (
        <div>
          <h4>链接已创建!</h4>
          <input type="text" value={link} readOnly />
          <button onClick={() => navigator.clipboard.writeText(link)}>
            复制链接
          </button>
          <button onClick={() => {
            const text = `我给你发了 ${amount} SUI，点击领取: ${link}`;
            navigator.clipboard.writeText(text);
          }}>
            复制分享文案
          </button>
        </div>
      )}
    </div>
  );
}
```

### 领取链接组件

```typescript
import { useState, useEffect } from 'react';
import { ZkSendLink } from '@mysten/zksend';
import { useSignAndExecuteTransactionBlock, useCurrentAccount } from '@mysten/dapp-kit';

function ClaimZkSendLink({ linkUrl }: { linkUrl: string }) {
  const account = useCurrentAccount();
  const [status, setStatus] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  useEffect(() => {
    // 检查链接状态
    const checkStatus = async () => {
      const link = ZkSendLink.fromUrl(linkUrl);
      const linkStatus = await link.getStatus(client);
      setStatus(linkStatus);
    };

    checkStatus();
  }, [linkUrl]);

  const handleClaim = async () => {
    if (!account) {
      alert('请先连接钱包');
      return;
    }

    setClaiming(true);

    try {
      const link = ZkSendLink.fromUrl(linkUrl);

      // 提示用户输入领取码（如果需要）
      const claimCode = prompt('请输入领取码:');
      if (!claimCode) return;

      const claimTx = await link.createClaimTransaction({
        recipient: account.address,
        claimCode,
      });

      signAndExecute(
        { transactionBlock: claimTx },
        {
          onSuccess: () => {
            alert('领取成功!');
            // 刷新状态
            setStatus({ ...status, claimed: true });
          },
          onError: (error) => {
            alert(`领取失败: ${error.message}`);
          },
        }
      );
    } catch (error: any) {
      alert(`错误: ${error.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!status) {
    return <div>加载中...</div>;
  }

  if (status.claimed) {
    return <div>❌ 此链接已被领取</div>;
  }

  if (status.expired) {
    return <div>❌ 此链接已过期</div>;
  }

  return (
    <div>
      <h3>🎁 有人给你发送了资产!</h3>

      <div>
        <p>包含资产:</p>
        <ul>
          {status.assets.map((asset: any, i: number) => (
            <li key={i}>
              {asset.type}: {asset.amount || asset.objectId}
            </li>
          ))}
        </ul>
      </div>

      {status.expires_at && (
        <p>过期时间: {new Date(status.expires_at).toLocaleString()}</p>
      )}

      <button onClick={handleClaim} disabled={claiming || !account}>
        {claiming ? '领取中...' : '领取资产'}
      </button>

      {!account && <p>请先连接钱包以领取</p>}
    </div>
  );
}
```

## 最佳实践

### 1. 安全性

```typescript
// ✅ 好的做法
const linkBuilder = new ZkSendLinkBuilder({
  client,
  sender: keypair.getPublicKey().toSuiAddress(),
});

// 设置过期时间
linkBuilder.setExpirationTime(Date.now() + 7 * 24 * 60 * 60 * 1000);

// 添加描述以便识别
linkBuilder.setDescription('新用户注册奖励');

// ❌ 避免
// 不要创建永不过期的大额链接
// 不要在公开渠道分享包含高价值资产的链接
```

### 2. Gas 优化

```typescript
// 批量创建时优化 Gas
async function batchCreateLinks(count: number, amountEach: bigint) {
  const BATCH_SIZE = 10;
  const batches = [];

  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batch = [];

    for (let j = 0; j < BATCH_SIZE && i + j < count; j++) {
      batch.push(createSingleLink(amountEach));
    }

    // 并发执行一批
    const results = await Promise.all(batch);
    batches.push(...results);
  }

  return batches;
}
```

### 3. 错误处理

```typescript
async function safeCreateLink(amount: bigint) {
  try {
    const linkBuilder = new ZkSendLinkBuilder({
      client,
      sender: keypair.getPublicKey().toSuiAddress(),
    });

    linkBuilder.addClaimableSui({ amount });

    const { transactionBlock, link } = await linkBuilder.createSendTransaction();

    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock,
    });

    // 验证交易成功
    if (result.effects?.status?.status !== 'success') {
      throw new Error('交易失败');
    }

    return link;
  } catch (error: any) {
    if (error.message.includes('insufficient')) {
      throw new Error('余额不足');
    }
    throw error;
  }
}
```

## 常见问题

### Q1: 链接可以重复使用吗？

**A:** 不可以。每个 zkSend 链接只能被领取一次。

### Q2: 如何撤回未领取的链接？

**A:** 目前无法直接撤回。建议设���合理的过期时间。

### Q3: 领取需要 Gas 费吗？

**A:** 是的，领取者需要支付 Gas 费。确保接收者钱包有少量 SUI 用于支付 Gas。

### Q4: 可以发送哪些类型的资产？

**A:** 可以发送 SUI、自定义代币、NFT 等任何 Sui 对象。

### Q5: 如何跟踪链接的领取状态？

**A:** 使用 `link.getStatus(client)` 方法查询状态。

## 参考资源

- [zkSend 官方文档](https://docs.sui.io/guides/developer/sui-101/create-coin)
- [GitHub 仓库](https://github.com/MystenLabs/sui/tree/main/sdk/zksend)
- [示例项目](https://github.com/MystenLabs/sui/tree/main/sdk/zksend/examples)

# 创建 NFT 集合

> 使用 Tact 创建 NFT Collection 和 NFT Item

NFT 在 TON 上采用分布式架构，由 NFT Collection（集合合约）和 NFT Item（单个 NFT 合约）组成。

## 创建项目

```bash
# 使用 NFT 模板创建项目
npm create ton@latest my-nft -- --template nft

cd my-nft
npm install
```

## NFT 合约

### NFT Collection 合约

`contracts/nft_collection.tact`：

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    to: Address;
    metadata: Cell;
}

contract NFTCollection with Deployable, Ownable {
    owner: Address;
    nextItemIndex: Int as uint64;
    collectionContent: Cell;
    
    init(owner: Address, collectionContent: Cell) {
        self.owner = owner;
        self.nextItemIndex = 0;
        self.collectionContent = collectionContent;
    }
    
    receive(msg: Mint) {
        self.requireOwner();
        
        // 创建 NFT Item
        let itemInit = initOf NFTItem(myAddress(), self.nextItemIndex);
        send(SendParameters{
            to: contractAddress(itemInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: itemInit.code,
            data: itemInit.data,
            body: InitNFT{
                owner: msg.to,
                content: msg.metadata
            }.toCell()
        });
        
        self.nextItemIndex += 1;
    }
    
    get fun nextItemIndex(): Int {
        return self.nextItemIndex;
    }
    
    get fun collectionContent(): Cell {
        return self.collectionContent;
    }
}
```

### NFT Item 合约

```tact
message InitNFT {
    owner: Address;
    content: Cell;
}

message Transfer {
    newOwner: Address;
}

contract NFTItem {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    content: Cell;
    
    init(collection: Address, index: Int) {
        self.collection = collection;
        self.index = index;
        self.owner = collection;
        self.content = emptyCell();
    }
    
    receive(msg: InitNFT) {
        require(sender() == self.collection, "Only collection can init");
        self.owner = msg.owner;
        self.content = msg.content;
    }
    
    receive(msg: Transfer) {
        require(sender() == self.owner, "Only owner can transfer");
        self.owner = msg.newOwner;
    }
    
    get fun owner(): Address {
        return self.owner;
    }
    
    get fun content(): Cell {
        return self.content;
    }
    
    get fun index(): Int {
        return self.index;
    }
}
```

## 编译和测试

```bash
# 编译合约
npx blueprint build

# 运行测试
npx blueprint test

# 部署到测试网
npx blueprint run
```

## 铸造 NFT

创建 `scripts/mintNFT.ts`：

```typescript
import { Address, toNano, beginCell } from '@ton/core';
import { NFTCollection } from '../wrappers/NFTCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // NFT Collection 地址
    const collectionAddress = Address.parse(await ui.input('Collection address'));
    const collection = provider.open(NFTCollection.fromAddress(collectionAddress));
    
    // 接收者地址
    const recipient = Address.parse(await ui.input('Recipient address'));
    
    // NFT 元数据
    const metadata = beginCell()
        .storeStringTail(JSON.stringify({
            name: "My NFT #1",
            description: "My first NFT on TON",
            image: "https://example.com/nft.png",
            attributes: [
                { trait_type: "Rarity", value: "Legendary" },
                { trait_type: "Power", value: 100 }
            ]
        }))
        .endCell();
    
    // 发送铸造交易
    await collection.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'Mint',
            to: recipient,
            metadata: metadata,
        }
    );
    
    ui.write('NFT minted successfully!');
}
```

运行铸造脚本：

```bash
npx blueprint run mintNFT
```

## NFT 元数据

### Collection 元数据

```json
{
    "name": "My NFT Collection",
    "description": "A collection of unique NFTs",
    "image": "https://example.com/collection.png",
    "cover_image": "https://example.com/cover.png",
    "social_links": [
        "https://twitter.com/...",
        "https://discord.gg/..."
    ]
}
```

### NFT Item 元数据

```json
{
    "name": "NFT #1",
    "description": "NFT description",
    "image": "https://example.com/nft.png",
    "attributes": [
        {
            "trait_type": "Background",
            "value": "Blue"
        },
        {
            "trait_type": "Rarity",
            "value": "Legendary"
        },
        {
            "trait_type": "Power",
            "value": 100
        }
    ],
    "content_url": "https://example.com/content.mp4",
    "content_type": "video/mp4"
}
```

## 查询 NFT 信息

### 查询 NFT 所有者

```typescript
import { TonClient, Address } from '@ton/ton';

async function getNFTOwner(
    client: TonClient,
    nftItemAddress: string
) {
    const result = await client.runMethod(
        Address.parse(nftItemAddress),
        'get_nft_data'
    );
    
    result.stack.readBoolean(); // init
    result.stack.readBigNumber(); // index
    result.stack.readAddress(); // collection
    const owner = result.stack.readAddress();
    
    return owner;
}

// 使用示例
const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
});

const owner = await getNFTOwner(client, 'EQ...nft_item');
console.log('NFT 所有者:', owner.toString());
```

### 查询集合信息

```typescript
async function getCollectionInfo(
    client: TonClient,
    collectionAddress: string
) {
    const result = await client.runMethod(
        Address.parse(collectionAddress),
        'get_collection_data'
    );
    
    const nextItemIndex = result.stack.readBigNumber();
    const content = result.stack.readCell();
    const owner = result.stack.readAddress();
    
    return {
        nextItemIndex,
        content,
        owner
    };
}
```

## 转移 NFT

使用 TON Connect 转移 NFT：

```typescript
import { TonConnectUI } from '@tonconnect/ui';
import { Address, toNano, beginCell } from '@ton/core';

const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://your-app.com/tonconnect-manifest.json',
});

// 构建转移消息
const transferBody = beginCell()
    .storeUint(0x5fcc3d14, 32)  // op: transfer
    .storeUint(0, 64)           // query_id
    .storeAddress(Address.parse('UQ...new_owner'))
    .storeAddress(Address.parse(tonConnectUI.wallet.account.address))
    .storeBit(0)                // no custom_payload
    .storeCoins(toNano('0.01')) // forward_amount
    .storeBit(0)                // no forward_payload
    .endCell();

// 发送交易
await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
        {
            address: 'EQ...nft_item',
            amount: toNano('0.1').toString(),
            payload: transferBody.toBoc().toString('base64')
        }
    ]
});
```

## 批量铸造 NFT

创建批量铸造脚本：

```typescript
import { Address, toNano, beginCell, Cell } from '@ton/core';
import { NFTCollection } from '../wrappers/NFTCollection';

async function batchMintNFTs(
    collection: any,
    sender: any,
    recipients: Address[],
    metadataList: Cell[]
) {
    for (let i = 0; i < recipients.length; i++) {
        console.log(`Minting NFT ${i + 1}/${recipients.length}...`);
        
        await collection.send(
            sender,
            { value: toNano('0.1') },
            {
                $$type: 'Mint',
                to: recipients[i],
                metadata: metadataList[i],
            }
        );
        
        // 等待一段时间避免过快
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('All NFTs minted successfully!');
}

// 使用示例
const recipients = [
    Address.parse('UQ...1'),
    Address.parse('UQ...2'),
    Address.parse('UQ...3'),
];

const metadataList = recipients.map((_, i) => 
    beginCell()
        .storeStringTail(JSON.stringify({
            name: `NFT #${i + 1}`,
            description: `NFT number ${i + 1}`,
            image: `https://example.com/nft-${i + 1}.png`,
        }))
        .endCell()
);

await batchMintNFTs(collection, sender, recipients, metadataList);
```

## 完整 DApp 示例

创建一个简单的 NFT 展示页面：

```html
<!DOCTYPE html>
<html>
<head>
    <title>TON NFT Gallery</title>
    <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js"></script>
    <style>
        .nft-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .nft-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
        }
        .nft-card img {
            width: 100%;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>My NFT Gallery</h1>
    
    <div id="ton-connect"></div>
    
    <div id="nft-gallery" class="nft-grid"></div>
    
    <script>
        const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://your-app.com/tonconnect-manifest.json',
            buttonRootId: 'ton-connect'
        });
        
        tonConnectUI.onStatusChange(async (wallet) => {
            if (wallet) {
                await loadNFTs(wallet.account.address);
            }
        });
        
        async function loadNFTs(address) {
            // 查询用户的 NFT
            const response = await fetch(
                `https://tonapi.io/v2/accounts/${address}/nfts`
            );
            const data = await response.json();
            
            const gallery = document.getElementById('nft-gallery');
            gallery.innerHTML = '';
            
            data.nft_items.forEach(nft => {
                const card = document.createElement('div');
                card.className = 'nft-card';
                card.innerHTML = `
                    <img src="${nft.metadata.image}" alt="${nft.metadata.name}">
                    <h3>${nft.metadata.name}</h3>
                    <p>${nft.metadata.description}</p>
                `;
                gallery.appendChild(card);
            });
        }
    </script>
</body>
</html>
```

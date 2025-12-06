# Sui Client

> Sui TypeScript SDK 的核心客户端库 - 连接、查询和交易的基础

> [!IMPORTANT] 本节重点
> 1. 如何连接到 Sui 网络？
> 2. 如何创建和管理钱包？
> 3. 如何查询链上数据？
> 4. 如何构建和执行交易？ 
> 5. 如何与智能合约交互？ 
> 6. 如何使用 BCS 编码？

## 快速开始

### 创建项目

```bash
# 创建新项目
mkdir sui-app && cd sui-app
npm init -y

# 安装依赖
npm install @mysten/sui
npm install -D typescript @types/node ts-node

# 初始化 TypeScript
npx tsc --init
```

### 基础示例

创建 `src/index.ts`：

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

async function main() {
  // 连接到 Sui devnet
  const client = new SuiClient({ url: getFullnodeUrl('devnet') });

  // 查询链信息
  const chainId = await client.getChainIdentifier();
  console.log('链 ID:', chainId);

  // 查询最新检查点
  const checkpoint = await client.getLatestCheckpointSequenceNumber();
  console.log('最新检查点:', checkpoint);

  // 查询 RPC 版本
  const version = await client.getRpcApiVersion();
  console.log('RPC 版本:', version);
}

main().catch(console.error);
```

运行：

```bash
npx ts-node src/index.ts
```

## 连接到 Sui 网络

### 创建客户端

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// 连接到不同网络
const devnetClient = new SuiClient({
  url: getFullnodeUrl('devnet')
});

const testnetClient = new SuiClient({
  url: getFullnodeUrl('testnet')
});

const mainnetClient = new SuiClient({
  url: getFullnodeUrl('mainnet')
});

// 连接到自定义 RPC
const customClient = new SuiClient({
  url: 'https://your-custom-rpc-url'
});
```

### 网络 URL

```typescript
import { getFullnodeUrl } from '@mysten/sui/client';

const urls = {
  devnet: getFullnodeUrl('devnet'),
  testnet: getFullnodeUrl('testnet'),
  mainnet: getFullnodeUrl('mainnet')
};

console.log(urls);
// {
//   devnet: 'https://fullnode.devnet.sui.io',
//   testnet: 'https://fullnode.testnet.sui.io',
//   mainnet: 'https://fullnode.mainnet.sui.io'
// }
```

## 钱包管理

### 创建新钱包

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// 方式 1：生成新的随机密钥对
const keypair = new Ed25519Keypair();
const address = keypair.getPublicKey().toSuiAddress();

console.log('地址:', address);
console.log('私钥:', keypair.export().privateKey);

// 方式 2：从助记词生成
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const mnemonic = 'your twelve word mnemonic phrase here...';
const keypairFromMnemonic = Ed25519Keypair.deriveKeypair(mnemonic);
```

### 导入现有钱包

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// 从私钥导入（Base64 格式）
const privateKeyBase64 = 'your_private_key_base64';
const decodedKey = decodeSuiPrivateKey(privateKeyBase64);
const keypair = Ed25519Keypair.fromSecretKey(decodedKey.secretKey);

// 从密钥字符串导入
const keypair2 = Ed25519Keypair.fromSecretKey(
  Uint8Array.from(Buffer.from(privateKeyBase64, 'base64'))
);
```

### 多种密钥算法

```typescript
// Ed25519（推荐）
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
const ed25519 = new Ed25519Keypair();

// Secp256k1（与以太坊兼容）
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
const secp256k1 = new Secp256k1Keypair();

// Secp256r1
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
const secp256r1 = new Secp256r1Keypair();
```

## 查询链上数据

### 查询余额

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl('devnet') });

// 查询 SUI 余额
async function getBalance(address: string) {
  const balance = await client.getBalance({
    owner: address
  });

  console.log('总余额:', balance.totalBalance);
  console.log('币种:', balance.coinType);
  console.log('对象数量:', balance.coinObjectCount);
}

// 查询特定代币余额
async function getTokenBalance(address: string, coinType: string) {
  const balance = await client.getBalance({
    owner: address,
    coinType: coinType  // 例如: '0x2::sui::SUI'
  });

  return balance;
}

// 查询所有代币余额
async function getAllBalances(address: string) {
  const balances = await client.getAllBalances({
    owner: address
  });

  balances.forEach(balance => {
    console.log(`${balance.coinType}: ${balance.totalBalance}`);
  });
}
```

### 查询拥有的对象

```typescript
// 查询所有拥有的对象
async function getOwnedObjects(address: string) {
  const objects = await client.getOwnedObjects({
    owner: address,
    options: {
      showType: true,
      showContent: true,
      showDisplay: true
    }
  });

  for (const obj of objects.data) {
    console.log('对象 ID:', obj.data?.objectId);
    console.log('版本:', obj.data?.version);
    console.log('摘要:', obj.data?.digest);
    console.log('类型:', obj.data?.type);
    console.log('---');
  }

  return objects;
}

// 分页查询
async function getOwnedObjectsPaginated(address: string) {
  let hasNextPage = true;
  let cursor: string | null = null;
  const allObjects = [];

  while (hasNextPage) {
    const response = await client.getOwnedObjects({
      owner: address,
      cursor,
      limit: 50,
      options: { showType: true }
    });

    allObjects.push(...response.data);
    hasNextPage = response.hasNextPage;
    cursor = response.nextCursor ?? null;
  }

  return allObjects;
}

// 过滤特定类型的对象
async function getObjectsByType(address: string, type: string) {
  const objects = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: type
    },
    options: { showContent: true }
  });

  return objects;
}
```

### 查询对象详情

```typescript
// 查询单个对象
async function getObject(objectId: string) {
  const object = await client.getObject({
    id: objectId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showPreviousTransaction: true,
      showDisplay: true
    }
  });

  console.log('对象数据:', object.data);
  return object;
}

// 批量查询对象
async function getMultipleObjects(objectIds: string[]) {
  const objects = await client.multiGetObjects({
    ids: objectIds,
    options: {
      showContent: true,
      showType: true
    }
  });

  return objects;
}

// 查询动态字段
async function getDynamicFields(parentObjectId: string) {
  const fields = await client.getDynamicFields({
    parentId: parentObjectId
  });

  return fields;
}

// 查询动态字段对象
async function getDynamicFieldObject(
  parentObjectId: string,
  fieldName: { type: string; value: any }
) {
  const fieldObject = await client.getDynamicFieldObject({
    parentId: parentObjectId,
    name: fieldName
  });

  return fieldObject;
}
```

### 查询交易

```typescript
// 查询交易详情
async function getTransaction(digest: string) {
  const tx = await client.getTransactionBlock({
    digest,
    options: {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true
    }
  });

  console.log('交易详情:', JSON.stringify(tx, null, 2));
  return tx;
}

// 查询多个交易
async function getMultipleTransactions(digests: string[]) {
  const transactions = await client.multiGetTransactionBlocks({
    digests,
    options: {
      showEffects: true,
      showEvents: true
    }
  });

  return transactions;
}

// 查询地址的交易历史
async function getTransactionHistory(address: string) {
  const transactions = await client.queryTransactionBlocks({
    filter: {
      FromAddress: address
    },
    options: {
      showEffects: true,
      showInput: true
    },
    limit: 20
  });

  return transactions;
}
```

### 查询事件

```typescript
// 查询事件
async function queryEvents(packageId: string) {
  const events = await client.queryEvents({
    query: {
      MoveEventModule: {
        package: packageId,
        module: 'my_module'
      }
    },
    limit: 10
  });

  return events;
}

// 按事件类型查询
async function queryEventsByType(eventType: string) {
  const events = await client.queryEvents({
    query: { MoveEventType: eventType },
    limit: 20
  });

  return events;
}

// 按发送者查询
async function queryEventsBySender(sender: string) {
  const events = await client.queryEvents({
    query: { Sender: sender },
    limit: 20
  });

  return events;
}
```

## 构建和执行交易

### 基础转账

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function transferSui(
  senderKeypair: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

  tx.transferObjects([coin], tx.pure.address(receiptAddress));

  // 签名并执行
  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true
    }
  });

  console.log('交易摘要:', result.digest);
  console.log('状态:', result.effects?.status);

  return result;
}
```

### 转移对象

```typescript
async function transferObject(
  senderKeypair: Ed25519Keypair,
  objectId: string,
  recipient: string
) {
  const tx = new Transaction();

  // 转移对象
  tx.transferObjects(
    [tx.object(objectId)],
    tx.pure.address(recipient)
  );

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

> [!DANGER] 转移对象不允许转移 SUI 代币
> 因为 SUI 是特殊系统币，不能用普通的 transferObjects() 去转移 `Coin<SUI>` 对象。


### 合并和拆分代币

```typescript
// 合并代币
async function mergeCoins(
  senderKeypair: Ed25519Keypair,
  primaryCoin: string,
  coinsToMerge: string[]
) {
  const tx = new Transaction();

  tx.mergeCoins(
    tx.object(primaryCoin),
    coinsToMerge.map(coin => tx.object(coin))
  );

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}

// 拆分代币
async function splitCoin(
  senderKeypair: Ed25519Keypair,
  coinId: string,
  amounts: number[]
) {
  const tx = new Transaction();

  const coins = tx.splitCoins(
    tx.object(coinId),
    amounts.map(amount => tx.pure(amount))
  );

  // 将拆分的币转回发送者
  tx.transferObjects(
    [coins],
    tx.pure.address(senderKeypair.getPublicKey().toSuiAddress())
  );

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### 调用智能合约函数

:::code-group

```typescript [模版]
// 调用合约函数
async function callContract(
  senderKeypair: Ed25519Keypair,
  packageId: string,
  moduleName: string,
  functionName: string,
  args: any[]
) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::${moduleName}::${functionName}`,
    arguments: args.map(arg => {
      // 如果是对象 ID，使用 tx.object
      if (typeof arg === 'string' && arg.startsWith('0x')) {
        return tx.object(arg);
      }
      // 否则使用 tx.pure
      return tx.pure(arg);
    })
  });

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true
    }
  });

  return result;
}
```

```typescript [调用mint函数示范]
async function main() {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::my_token::mint`,
    arguments: [
      tx.object(TOKEN_OBJECT_ID),
      tx.pure.u64(1_000_000_000n), // 铸造 1000 个代币
      tx.pure.address(RECEIPT_ADDRESS),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showEvents: true, showObjectChanges: true },
  });

  console.log("交易摘要:", result.digest);
  console.log("状态:", result.effects?.status);
}
```

```move [move代码]
module hello_sui::my_token {
    // 伪代码
    public entry fun mint(
        cap: &mut TreasuryCap<MY_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let minted_coin = coin::mint(cap, amount, ctx);
        transfer::public_transfer(minted_coin, recipient);
    }
}
```

:::

`tx.pure(...)` 是 Sui TypeScript SDK（`@mysten/sui/transactions`）里最最最最最重要的一个函数，99% 的 Move 函数参数都要靠它来传。

> 把 JavaScript 中的普通值（number、string、bigint、boolean、数组、向量等）包装成 Move 虚拟机能理解的“纯数据”（pure value），让它可以作为 Move 函数的输入参数。

**官方推荐的 5 种常用写法:**

```typescript
tx.pure(123)                    // 自动推导为 u64（< 2³¹ 时）
tx.pure.u64(1000n)              // 强制 u64（推荐大数字都这么写）
tx.pure.address("0x123...")     // 地址专用（最常用）
tx.pure.string("Hello Sui")     // 字符串专用
tx.pure.bool(true)              // 布尔值
tx.pure.vector('u64', [1,2,3])  // 向量/数组
tx.pure([1, 2, 3])              // 自动推导为 vector<u64>
tx.pure.option(123)             // OptionSome(123)
tx.pure.option(null)            // OptionNone
```

如果调用合约函数需要传入范型类型，那就需要额外的 `typeArguments` 参数。

> 如果 Move 函数定义里有未被具体类型“钉死”的 `<T>`（即真正的泛型参数），调用时就必须传 `typeArguments`，否则一定报错 NUMBER_OF_TYPE_ARGUMENTS_MISMATCH。

```typescript
async function callContractWithTypeArgs(
  senderKeypair: Ed25519Keypair,
  packageId: string
) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::my_module::generic_function`,
    typeArguments: ['0x2::sui::SUI'],  // [!code ++]
    arguments: [
      tx.pure(100),
      tx.object('0x...')
    ]
  });

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### 链式调用

在同一笔交易里链式调用多个函数，前一个函数的返回值可以直接当后一个函数的参数用。

```typescript
async function chainedCalls(senderKeypair: Ed25519Keypair) {
  const tx = new Transaction();

  // 调用 1：创建对象
  const [obj] = tx.moveCall({
    target: '0xpackage::module::create_object',
    arguments: [tx.pure(100)]
  });

  // 调用 2：使用前一个调用的结果
  tx.moveCall({
    target: '0xpackage::module::update_object',
    arguments: [obj, tx.pure(200)]
  });

  // 调用 3：转移对象
  tx.transferObjects(
    [obj],
    tx.pure(senderKeypair.getPublicKey().toSuiAddress())
  );

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### 设置 Gas 预算和赞助

```typescript
// 设置 gas 预算
async function transferWithGasBudget(
  senderKeypair: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction();

  // 设置 gas 预算
  tx.setGasBudget(10000000);  // 0.01 SUI

  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
  tx.transferObjects([coin], tx.pure.address(recipient));

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}

// Gas 赞助（Sponsored Transaction）
async function sponsoredTransaction(
  senderKeypair: Ed25519Keypair,
  sponsorKeypair: Ed25519Keypair,
  recipient: string,
  amount: number
) {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
  tx.transferObjects([coin], tx.pure.address(recipient));

  // 设置 gas 支付者
  tx.setSender(senderKeypair.getPublicKey().toSuiAddress());
  tx.setGasOwner(sponsorKeypair.getPublicKey().toSuiAddress());

  // 发送者签名
  const senderSignature = await tx.sign({ client, signer: senderKeypair });

  // 赞助者签名
  const sponsorSignature = await tx.sign({ client, signer: sponsorKeypair });

  // 执行交易
  const result = await client.executeTransaction({
    transaction: senderSignature.bytes,
    signature: [senderSignature.signature, sponsorSignature.signature]
  });

  return result;
}
```

## 订阅事件

### 订阅新交易

```typescript
// 订阅所有交易
async function subscribeTransactions() {
  const unsubscribe = await client.subscribeTransaction({
    filter: {
      FromAddress: '0x...'
    },
    onMessage: (tx) => {
      console.log('新交易:', tx);
    }
  });

  // 取消订阅
  // unsubscribe();

  return unsubscribe;
}
```

### 订阅事件

```typescript
// 订阅特定包的事件
async function subscribeEvents(packageId: string) {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      Package: packageId
    },
    onMessage: (event) => {
      console.log('收到事件:');
      console.log('  类型:', event.type);
      console.log('  发送者:', event.sender);
      console.log('  数据:', event.parsedJson);
      console.log('  时间戳:', event.timestampMs);
    }
  });

  return unsubscribe;
}

// 订阅特定模块的事件
async function subscribeModuleEvents(packageId: string, moduleName: string) {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      MoveEventModule: {
        package: packageId,
        module: moduleName
      }
    },
    onMessage: (event) => {
      console.log('模块事件:', event);
    }
  });

  return unsubscribe;
}

// 订阅特定类型的事件
async function subscribeEventType(eventType: string) {
  const unsubscribe = await client.subscribeEvent({
    filter: {
      MoveEventType: eventType
    },
    onMessage: (event) => {
      console.log('类型事件:', event);
    }
  });

  return unsubscribe;
}
```

## BCS 编码和解码

### 什么是 BCS?

BCS (Binary Canonical Serialization) 是 Sui 用于序列化和反序列化数据的标准格式。

### 基础 BCS 操作

```typescript
import { bcs } from '@mysten/sui/bcs';

// 编码基础类型
const encodedU64 = bcs.u64().serialize(12345n).toBytes();
console.log('编码的 u64:', encodedU64);

// 解码
const decodedU64 = bcs.u64().parse(new Uint8Array(encodedU64));
console.log('解码的值:', decodedU64);

// 编码字符串
const encodedString = bcs.string().serialize('Hello Sui').toBytes();

// 编码向量
const encodedVector = bcs.vector(bcs.u64()).serialize([1n, 2n, 3n]).toBytes();
```

### 自定义结构体编码

```typescript
import { bcs } from '@mysten/sui/bcs';

// 定义结构体
const MyStruct = bcs.struct('MyStruct', {
  id: bcs.u64(),
  name: bcs.string(),
  active: bcs.bool(),
  items: bcs.vector(bcs.u64())
});

// 编码
const data = {
  id: 100n,
  name: 'Test',
  active: true,
  items: [1n, 2n, 3n]
};

const encoded = MyStruct.serialize(data).toBytes();
console.log('编码后:', encoded);

// 解码
const decoded = MyStruct.parse(new Uint8Array(encoded));
console.log('解码后:', decoded);
```

### 编码交易参数

```typescript
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';

async function callWithBcsArgs(senderKeypair: Ed25519Keypair) {
  const tx = new Transaction();

  // 对于复杂参数,使用 BCS 编码
  const complexArg = bcs.struct('MyArg', {
    amount: bcs.u64(),
    recipient: bcs.Address
  }).serialize({
    amount: 1000n,
    recipient: '0x...'
  }).toBytes();

  tx.moveCall({
    target: `${PACKAGE_ID}::module::function`,
    arguments: [
      tx.pure(complexArg)
    ]
  });

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### 解析链上数据

```typescript
import { bcs } from '@mysten/sui/bcs';

async function parseObjectData(objectId: string) {
  const object = await client.getObject({
    id: objectId,
    options: {
      showBcs: true,
      showContent: true
    }
  });

  // 如果对象有 BCS 数据
  if (object.data?.bcs) {
    const bcsData = object.data.bcs;

    // 定义对象的结构
    const ObjectStruct = bcs.struct('MyObject', {
      id: bcs.Address,
      value: bcs.u64(),
      // ... 其他字段
    });

    // 解析 BCS 数据
    const parsed = ObjectStruct.parse(
      new Uint8Array(Buffer.from(bcsData.bcsBytes, 'base64'))
    );

    console.log('解析的对象:', parsed);
  }
}
```

## 高级功能

### 批量操作

```typescript
// 批量转账
async function batchTransfer(
  senderKeypair: Ed25519Keypair,
  recipients: Array<{ address: string; amount: bigint }>
) {
  const tx = new Transaction();

  // 在一个交易中完成多个转账
  for (const { address, amount } of recipients) {
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
    tx.transferObjects([coin], tx.pure(address));
  }

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true
    }
  });

  console.log('批量转账完成:', result.digest);
  console.log('Gas 使用:', result.effects?.gasUsed);

  return result;
}

// 批量对象操作
async function batchObjectOperations(
  senderKeypair: Ed25519Keypair,
  objectIds: string[]
) {
  const tx = new Transaction();

  // 批量调用合约函数
  for (const objectId of objectIds) {
    tx.moveCall({
      target: `${PACKAGE_ID}::module::process`,
      arguments: [tx.object(objectId)]
    });
  }

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### Dry Run（模拟执行）

```typescript
// 模拟执行交易,不会真正发送到链上
async function dryRunTransaction(
  senderKeypair: Ed25519Keypair,
  recipient: string,
  amount: bigint
) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
  tx.transferObjects([coin], tx.pure(recipient));

  // 设置发送者
  tx.setSender(senderKeypair.getPublicKey().toSuiAddress());

  // 构建交易

  // Dry run
  const dryRunResult = await client.dryRunTransaction({
    transaction: tx
  });

  console.log('交易状态:', dryRunResult.effects.status);
  console.log('Gas 使用:', dryRunResult.effects.gasUsed);
  console.log('对象变更:', dryRunResult.objectChanges);
  console.log('余额变更:', dryRunResult.balanceChanges);

  return dryRunResult;
}
```

### 开发检查 (Dev Inspect)

```typescript
// 用于调试和测试,可以查看函数返回值
async function devInspect(sender: string) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::module::get_value`,
    arguments: [tx.object('0x...')]
  });

  const result = await client.devInspectTransaction({
    sender,
    transaction: tx
  });

  console.log('执行结果:', result.results);
  console.log('返回值:', result.results?.[0]?.returnValues);
  console.log('事件:', result.events);

  return result;
}
```

### 多签钱包

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { MultiSigPublicKey } from '@mysten/sui/multisig';

// 创建多签地址
function createMultiSig() {
  // 创建三个密钥对
  const keypair1 = new Ed25519Keypair();
  const keypair2 = new Ed25519Keypair();
  const keypair3 = new Ed25519Keypair();

  // 创建多签公钥 (2/3 签名)
  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 2,  // 需要 2 个签名
    publicKeys: [
      { publicKey: keypair1.getPublicKey(), weight: 1 },
      { publicKey: keypair2.getPublicKey(), weight: 1 },
      { publicKey: keypair3.getPublicKey(), weight: 1 }
    ]
  });

  const multiSigAddress = multiSigPublicKey.toSuiAddress();
  console.log('多签地址:', multiSigAddress);

  return { multiSigPublicKey, keypair1, keypair2, keypair3 };
}

// 多签交易
async function multiSigTransaction(
  multiSigPublicKey: MultiSigPublicKey,
  signers: Ed25519Keypair[],
  recipient: string,
  amount: bigint
) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
  tx.transferObjects([coin], tx.pure(recipient));

  // 设置多签地址为发送者
  tx.setSender(multiSigPublicKey.toSuiAddress());

  // 每个签名者签名
  const signatures = await Promise.all(
    signers.map(async (signer) => {
      const signature = await tx.sign({ client, signer });
      return signature;
    })
  );

  // 组合多签
  const multiSigSignature = multiSigPublicKey.combinePartialSignatures(
    signatures.map(s => s.signature)
  );

  // 执行交易
  const result = await client.executeTransaction({
    transaction: signatures[0].bytes,
    signature: multiSigSignature
  });

  return result;
}
```

### 可编程交易块高级用法

```typescript
// 链式调用和复杂逻辑
async function complexTransaction(senderKeypair: Ed25519Keypair) {
  const tx = new Transaction();

  // 1. 拆分代币
  const [coin1, coin2] = tx.splitCoins(tx.gas, [
    tx.pure(1000000000n),
    tx.pure(2000000000n)
  ]);

  // 2. 调用合约创建对象,并获取返回值
  const [newObject] = tx.moveCall({
    target: `${PACKAGE_ID}::factory::create`,
    arguments: [coin1]
  });

  // 3. 使用创建的对象调用另一个函数
  tx.moveCall({
    target: `${PACKAGE_ID}::module::process`,
    arguments: [newObject, coin2]
  });

  // 4. 条件性转移(通过合约逻辑)
  tx.moveCall({
    target: `${PACKAGE_ID}::module::conditional_transfer`,
    arguments: [
      newObject,
      tx.pure.address(recipient1),
      tx.pure.address(recipient2),
      tx.pure(true)  // 条件
    ]
  });

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true
    }
  });

  return result;
}
```

## 实用工具

### 地址格式化

```typescript
import { normalizeSuiAddress, isValidSuiAddress } from "@mysten/sui/utils";

// 规范化地址
const normalized = normalizeSuiAddress("0x2");
console.log(normalized); // '0x0000000000000000000000000000000000000000000000000000000000000002'

// 验证地址
const isValid = isValidSuiAddress(normalized);
console.log(isValid); // true

const isValid2 = isValidSuiAddress("0x2");
console.log(isValid2); // false
```

### 单位转换

```typescript
import { MIST_PER_SUI } from '@mysten/sui/utils';

// MIST 转 SUI (1 SUI = 10^9 MIST)
function mistToSui(mist: bigint): number {
  return Number(mist) / Number(MIST_PER_SUI);
}

// SUI 转 MIST
function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * Number(MIST_PER_SUI)));
}

console.log(MIST_PER_SUI);  // 1000000000n
console.log(mistToSui(1000000000n));  // 1
console.log(suiToMist(1));  // 1000000000n
```

### 获取 Gas 币

```typescript
// 获取用于支付 gas 的币
async function getGasCoins(address: string) {
  const coins = await client.getCoins({
    owner: address,
    coinType: '0x2::sui::SUI'
  });

  return coins.data;
}

// 选择合适的 gas 币
async function selectGasCoin(address: string, requiredAmount: bigint) {
  const coins = await getGasCoins(address);

  for (const coin of coins) {
    if (BigInt(coin.balance) >= requiredAmount) {
      return coin.coinObjectId;
    }
  }

  throw new Error('没有足够余额的 gas 币');
}

// 获取最优 gas 币（余额最接近所需金额）
async function selectOptimalGasCoin(address: string, requiredAmount: bigint) {
  const coins = await getGasCoins(address);

  const suitableCoins = coins
    .filter(coin => BigInt(coin.balance) >= requiredAmount)
    .sort((a, b) => {
      const diffA = BigInt(a.balance) - requiredAmount;
      const diffB = BigInt(b.balance) - requiredAmount;
      return Number(diffA - diffB);
    });

  if (suitableCoins.length === 0) {
    throw new Error('没有足够余额的 gas 币');
  }

  return suitableCoins[0].coinObjectId;
}
```

### 代币操作工具

```typescript
// 获取特定代币的所有币对象
async function getAllCoins(address: string, coinType: string) {
  let hasNextPage = true;
  let cursor: string | null | undefined = null;
  const allCoins = [];

  while (hasNextPage) {
    const response = await client.getCoins({
      owner: address,
      coinType,
      cursor
    });

    allCoins.push(...response.data);
    hasNextPage = response.hasNextPage;
    cursor = response.nextCursor;
  }

  return allCoins;
}

// 获取地址的所有代币类型
async function getAllCoinTypes(address: string) {
  const balances = await client.getAllBalances({ owner: address });
  return balances.map(b => b.coinType);
}

// 计算需要合并的币对象
async function getCoinsToMerge(
  address: string,
  coinType: string,
  targetAmount: bigint
) {
  const coins = await getAllCoins(address, coinType);

  let accumulated = 0n;
  const coinsNeeded = [];

  for (const coin of coins) {
    coinsNeeded.push(coin);
    accumulated += BigInt(coin.balance);

    if (accumulated >= targetAmount) {
      break;
    }
  }

  if (accumulated < targetAmount) {
    throw new Error(`余额不足: 需要 ${targetAmount}, 可用 ${accumulated}`);
  }

  return coinsNeeded;
}
```

### 交易状态检查

```typescript
// 等待交易确认
async function waitForTransaction(
  digest: string,
  timeoutMs: number = 30000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const tx = await client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true
        }
      });

      if (tx.effects?.status) {
        return tx;
      }
    } catch (error) {
      // 交易可能还未上链,继续等待
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`交易确认超时: ${digest}`);
}

// 检查交易是否成功
function isTransactionSuccessful(tx: any): boolean {
  return tx.effects?.status?.status === 'success';
}

// 从交易中提取创建的对象
function getCreatedObjects(tx: any): string[] {
  if (!tx.objectChanges) return [];

  return tx.objectChanges
    .filter((change: any) => change.type === 'created')
    .map((change: any) => change.objectId);
}

// 从交易中提取删除的对象
function getDeletedObjects(tx: any): string[] {
  if (!tx.objectChanges) return [];

  return tx.objectChanges
    .filter((change: any) => change.type === 'deleted')
    .map((change: any) => change.objectId);
}
```

### 性能优化工具

```typescript
// 批量查询多个地址的余额
async function batchGetBalances(addresses: string[]) {
  const promises = addresses.map(addr =>
    client.getBalance({ owner: addr })
  );

  const results = await Promise.all(promises);

  return addresses.reduce((acc, addr, index) => {
    acc[addr] = results[index];
    return acc;
  }, {} as Record<string, any>);
}

// 缓存装饰器
function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttl: number = 60000  // 默认缓存 60 秒
): T {
  const cache = new Map<string, { value: any; expiry: number }>();

  return (async (...args: any[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const value = await fn(...args);
    cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });

    return value;
  }) as T;
}

// 使用缓存
const cachedGetObject = memoize(
  async (objectId: string) => {
    return await client.getObject({ id: objectId });
  },
  30000  // 缓存 30 秒
);
```

### 错误处理工具

```typescript
// 自定义错误类型
class SuiTransactionError extends Error {
  constructor(
    message: string,
    public digest?: string,
    public effects?: any
  ) {
    super(message);
    this.name = 'SuiTransactionError';
  }
}

class InsufficientBalanceError extends Error {
  constructor(
    public required: bigint,
    public available: bigint
  ) {
    super(`余额不足: 需要 ${required}, 可用 ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}

// 安全执行交易
async function safeExecuteTransaction(
  senderKeypair: Ed25519Keypair,
  tx: Transaction
) {
  try {
    // 1. 检查余额
    const address = senderKeypair.getPublicKey().toSuiAddress();
    const balance = await client.getBalance({ owner: address });

    if (BigInt(balance.totalBalance) < 10_000_000n) {
      throw new InsufficientBalanceError(10_000_000n, BigInt(balance.totalBalance));
    }

    // 2. Dry run 检查
    tx.setSender(address);
    const txBytes = await tx.build({ client });
    const dryRun = await client.dryRunTransaction({
      transaction: txBytes
    });

    if (dryRun.effects.status.status !== 'success') {
      throw new SuiTransactionError(
        `Dry run 失败: ${dryRun.effects.status.error}`,
        undefined,
        dryRun.effects
      );
    }

    // 3. 执行交易
    const result = await client.signAndExecuteTransaction({
      signer: senderKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    // 4. 检查结果
    if (!isTransactionSuccessful(result)) {
      throw new SuiTransactionError(
        '交易失败',
        result.digest,
        result.effects
      );
    }

    return result;
  } catch (error) {
    if (error instanceof SuiTransactionError || error instanceof InsufficientBalanceError) {
      throw error;
    }

    throw new Error(`交易执行错误: ${error}`);
  }
}
```

## 完整示例

### NFT 管理系统

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// NFT 管理类
class NFTManager {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private packageId: string;

  constructor(network: 'devnet' | 'testnet' | 'mainnet', keypair: Ed25519Keypair, packageId: string) {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.keypair = keypair;
    this.packageId = packageId;
  }

  // Mint NFT
  async mintNFT(name: string, description: string, imageUrl: string) {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::nft::mint`,
      arguments: [
        tx.pure(name),
        tx.pure(description),
        tx.pure(imageUrl)
      ]
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true
      }
    });

    // 提取创建的 NFT ID
    const createdObjects = result.objectChanges?.filter(
      (obj: any) => obj.type === 'created'
    );

    if (createdObjects && createdObjects.length > 0) {
      const nftId = (createdObjects[0] as any).objectId;
      console.log('✅ NFT 已创建:', nftId);
      return nftId;
    }

    throw new Error('NFT 创建失败');
  }

  // 转移 NFT
  async transferNFT(nftId: string, recipient: string) {
    const tx = new Transaction();

    tx.transferObjects([tx.object(nftId)], tx.pure.address(recipient));

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });

    console.log('✅ NFT 已转移:', result.digest);
    return result;
  }

  // 批量 Mint NFT
  async batchMintNFTs(nfts: Array<{ name: string; description: string; imageUrl: string }>) {
    const tx = new Transaction();

    for (const nft of nfts) {
      tx.moveCall({
        target: `${this.packageId}::nft::mint`,
        arguments: [
          tx.pure(nft.name),
          tx.pure(nft.description),
          tx.pure(nft.imageUrl)
        ]
      });
    }

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    const created = getCreatedObjects(result);
    console.log(`✅ 批量创建 ${created.length} 个 NFT`);

    return created;
  }

  // 查询用户的所有 NFT
  async getUserNFTs(address: string) {
    const objects = await this.client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${this.packageId}::nft::NFT`
      },
      options: {
        showContent: true,
        showDisplay: true,
        showType: true
      }
    });

    return objects.data;
  }

  // 查询 NFT 详情
  async getNFTDetails(nftId: string) {
    const object = await this.client.getObject({
      id: nftId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true,
        showPreviousTransaction: true
      }
    });

    return object;
  }

  // 燃烧 NFT
  async burnNFT(nftId: string) {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::nft::burn`,
      arguments: [tx.object(nftId)]
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });

    console.log('✅ NFT 已燃烧:', result.digest);
    return result;
  }

  // 更新 NFT 元数据
  async updateNFTMetadata(nftId: string, newName: string, newDescription: string) {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::nft::update_metadata`,
      arguments: [
        tx.object(nftId),
        tx.pure(newName),
        tx.pure(newDescription)
      ]
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    console.log('✅ NFT 元数据已更新:', result.digest);
    return result;
  }

  // 监听 NFT 相关事件
  async subscribeNFTEvents(onEvent: (event: any) => void) {
    const unsubscribe = await this.client.subscribeEvent({
      filter: {
        Package: this.packageId
      },
      onMessage: (event) => {
        console.log('📡 收到 NFT 事件:', event.type);
        onEvent(event);
      }
    });

    return unsubscribe;
  }
}

// 使用示例
async function exampleUsage() {
  // 初始化 NFT 管理器
  const keypair = new Ed25519Keypair();
  const packageId = '0x...';
  const nftManager = new NFTManager('devnet', keypair, packageId);

  try {
    // 1. Mint NFT
    const nftId = await nftManager.mintNFT(
      'My First NFT',
      'This is my first NFT on Sui',
      'https://example.com/image.png'
    );

    // 2. 查询 NFT 详情
    const nftDetails = await nftManager.getNFTDetails(nftId);
    console.log('NFT 详情:', nftDetails);

    // 3. 查询用户所有 NFT
    const userNFTs = await nftManager.getUserNFTs(
      keypair.getPublicKey().toSuiAddress()
    );
    console.log(`用户拥有 ${userNFTs.length} 个 NFT`);

    // 4. 转移 NFT
    await nftManager.transferNFT(nftId, '0x...');

    // 5. 批量 Mint
    const nftIds = await nftManager.batchMintNFTs([
      { name: 'NFT #1', description: 'First', imageUrl: 'https://...' },
      { name: 'NFT #2', description: 'Second', imageUrl: 'https://...' },
      { name: 'NFT #3', description: 'Third', imageUrl: 'https://...' }
    ]);

    console.log('批量创建的 NFT IDs:', nftIds);

    // 6. 订阅事件
    const unsubscribe = await nftManager.subscribeNFTEvents((event) => {
      console.log('NFT 事件:', event);
    });

    // 稍后取消订阅
    // unsubscribe();

  } catch (error) {
    console.error('错误:', error);
  }
}
```

### DeFi 交互示例

```typescript
// 添加流动性
async function addLiquidity(
  poolId: string,
  coinAId: string,
  coinBId: string,
  amountA: number,
  amountB: number
) {
  const tx = new Transaction();

  // 拆分代币
  const [coinA] = tx.splitCoins(tx.object(coinAId), [tx.pure(amountA)]);
  const [coinB] = tx.splitCoins(tx.object(coinBId), [tx.pure(amountB)]);

  // 调用添加流动性函数
  tx.moveCall({
    target: `${PACKAGE_ID}::pool::add_liquidity`,
    arguments: [
      tx.object(poolId),
      coinA,
      coinB
    ]
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx
  });

  return result;
}

// 交换代币
async function swap(
  poolId: string,
  coinInId: string,
  amountIn: number,
  minAmountOut: number
) {
  const tx = new Transaction();

  const [coinIn] = tx.splitCoins(tx.object(coinInId), [tx.pure(amountIn)]);

  tx.moveCall({
    target: `${PACKAGE_ID}::pool::swap`,
    typeArguments: ['0x2::sui::SUI', '0x...::usdc::USDC'],
    arguments: [
      tx.object(poolId),
      coinIn,
      tx.pure(minAmountOut)
    ]
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx
  });

  return result;
}
```

## 最佳实践

### 错误处理

```typescript
async function safeTransaction(senderKeypair: Ed25519Keypair) {
  try {
    const tx = new Transaction();
    // ... 构建交易

    const result = await client.signAndExecuteTransaction({
      signer: senderKeypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });

    // 检查交易状态
    if (result.effects?.status?.status !== 'success') {
      console.error('交易失败:', result.effects?.status);
      return null;
    }

    return result;
  } catch (error) {
    console.error('交易错误:', error);
    throw error;
  }
}
```

### Gas 优化

```typescript
// 批量操作减少 gas
async function batchTransfer(
  senderKeypair: Ed25519Keypair,
  recipients: Array<{ address: string; amount: number }>
) {
  const tx = new Transaction();

  // 一次交易中完成多个转账
  for (const { address, amount } of recipients) {
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
    tx.transferObjects([coin], tx.pure.address(address));
  }

  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx
  });

  return result;
}
```

### 重试机制

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      console.log(`重试 ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error('超过最大重试次数');
}

// 使用
const result = await executeWithRetry(async () => {
  return await client.getObject({ id: objectId });
});
```

### 环境配置

```typescript
// config.ts
export const config = {
  network: process.env.SUI_NETWORK || 'devnet',
  privateKey: process.env.PRIVATE_KEY || '',
  packageId: process.env.PACKAGE_ID || ''
};

// 使用配置
import { config } from './config';
import { getFullnodeUrl } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({
  url: getFullnodeUrl(config.network as 'devnet' | 'testnet' | 'mainnet')
});

const decodedKey = decodeSuiPrivateKey(config.privateKey);
const keypair = Ed25519Keypair.fromSecretKey(decodedKey.secretKey);
```

## 常见问题

### Q1: 如何获取测试币？

**A:** 在 devnet 或 testnet 上，可以使用水龙头：

```typescript
// 方式 1：使用 CLI
// sui client faucet

// 方式 2：访问 Web 水龙头
// https://faucet.sui.io/

// 方式 3：使用 SDK 请求
async function requestFromFaucet(address: string) {
  const response = await fetch('https://faucet.devnet.sui.io/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      FixedAmountRequest: {
        recipient: address
      }
    })
  });

  if (!response.ok) {
    throw new Error(`水龙头请求失败: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ 测试币已发送:', data);
  return data;
}
```

### Q2: 交易失败如何调试？

**A:** 系统化的调试方法：

```typescript
async function debugTransaction(
  senderKeypair: Ed25519Keypair,
  tx: Transaction
) {
  const address = senderKeypair.getPublicKey().toSuiAddress();

  // 1. 检查余额
  const balance = await client.getBalance({ owner: address });
  console.log('💰 当前余额:', balance.totalBalance);

  // 2. 执行 Dry Run
  tx.setSender(address);
  const txBytes = await tx.build({ client });

  const dryRun = await client.dryRunTransaction({
    transaction: txBytes
  });

  console.log('🔍 Dry Run 结果:');
  console.log('  状态:', dryRun.effects.status);
  console.log('  Gas 使用:', dryRun.effects.gasUsed);

  if (dryRun.effects.status.status !== 'success') {
    console.error('❌ Dry Run 失败:', dryRun.effects.status.error);
    return;
  }

  // 3. 执行真实交易
  const result = await client.signAndExecuteTransaction({
    signer: senderKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true
    }
  });

  // 4. 详细输出结果
  console.log('📝 交易结果:');
  console.log('  Digest:', result.digest);
  console.log('  状态:', result.effects?.status);
  console.log('  Gas 使用:', result.effects?.gasUsed);
  console.log('  对象变更:', result.objectChanges);
  console.log('  余额变更:', result.balanceChanges);
  console.log('  事件:', result.events);

  return result;
}
```

### Q3: 如何处理大数值？

**A:** 使用 BigInt 和正确的转换：

```typescript
// ❌ 错误：使用 number 会导致精度丢失
const wrongAmount = 1000000000000000000;
console.log(wrongAmount);  // 1e+18

// ✅ 正确：使用 BigInt
const correctAmount = BigInt('1000000000000000000');
console.log(correctAmount.toString());  // 1000000000000000000

// 单位转换
import { MIST_PER_SUI } from '@mysten/sui/utils';

function mistToSui(mist: bigint): string {
  return (Number(mist) / Number(MIST_PER_SUI)).toFixed(9);
}

function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * Number(MIST_PER_SUI)));
}

// 使用示例
const balance = BigInt('5000000000');  // 5 SUI in MIST
console.log(`余额: ${mistToSui(balance)} SUI`);

const sendAmount = suiToMist(1.5);  // 1.5 SUI
console.log(`发送: ${sendAmount} MIST`);
```

### Q4: 如何监听特定地址的交易？

**A:** 多种监听方式：

```typescript
// 方式 1：WebSocket 订阅（推荐）
async function subscribeAddress(address: string) {
  const unsubscribe = await client.subscribeTransaction({
    filter: {
      FromAddress: address
    },
    onMessage: (tx) => {
      console.log('📨 新交易:', {
        digest: tx.digest,
        sender: tx.transaction?.data?.sender,
        timestamp: new Date(Number(tx.timestampMs))
      });
    }
  });

  console.log('✅ 开始监听地址:', address);
  return unsubscribe;
}

// 方式 2：轮询（备用方案）
class TransactionPoller {
  private lastDigest: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  async start(address: string, callback: (tx: any) => void, intervalMs = 5000) {
    this.intervalId = setInterval(async () => {
      try {
        const txs = await client.queryTransactionBlocks({
          filter: { FromAddress: address },
          limit: 1,
          order: 'descending'
        });

        if (txs.data.length > 0) {
          const latestTx = txs.data[0];

          if (this.lastDigest !== latestTx.digest) {
            this.lastDigest = latestTx.digest;
            callback(latestTx);
          }
        }
      } catch (error) {
        console.error('轮询错误:', error);
      }
    }, intervalMs);

    console.log('✅ 开始轮询地址:', address);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  停止轮询');
    }
  }
}

// 使用
const poller = new TransactionPoller();
await poller.start(address, (tx) => {
  console.log('新交易:', tx);
});

// 稍后停止
// poller.stop();
```

### Q5: 如何估算 Gas 费用？

**A:** 使用 Dry Run 准确估算：

```typescript
async function estimateGasCost(
  sender: string,
  tx: Transaction
): Promise<{
  computationCost: string;
  storageCost: string;
  storageRebate: string;
  totalCost: string;
}> {
  // 设置发送者并构建交易
  tx.setSender(sender);
  const txBytes = await tx.build({ client });

  // Dry run
  const dryRun = await client.dryRunTransaction({
    transaction: txBytes
  });

  if (dryRun.effects.status.status !== 'success') {
    throw new Error(`估算失败: ${dryRun.effects.status.error}`);
  }

  const gasUsed = dryRun.effects.gasUsed;

  return {
    computationCost: gasUsed.computationCost,
    storageCost: gasUsed.storageCost,
    storageRebate: gasUsed.storageRebate,
    totalCost: (
      BigInt(gasUsed.computationCost) +
      BigInt(gasUsed.storageCost) -
      BigInt(gasUsed.storageRebate)
    ).toString()
  };
}

// 使用示例
const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [tx.pure(1000000000n)]);
tx.transferObjects([coin], tx.pure(recipientAddress));

const gasCost = await estimateGasCost(senderAddress, tx);
console.log('Gas 预估:');
console.log('  计算成本:', mistToSui(BigInt(gasCost.computationCost)), 'SUI');
console.log('  存储成本:', mistToSui(BigInt(gasCost.storageCost)), 'SUI');
console.log('  存储退款:', mistToSui(BigInt(gasCost.storageRebate)), 'SUI');
console.log('  总成本:', mistToSui(BigInt(gasCost.totalCost)), 'SUI');
```

### Q6: 如何处理交易签名和多签？

**A:** 完整的签名流程：

```typescript
// 单签名
async function singleSignature(
  keypair: Ed25519Keypair,
  tx: Transaction
) {
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx
  });

  return result;
}

// 分离签名和执行
async function separateSignAndExecute(
  keypair: Ed25519Keypair,
  tx: Transaction
) {
  // 1. 签名
  const signedTx = await tx.sign({
    client,
    signer: keypair
  });

  // 2. 执行
  const result = await client.executeTransaction({
    transaction: signedTx.bytes,
    signature: signedTx.signature,
    options: {
      showEffects: true
    }
  });

  return result;
}

// 多签示例
import { MultiSigPublicKey } from '@mysten/sui/multisig';

async function multiSignatureExample() {
  // 创建 3 个密钥对
  const keypair1 = new Ed25519Keypair();
  const keypair2 = new Ed25519Keypair();
  const keypair3 = new Ed25519Keypair();

  // 创建 2/3 多签
  const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 2,
    publicKeys: [
      { publicKey: keypair1.getPublicKey(), weight: 1 },
      { publicKey: keypair2.getPublicKey(), weight: 1 },
      { publicKey: keypair3.getPublicKey(), weight: 1 }
    ]
  });

  const multiSigAddress = multiSigPublicKey.toSuiAddress();
  console.log('多签地址:', multiSigAddress);

  // 构建交易
  const tx = new Transaction();
  tx.setSender(multiSigAddress);
  // ... 添加交易操作

  // 获取 2 个签名
  const sig1 = await tx.sign({ client, signer: keypair1 });
  const sig2 = await tx.sign({ client, signer: keypair2 });

  // 组合多签
  const multiSig = multiSigPublicKey.combinePartialSignatures([
    sig1.signature,
    sig2.signature
  ]);

  // 执行交易
  const result = await client.executeTransaction({
    transaction: sig1.bytes,
    signature: multiSig
  });

  return result;
}
```

### Q7: 如何优化查询性能？

**A:** 多种优化策略：

```typescript
// 1. 批量查询
async function batchQuery(objectIds: string[]) {
  // ❌ 慢：逐个查询
  const resultsSerial = [];
  for (const id of objectIds) {
    const obj = await client.getObject({ id });
    resultsSerial.push(obj);
  }

  // ✅ 快：批量查询
  const resultsBatch = await client.multiGetObjects({
    ids: objectIds,
    options: { showContent: true }
  });

  return resultsBatch;
}

// 2. 并发查询
async function parallelQuery(addresses: string[]) {
  const promises = addresses.map(addr =>
    client.getBalance({ owner: addr })
  );

  const results = await Promise.all(promises);
  return results;
}

// 3. 使用缓存
class CachedSuiClient {
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 60000;  // 60 秒

  async getObject(id: string) {
    const cached = this.cache.get(id);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await client.getObject({ id });
    this.cache.set(id, {
      data,
      expiry: Date.now() + this.ttl
    });

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}

// 4. 分页优化
async function efficientPagination(owner: string) {
  const pageSize = 50;  // 适中的页面大小
  let cursor: string | null | undefined = null;
  const allObjects = [];

  do {
    const response = await client.getOwnedObjects({
      owner,
      cursor,
      limit: pageSize,
      options: { showType: true }  // 只请求需要的字段
    });

    allObjects.push(...response.data);
    cursor = response.nextCursor;

    // 可选：限制总数
    if (allObjects.length >= 1000) {
      break;
    }
  } while (cursor);

  return allObjects;
}
```

### Q8: 如何处理网络错误和重试？

**A:** 实现健壮的错误处理：

```typescript
// 通用重试函数
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      console.log(`❌ 尝试 ${attempt + 1}/${maxRetries + 1} 失败:`, error);
      console.log(`⏳ ${delay}ms 后重试...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw new Error(`操作失败，已重试 ${maxRetries} 次: ${lastError.message}`);
}

// 使用示例
const result = await retryWithBackoff(
  async () => {
    return await client.getObject({ id: objectId });
  },
  {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000
  }
);

// 网络错误分类处理
async function safeRequest<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // RPC 错误
    if (error.code) {
      switch (error.code) {
        case -32600:
          throw new Error('无效的请求格式');
        case -32601:
          throw new Error('方法不存在');
        case -32602:
          throw new Error('无效的参数');
        case -32603:
          throw new Error('内部错误');
        default:
          throw new Error(`RPC 错误 (${error.code}): ${error.message}`);
      }
    }

    // 网络错误
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      throw new Error('网络连接失败，请检查网络');
    }

    // 其他错误
    throw error;
  }
}
```

## 参考资源

- [Sui TypeScript SDK 官方文档](https://sdk.mystenlabs.com/typescript)
- [API 参考](https://sui-typescript-docs.vercel.app/)
- [GitHub 仓库](https://github.com/MystenLabs/sui/tree/main/sdk/typescript)
- [示例代码](https://github.com/MystenLabs/sui/tree/main/sdk/typescript/test/e2e)

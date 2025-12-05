# BCS 编码

> Binary Canonical Serialization - Sui 的数据序列化标准

> [!IMPORTANT] 本节重点
> 1. 什么是 BCS？为什么需要它？
> 2. 如何编码和解码基础类型？
> 3. 如何处理复杂数据结构？
> 4. 如何在交易中使用 BCS？
> 5. 常见错误和解决方案

## 什么是 BCS？

**BCS (Binary Canonical Serialization)** 是一种确定性的二进制序列化格式，专为区块链设计。Sui 使用 BCS 来：

- 📦 **序列化交易数据**: 将交易转换为字节
- 🔐 **签名验证**: 确保数据完整性
- 💾 **存储优化**: 高效的二进制格式
- 🔄 **跨语言兼容**: 统一的序列化标准

### BCS 特点

- ✅ **确定性**: 相同输入总是产生相同输出
- ✅ **紧凑**: 二进制格式，空间效率高
- ✅ **类型安全**: 强类型系统
- ✅ **可扩展**: 支持复杂数据结构

## 安装

```bash
npm install @mysten/bcs
```

BCS 也包含在 `@mysten/sui.js` 中：

```typescript
import { bcs } from '@mysten/sui.js/bcs';
```

## 基础类型编码

### 整数类型

```typescript
import { bcs } from '@mysten/bcs';

// u8 (0-255)
const u8Bytes = bcs.u8().serialize(42).toBytes();
console.log('u8:', u8Bytes); // Uint8Array [42]

const u8Value = bcs.u8().parse(new Uint8Array([42]));
console.log('解码 u8:', u8Value); // 42

// u16, u32, u64, u128, u256
const u64Bytes = bcs.u64().serialize(12345n).toBytes();
const u64Value = bcs.u64().parse(u64Bytes);
console.log('u64:', u64Value); // 12345n

// 有符号整数 (i8, i16, i32, i64, i128)
const i64Bytes = bcs.i64().serialize(-12345n).toBytes();
const i64Value = bcs.i64().parse(i64Bytes);
console.log('i64:', i64Value); // -12345n
```

### 布尔类型

```typescript
// bool
const trueByte = bcs.bool().serialize(true).toBytes();
console.log('true:', trueByte); // Uint8Array [1]

const falseByte = bcs.bool().serialize(false).toBytes();
console.log('false:', falseByte); // Uint8Array [0]
```

### 字符串

```typescript
// string (UTF-8 编码)
const strBytes = bcs.string().serialize('Hello, Sui!').toBytes();
const strValue = bcs.string().parse(strBytes);
console.log('字符串:', strValue); // "Hello, Sui!"

// 中文支持
const chineseBytes = bcs.string().serialize('你好，Sui！').toBytes();
const chineseValue = bcs.string().parse(chineseBytes);
console.log('中文:', chineseValue); // "你好，Sui！"
```

### 地址类型

```typescript
// address (32 字节)
const address = '0x0000000000000000000000000000000000000000000000000000000000000001';

const addrBytes = bcs.Address.serialize(address).toBytes();
const addrValue = bcs.Address.parse(addrBytes);
console.log('地址:', addrValue);
```

### 向量/数组

```typescript
// vector<u64>
const vecBytes = bcs
  .vector(bcs.u64())
  .serialize([1n, 2n, 3n, 4n, 5n])
  .toBytes();

const vecValue = bcs.vector(bcs.u64()).parse(vecBytes);
console.log('向量:', vecValue); // [1n, 2n, 3n, 4n, 5n]

// vector<string>
const strVecBytes = bcs
  .vector(bcs.string())
  .serialize(['hello', 'world'])
  .toBytes();

// 嵌套向量 vector<vector<u8>>
const nestedVec = bcs
  .vector(bcs.vector(bcs.u8()))
  .serialize([
    [1, 2, 3],
    [4, 5, 6],
  ])
  .toBytes();
```

### Option 类型

```typescript
// option<u64>
const someBytes = bcs.option(bcs.u64()).serialize(100n).toBytes();
const someValue = bcs.option(bcs.u64()).parse(someBytes);
console.log('Some:', someValue); // 100n

const noneBytes = bcs.option(bcs.u64()).serialize(null).toBytes();
const noneValue = bcs.option(bcs.u64()).parse(noneBytes);
console.log('None:', noneValue); // null
```

## 复杂数据结构

### 结构体（Struct）

```typescript
// 定义结构体
const Person = bcs.struct('Person', {
  name: bcs.string(),
  age: bcs.u8(),
  address: bcs.Address,
  is_active: bcs.bool(),
});

// 编码
const personData = {
  name: 'Alice',
  age: 30,
  address: '0x1',
  is_active: true,
};

const personBytes = Person.serialize(personData).toBytes();
console.log('Person 字节:', personBytes);

// 解码
const personValue = Person.parse(personBytes);
console.log('Person:', personValue);
```

### 嵌套结构体

```typescript
// 定义嵌套结构体
const Address = bcs.struct('Address', {
  street: bcs.string(),
  city: bcs.string(),
  zip: bcs.u32(),
});

const User = bcs.struct('User', {
  id: bcs.u64(),
  name: bcs.string(),
  address: Address,
  tags: bcs.vector(bcs.string()),
});

// 编码
const userData = {
  id: 1n,
  name: 'Bob',
  address: {
    street: '123 Main St',
    city: 'New York',
    zip: 10001,
  },
  tags: ['developer', 'blockchain'],
};

const userBytes = User.serialize(userData).toBytes();
const userValue = User.parse(userBytes);
console.log('User:', userValue);
```

### 枚举（Enum）

```typescript
// 定义枚举
const Color = bcs.enum('Color', {
  Red: null,
  Green: null,
  Blue: null,
  RGB: bcs.struct('RGB', {
    r: bcs.u8(),
    g: bcs.u8(),
    b: bcs.u8(),
  }),
});

// 简单枚举值
const redBytes = Color.serialize({ Red: null }).toBytes();
const redValue = Color.parse(redBytes);
console.log('颜色:', redValue); // { Red: null }

// 带数据的枚举值
const rgbBytes = Color.serialize({
  RGB: { r: 255, g: 128, b: 0 },
}).toBytes();

const rgbValue = Color.parse(rgbBytes);
console.log('RGB:', rgbValue); // { RGB: { r: 255, g: 128, b: 0 } }
```

### 泛型类型

```typescript
// 定义泛型容器
function Box<T>(innerType: any) {
  return bcs.struct('Box', {
    value: innerType,
  });
}

// 使用泛型
const NumberBox = Box(bcs.u64());
const numberBoxBytes = NumberBox.serialize({ value: 42n }).toBytes();

const StringBox = Box(bcs.string());
const stringBoxBytes = StringBox.serialize({ value: 'hello' }).toBytes();

// 泛型向量
function Wrapper<T>(innerType: any) {
  return bcs.struct('Wrapper', {
    items: bcs.vector(innerType),
    count: bcs.u32(),
  });
}

const NumberWrapper = Wrapper(bcs.u64());
const wrapperData = {
  items: [1n, 2n, 3n],
  count: 3,
};

const wrapperBytes = NumberWrapper.serialize(wrapperData).toBytes();
```

## 在交易中使用 BCS

### 编码交易参数

```typescript
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/sui.js/bcs';

// 定义复杂参数类型
const NFTMetadata = bcs.struct('NFTMetadata', {
  name: bcs.string(),
  description: bcs.string(),
  image_url: bcs.string(),
  attributes: bcs.vector(
    bcs.struct('Attribute', {
      key: bcs.string(),
      value: bcs.string(),
    })
  ),
});

// 准备数据
const metadata = {
  name: 'My NFT',
  description: 'A unique digital asset',
  image_url: 'https://example.com/nft.png',
  attributes: [
    { key: 'rarity', value: 'legendary' },
    { key: 'power', value: '9000' },
  ],
};

// 编码为 BCS
const metadataBytes = NFTMetadata.serialize(metadata).toBytes();

// 在交易中使用
const tx = new TransactionBlock();
tx.moveCall({
  target: '0xpackage::nft::mint_with_metadata',
  arguments: [
    tx.pure(metadataBytes), // 直接传递 BCS 编码的数据
  ],
});
```

### 解码交易返回值

```typescript
// 假设合约返回 BCS 编码的数据
async function decodeTransactionResult(txBytes: Uint8Array) {
  const Result = bcs.struct('MintResult', {
    nft_id: bcs.Address,
    owner: bcs.Address,
    timestamp: bcs.u64(),
  });

  const result = Result.parse(txBytes);
  console.log('NFT ID:', result.nft_id);
  console.log('所有者:', result.owner);
  console.log('时间戳:', result.timestamp);

  return result;
}
```

### 编码动态字段

```typescript
// 动态字段的键值对
const DynamicFieldKey = bcs.struct('Key', {
  id: bcs.u64(),
  category: bcs.string(),
});

const DynamicFieldValue = bcs.struct('Value', {
  data: bcs.string(),
  timestamp: bcs.u64(),
});

// 编码键
const keyBytes = DynamicFieldKey.serialize({
  id: 1n,
  category: 'metadata',
}).toBytes();

// 编码值
const valueBytes = DynamicFieldValue.serialize({
  data: 'some data',
  timestamp: BigInt(Date.now()),
}).toBytes();

// 在交易中添加动态字段
tx.moveCall({
  target: '0x2::dynamic_field::add',
  typeArguments: ['KeyType', 'ValueType'],
  arguments: [
    tx.object(parentObjectId),
    tx.pure(keyBytes),
    tx.pure(valueBytes),
  ],
});
```

## 链上数据解析

### 解析对象内容

```typescript
import { SuiClient } from '@mysten/sui.js/client';

// 定义对象结构
const GameAsset = bcs.struct('GameAsset', {
  id: bcs.Address,
  owner: bcs.Address,
  level: bcs.u16(),
  experience: bcs.u64(),
  attributes: bcs.vector(bcs.u32()),
});

async function parseGameAsset(client: SuiClient, objectId: string) {
  // 获取对象
  const object = await client.getObject({
    id: objectId,
    options: {
      showBcs: true,
      showContent: true,
    },
  });

  if (object.data?.bcs) {
    // 解析 BCS 数据
    const bcsBytes = Buffer.from(object.data.bcs.bcsBytes, 'base64');
    const asset = GameAsset.parse(new Uint8Array(bcsBytes));

    console.log('游戏资产:', asset);
    return asset;
  }
}
```

### 解析事件数据

```typescript
// 定义事件结构
const NFTMintedEvent = bcs.struct('NFTMintedEvent', {
  nft_id: bcs.Address,
  minter: bcs.Address,
  name: bcs.string(),
  timestamp: bcs.u64(),
});

async function parseNFTMintedEvents(
  client: SuiClient,
  packageId: string
) {
  const events = await client.queryEvents({
    query: {
      MoveEventType: `${packageId}::nft::NFTMinted`,
    },
  });

  for (const event of events.data) {
    // 解析 BCS 编码的事件数据
    if (event.bcs) {
      const bcsBytes = Buffer.from(event.bcs, 'base64');
      const eventData = NFTMintedEvent.parse(new Uint8Array(bcsBytes));

      console.log('NFT 铸造事件:', eventData);
    }
  }
}
```

## 自定义序列化器

### 创建自定义类型

```typescript
// 自定义序列化器
const CustomDate = {
  name: 'CustomDate',
  serialize(value: Date, writer: any) {
    // 将 Date 序列化为 u64 时间戳
    return bcs.u64().serialize(BigInt(value.getTime()), writer);
  },
  parse(reader: any): Date {
    const timestamp = bcs.u64().parse(reader);
    return new Date(Number(timestamp));
  },
};

// 使用自定义类型
const Event = bcs.struct('Event', {
  name: bcs.string(),
  date: CustomDate,
  participants: bcs.vector(bcs.string()),
});

const eventData = {
  name: 'Sui Hackathon',
  date: new Date(),
  participants: ['Alice', 'Bob', 'Charlie'],
};

const eventBytes = Event.serialize(eventData).toBytes();
const parsedEvent = Event.parse(eventBytes);
console.log('事件:', parsedEvent);
```

### UUID 类型

```typescript
// 自定义 UUID 类型（16 字节）
const UUID = {
  name: 'UUID',
  serialize(value: string, writer: any) {
    // 将 UUID 字符串转换为 16 字节
    const bytes = new Uint8Array(16);
    const hex = value.replace(/-/g, '');

    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    writer.writeBytes(bytes);
    return writer;
  },
  parse(reader: any): string {
    const bytes = reader.readBytes(16);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(
      12,
      4
    )}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
  },
};
```

## 工具函数

### Base64 转换

```typescript
// BCS 字节 <-> Base64
function bcsToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBcs(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// 使用
const data = { value: 42n };
const bytes = bcs.u64().serialize(data.value).toBytes();
const base64 = bcsToBase64(bytes);
console.log('Base64:', base64);

const decoded = bcs.u64().parse(base64ToBcs(base64));
console.log('解码:', decoded);
```

### Hex 转换

```typescript
// BCS 字节 <-> Hex
function bcsToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBcs(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  return bytes;
}
```

### 大小计算

```typescript
function calculateBcsSize<T>(schema: any, value: T): number {
  const bytes = schema.serialize(value).toBytes();
  return bytes.length;
}

// 使用
const person = {
  name: 'Alice',
  age: 30,
  address: '0x1',
};

const size = calculateBcsSize(Person, person);
console.log(`Person 占用 ${size} 字节`);
```

## 调试和验证

### 比较序列化结果

```typescript
function compareBcsSerialization<T>(
  schema: any,
  value1: T,
  value2: T
): boolean {
  const bytes1 = schema.serialize(value1).toBytes();
  const bytes2 = schema.serialize(value2).toBytes();

  if (bytes1.length !== bytes2.length) return false;

  for (let i = 0; i < bytes1.length; i++) {
    if (bytes1[i] !== bytes2[i]) return false;
  }

  return true;
}

// 使用
const data1 = { value: 42n };
const data2 = { value: 42n };
const data3 = { value: 43n };

console.log('相同数据:', compareBcsSerialization(bcs.u64(), data1.value, data2.value)); // true
console.log('不同数据:', compareBcsSerialization(bcs.u64(), data1.value, data3.value)); // false
```

### 可视化 BCS 数据

```typescript
function visualizeBcs(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

  const ascii = Array.from(bytes)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');

  return `Hex: ${hex}\nASCII: ${ascii}`;
}

// 使用
const strBytes = bcs.string().serialize('Hello').toBytes();
console.log(visualizeBcs(strBytes));
```

## 最佳实践

### 1. 版本控制

```typescript
// 为数据结构添加版本号
const VersionedData = bcs.struct('VersionedData', {
  version: bcs.u8(),
  data: bcs.vector(bcs.u8()), // 原始数据
});

// V1 结构
const DataV1 = bcs.struct('DataV1', {
  name: bcs.string(),
  value: bcs.u64(),
});

// V2 结构（新增字段）
const DataV2 = bcs.struct('DataV2', {
  name: bcs.string(),
  value: bcs.u64(),
  metadata: bcs.option(bcs.string()), // 新字段
});

// 解析时根据版本选择
function parseVersionedData(bytes: Uint8Array) {
  const versionedData = VersionedData.parse(bytes);

  switch (versionedData.version) {
    case 1:
      return DataV1.parse(new Uint8Array(versionedData.data));
    case 2:
      return DataV2.parse(new Uint8Array(versionedData.data));
    default:
      throw new Error('未知版本');
  }
}
```

### 2. 错误处理

```typescript
function safeParse<T>(schema: any, bytes: Uint8Array): T | null {
  try {
    return schema.parse(bytes);
  } catch (error) {
    console.error('BCS 解析失败:', error);
    return null;
  }
}

// 使用
const result = safeParse(Person, personBytes);
if (result) {
  console.log('解析成功:', result);
} else {
  console.log('解析失败');
}
```

### 3. 类型验证

```typescript
function validateBcsData<T>(
  schema: any,
  value: T,
  validator: (v: T) => boolean
): boolean {
  if (!validator(value)) {
    return false;
  }

  try {
    const bytes = schema.serialize(value).toBytes();
    const parsed = schema.parse(bytes);
    return validator(parsed);
  } catch {
    return false;
  }
}

// 使用
const isValidPerson = validateBcsData(
  Person,
  personData,
  (p) => p.age >= 0 && p.age <= 150 && p.name.length > 0
);
```

## 常见错误

### 错误 1: 类型不匹配

```typescript
// ❌ 错误：使用 number 而不是 bigint
try {
  bcs.u64().serialize(12345); // 错误！
} catch (error) {
  console.error('类型错误');
}

// ✅ 正确：使用 bigint
bcs.u64().serialize(12345n);
```

### 错误 2: 向量长度编码

```typescript
// BCS 会自动处理向量长度
// ❌ 不需要手动添加长度
const wrongBytes = new Uint8Array([
  3, // 长度
  1,
  2,
  3, // 元素
]);

// ✅ 正确：让 BCS 处理
const correctBytes = bcs.vector(bcs.u8()).serialize([1, 2, 3]).toBytes();
```

### 错误 3: 字节序

```typescript
// BCS 使用小端序（Little Endian）
const value = 0x12345678;

// ❌ 错误：大端序
const wrongBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

// ✅ 正确：使用 BCS
const correctBytes = bcs.u32().serialize(value).toBytes();
// 结果: [0x78, 0x56, 0x34, 0x12]
```

## 参考资源

- [BCS 规范](https://github.com/diem/bcs)
- [Sui BCS 文档](https://docs.sui.io/build/bcs)
- [Move 类型系统](https://move-book.com/advanced-topics/types-with-abilities.html)
- [@mysten/bcs GitHub](https://github.com/MystenLabs/sui/tree/main/sdk/bcs)

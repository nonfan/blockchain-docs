# 工具类

VeChain SDK 提供了一系列工具类来处理区块链开发中常见的数据类型。本文档介绍最常用的几个工具类。

## Address（地址）

Address 类用于处理 VeChain 地址,提供地址验证、格式化和转换功能。

### 基本用法

```ts
import { Address } from '@vechain/sdk-core';

// 从字符串创建地址
const address = Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');

// 获取地址字符串
console.log(address.toString());  // '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'

// 获取校验和格式地址
console.log(address.toChecksum()); // '0x7567D83b7b8d80ADDCb281A71d54Fc7B3364ffed'
```

### 地址验证

```ts
// 验证地址格式
try {
  const address = Address.of('0x7567d83b...');
  console.log('地址有效');
} catch (error) {
  console.log('地址无效:', error.message);
}

// 检查地址是否有效（不抛出异常）
function isValidAddress(addr: string): boolean {
  try {
    Address.of(addr);
    return true;
  } catch {
    return false;
  }
}

console.log(isValidAddress('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed')); // true
console.log(isValidAddress('invalid')); // false
```

### 地址格式化

VeChain 支持 EIP-55 校验和地址格式,可以检测地址输入错误。

```ts
const address = Address.of('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');

// 小写格式
console.log(address.toString());
// '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'

// 校验和格式（推荐）
console.log(address.toChecksum());
// '0x7567D83b7b8d80ADDCb281A71d54Fc7B3364ffed'
```

### 特殊地址

VeChain 有一些内置的系统合约地址。

```ts
// VTHO 代币合约
const VTHO_ADDRESS = '0x0000000000000000000000000000456E65726779';

// Authority 合约
const AUTHORITY_ADDRESS = '0x0000000000000000000000417574686F72697479';

// Energy 合约（VTHO）
const ENERGY_ADDRESS = Address.of('0x0000000000000000000000000000456E65726779');
```

### 实用函数

```ts
// 比较两个地址是否相同
function isSameAddress(addr1: string, addr2: string): boolean {
  return Address.of(addr1).toString().toLowerCase() ===
         Address.of(addr2).toString().toLowerCase();
}

// 地址缩写显示
function shortenAddress(addr: string): string {
  const address = Address.of(addr).toString();
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

console.log(shortenAddress('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed'));
// '0x7567...ffed'
```

---

## HexUInt（十六进制无符号整数）

HexUInt 用于处理十六进制数据,特别是私钥、哈希值等。

### 基本用法

```ts
import { HexUInt } from '@vechain/sdk-core';

// 从十六进制字符串创建
const hex1 = HexUInt.of('0x1234abcd');

// 从数字创建
const hex2 = HexUInt.of(123456);

// 从 Buffer 创建
const buffer = Buffer.from('1234abcd', 'hex');
const hex3 = HexUInt.of(buffer);
```

### 私钥处理

私钥通常使用 HexUInt 来表示。

```ts
import { HexUInt, Transaction } from '@vechain/sdk-core';

// 私钥字符串
const privateKeyStr = '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5';

// 转换为字节数组用于签名
const privateKeyBytes = HexUInt.of(privateKeyStr).bytes;

// 签名交易
const signedTx = Transaction.of(txBody).sign(privateKeyBytes);
```

### 数据转换

```ts
const hex = HexUInt.of('0x1234abcd');

// 转换为字符串
console.log(hex.toString());  // '0x1234abcd'

// 转换为字节数组
console.log(hex.bytes);       // Uint8Array [18, 52, 171, 205]

// 转换为数字
console.log(hex.toNumber());  // 305441741

// 转换为 BigInt
console.log(hex.toBigInt());  // 305441741n
```

### 哈希处理

```ts
import { HexUInt, blake2b256 } from '@vechain/sdk-core';

// 计算数据的哈希
const data = 'Hello VeChain';
const hash = blake2b256(data);

// 处理哈希值
const hashHex = HexUInt.of(hash);
console.log('哈希:', hashHex.toString());
```

### 编码和解码

```ts
import { HexUInt, abi } from '@vechain/sdk-core';

// ABI 编码参数
const encoded = abi.encodeParameter('uint256', '1000000000000000000');
const encodedHex = HexUInt.of(encoded);

console.log('编码后:', encodedHex.toString());
```

---

## Hex（通用十六进制工具）

Hex 提供了更通用的十六进制数据处理功能。

### 基本用法

```ts
import { Hex } from '@vechain/sdk-core';

// 从各种格式创建
const hex1 = Hex.of('0x1234');          // 从字符串
const hex2 = Hex.of(Buffer.from([0x12, 0x34])); // 从 Buffer
const hex3 = Hex.of(new Uint8Array([0x12, 0x34])); // 从 Uint8Array
```

### 字符串和字节转换

```ts
// 字符串 → 十六进制
const text = 'Hello';
const textHex = Hex.of(Buffer.from(text, 'utf8'));
console.log(textHex.toString()); // '0x48656c6c6f'

// 十六进制 → 字符串
const hex = Hex.of('0x48656c6c6f');
const decoded = Buffer.from(hex.bytes).toString('utf8');
console.log(decoded); // 'Hello'
```

### 拼接十六进制数据

```ts
const hex1 = Hex.of('0x1234');
const hex2 = Hex.of('0xabcd');

// 拼接
const combined = Hex.of(
  Buffer.concat([
    Buffer.from(hex1.bytes),
    Buffer.from(hex2.bytes)
  ])
);

console.log(combined.toString()); // '0x1234abcd'
```

---

## VET 和 VTHO

VET 和 VTHO 类用于处理 VeChain 的原生代币。

### VET（VeChain Token）

```ts
import { VET } from '@vechain/sdk-core';

// 从 VET 单位创建
const vet1 = VET.of(1);      // 1 VET
const vet2 = VET.of(10.5);   // 10.5 VET
const vet3 = VET.of('100');  // 100 VET

// 从 Wei 单位创建
const vetFromWei = VET.of('1000000000000000000'); // 1 VET = 10^18 Wei

// 转换为 Wei 字符串
console.log(VET.of(1).toString());
// '1000000000000000000'

// 转换为 VET 数值
console.log(VET.of('1000000000000000000').toVET());
// 1
```

### VTHO（VeThor Token）

```ts
import { VTHO } from '@vechain/sdk-core';

// 从 VTHO 单位创建
const vtho1 = VTHO.of(100);     // 100 VTHO
const vtho2 = VTHO.of(50.5);    // 50.5 VTHO

// 从 Wei 单位创建
const vthoFromWei = VTHO.of('100000000000000000000'); // 100 VTHO

// 转换
console.log(VTHO.of(100).toString());
// '100000000000000000000'
```

### 单位转换

```ts
// VET 单位转换
const vetAmount = 1.5; // 1.5 VET
const weiAmount = VET.of(vetAmount).toString(); // '1500000000000000000'

// Wei 转 VET
const wei = '1500000000000000000';
const vet = parseFloat(wei) / 1e18; // 1.5

// 或使用 BigInt
const vetBigInt = BigInt(wei) / BigInt(1e18); // 1n
```

### 实用函数

```ts
// 格式化显示 VET
function formatVET(wei: string | bigint): string {
  const vet = Number(wei) / 1e18;
  return `${vet.toFixed(4)} VET`;
}

console.log(formatVET('1500000000000000000')); // '1.5000 VET'

// 格式化显示 VTHO
function formatVTHO(wei: string | bigint): string {
  const vtho = Number(wei) / 1e18;
  return `${vtho.toFixed(2)} VTHO`;
}

console.log(formatVTHO('100000000000000000000')); // '100.00 VTHO'
```

---

## ThorId

ThorId 用于处理区块哈希、交易哈希等 32 字节的标识符。

### 基本用法

```ts
import { ThorId } from '@vechain/sdk-core';

// 从字符串创建
const txId = ThorId.of('0x9c8cf4f5d1b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9');

// 从数字创建（用于存储槽位置）
const storagePosition = ThorId.of(1);

// 转换为字符串
console.log(txId.toString());
```

### 交易和区块 ID

```ts
// 交易 ID
const txId = ThorId.of(
  '0x9c8cf4f5d1b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9'
);

// 区块 ID
const blockId = ThorId.of(
  '0x000f4240fa8c7c5b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7'
);

// 从区块 ID 提取区块号
const blockNumber = parseInt(blockId.toString().slice(0, 10), 16);
console.log('区块号:', blockNumber);
```

---

## Bloom Filter

Bloom Filter 用于高效检查事件是否可能存在于区块中。

### 基本用法

```ts
import { BloomFilter } from '@vechain/sdk-core';

// 创建 Bloom Filter
const bloom = BloomFilter.of('0x...');

// 检查是否包含某个元素
const topic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
if (bloom.contains(topic)) {
  console.log('可能包含该事件');
} else {
  console.log('肯定不包含该事件');
}
```

---

## 实战示例

### 示例 1: 地址簿管理

```ts
import { Address } from '@vechain/sdk-core';

class AddressBook {
  private addresses: Map<string, string> = new Map();

  // 添加地址
  add(name: string, address: string): void {
    // 验证并格式化地址
    const addr = Address.of(address);
    this.addresses.set(name, addr.toChecksum());
  }

  // 获取地址
  get(name: string): string | undefined {
    return this.addresses.get(name);
  }

  // 检查地址是否存在
  has(address: string): boolean {
    const addr = Address.of(address).toChecksum();
    return Array.from(this.addresses.values()).includes(addr);
  }

  // 获取地址的名称
  getName(address: string): string | undefined {
    const addr = Address.of(address).toChecksum();
    for (const [name, savedAddr] of this.addresses.entries()) {
      if (savedAddr === addr) return name;
    }
    return undefined;
  }
}

// 使用
const book = new AddressBook();
book.add('Alice', '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');
book.add('Bob', '0x9e7911de289c3c856ce7f421034f66b6cde49c39');

console.log(book.get('Alice'));
// '0x7567D83b7b8d80ADDCb281A71d54Fc7B3364ffed'
```

### 示例 2: 金额计算器

```ts
import { VET, VTHO } from '@vechain/sdk-core';

class AmountCalculator {
  // VET 转换
  static vetToWei(vet: number): string {
    return VET.of(vet).toString();
  }

  static weiToVet(wei: string): number {
    return Number(wei) / 1e18;
  }

  // VTHO 转换
  static vthoToWei(vtho: number): string {
    return VTHO.of(vtho).toString();
  }

  static weiToVtho(wei: string): number {
    return Number(wei) / 1e18;
  }

  // 格式化显示
  static formatVET(wei: string, decimals: number = 4): string {
    const vet = this.weiToVet(wei);
    return `${vet.toFixed(decimals)} VET`;
  }

  static formatVTHO(wei: string, decimals: number = 2): string {
    const vtho = this.weiToVtho(wei);
    return `${vtho.toFixed(decimals)} VTHO`;
  }
}

// 使用
console.log(AmountCalculator.vetToWei(1.5));
// '1500000000000000000'

console.log(AmountCalculator.formatVET('1500000000000000000'));
// '1.5000 VET'

console.log(AmountCalculator.formatVTHO('100000000000000000000'));
// '100.00 VTHO'
```

### 示例 3: 私钥管理

```ts
import { HexUInt } from '@vechain/sdk-core';
import * as crypto from 'crypto';

class KeyManager {
  // 生成随机私钥
  static generatePrivateKey(): string {
    const randomBytes = crypto.randomBytes(32);
    return HexUInt.of(randomBytes).toString();
  }

  // 验证私钥格式
  static isValidPrivateKey(key: string): boolean {
    try {
      const keyBytes = HexUInt.of(key).bytes;
      return keyBytes.length === 32;
    } catch {
      return false;
    }
  }

  // 私钥掩码显示（安全）
  static maskPrivateKey(key: string): string {
    if (!this.isValidPrivateKey(key)) return 'Invalid';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }
}

// 使用
const privateKey = KeyManager.generatePrivateKey();
console.log('生成的私钥:', KeyManager.maskPrivateKey(privateKey));
// '0xea53...ace5'

console.log('私钥有效:', KeyManager.isValidPrivateKey(privateKey));
// true
```

### 示例 4: 交易哈希工具

```ts
import { ThorId, HexUInt } from '@vechain/sdk-core';

class TransactionUtils {
  // 验证交易 ID 格式
  static isValidTxId(txId: string): boolean {
    try {
      const id = ThorId.of(txId);
      return id.toString().length === 66; // '0x' + 64 个字符
    } catch {
      return false;
    }
  }

  // 交易 ID 缩写
  static shortenTxId(txId: string): string {
    const id = ThorId.of(txId).toString();
    return `${id.slice(0, 10)}...${id.slice(-8)}`;
  }

  // 生成交易链接（区块浏览器）
  static getExplorerUrl(txId: string, network: 'mainnet' | 'testnet' = 'testnet'): string {
    const id = ThorId.of(txId).toString();
    const baseUrl = network === 'mainnet'
      ? 'https://explore.vechain.org'
      : 'https://explore-testnet.vechain.org';
    return `${baseUrl}/transactions/${id}`;
  }
}

// 使用
const txId = '0x9c8cf4f5d1b5f5c8e6d7b8a9f0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9';

console.log('交易 ID 有效:', TransactionUtils.isValidTxId(txId));
// true

console.log('缩写:', TransactionUtils.shortenTxId(txId));
// '0x9c8cf4f5...f6a7b8c9'

console.log('浏览器链接:', TransactionUtils.getExplorerUrl(txId));
// 'https://explore-testnet.vechain.org/transactions/0x9c8cf4...'
```

## 最佳实践

### 1. 地址处理

```ts
// ✅ 使用 Address 类进行验证
try {
  const address = Address.of(userInput);
  // 使用校验和格式存储
  saveAddress(address.toChecksum());
} catch (error) {
  showError('地址格式无效');
}

// ❌ 直接使用字符串
saveAddress(userInput); // 可能包含无效地址
```

### 2. 金额处理

```ts
// ✅ 使用 VET/VTHO 类
const amount = VET.of(1.5);
const clause = Clause.transferVET(address, amount);

// ❌ 手动计算 Wei
const weiAmount = '1500000000000000000'; // 容易数错 0
```

### 3. 私钥安全

```ts
// ✅ 永远不要在日志中输出完整私钥
console.log('私钥:', KeyManager.maskPrivateKey(privateKey));

// ❌ 直接输出私钥（危险）
console.log('私钥:', privateKey);
```

### 4. 数据验证

```ts
// ✅ 验证数据格式
function processAddress(addr: string) {
  try {
    const address = Address.of(addr);
    // 继续处理
  } catch (error) {
    throw new Error('无效的地址格式');
  }
}

// ❌ 不验证直接使用
function processAddress(addr: string) {
  // 直接使用,可能导致错误
  const clause = { to: addr, value: '0', data: '0x' };
}
```
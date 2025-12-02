# 钱包管理

本文档介绍如何使用 VeChain SDK 进行钱包管理,包括助记词生成、HD 钱包派生、私钥管理等。

## 核心概念

### 助记词（Mnemonic）

助记词是一组易于记忆的单词（通常 12 或 24 个）,用于生成和恢复钱包。

- **BIP39**: 助记词生成标准
- **BIP32**: 分层确定性钱包（HD Wallet）标准
- **BIP44**: 多币种 HD 钱包标准

### HD 钱包（Hierarchical Deterministic Wallet）

HD 钱包从一个种子可以派生出无数个子密钥,所有密钥都可以从助记词恢复。

**路径格式**: `m/44'/818'/0'/0/0`

- `m`: 主节点
- `44'`: BIP44 标准
- `818'`: VeChain 的币种代码
- `0'`: 账户索引
- `0`: 外部链（接收地址）
- `0`: 地址索引

## 助记词管理

### 生成助记词

```ts
import { HDNode, mnemonic } from '@vechain/sdk-core';

// 生成 12 个单词的助记词
const words12 = mnemonic.generate(12);
console.log('12 词助记词:', words12);
// 例: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

// 生成 24 个单词的助记词（更安全）
const words24 = mnemonic.generate(24);
console.log('24 词助记词:', words24);
```

### 验证助记词

```ts
// 验证助记词是否有效
const isValid = mnemonic.validate(words12);
console.log('助记词有效:', isValid);  // true

// 错误的助记词
const invalidWords = 'invalid mnemonic phrase test';
console.log('助记词有效:', mnemonic.validate(invalidWords));  // false
```

### 助记词转种子

```ts
// 从助记词生成种子
const seed = mnemonic.toSeed(words12);
console.log('种子:', seed.toString('hex'));

// 使用密码短语增强安全性
const seedWithPassword = mnemonic.toSeed(words12, 'mySecretPassword');
console.log('带密码的种子:', seedWithPassword.toString('hex'));
```

## HD 钱包

### 从助记词创建 HD 节点

```ts
import { HDNode, mnemonic } from '@vechain/sdk-core';

// 生成助记词
const words = mnemonic.generate(12);

// 从助记词创建 HD 节点
const masterNode = HDNode.fromMnemonic(words);

console.log('主节点:', {
  privateKey: masterNode.privateKey?.toString('hex'),
  publicKey: masterNode.publicKey.toString('hex'),
  chainCode: masterNode.chainCode.toString('hex')
});
```

### 从种子创建 HD 节点

```ts
// 从种子创建
const seed = mnemonic.toSeed(words);
const masterNode = HDNode.fromSeed(seed);
```

### 派生子密钥

```ts
// VeChain 标准路径: m/44'/818'/0'/0/index

// 派生第一个地址 (index 0)
const account0 = masterNode.derive("m/44'/818'/0'/0/0");

console.log('账户 0:', {
  address: account0.address,
  privateKey: account0.privateKey?.toString('hex'),
  publicKey: account0.publicKey.toString('hex')
});

// 派生第二个地址 (index 1)
const account1 = masterNode.derive("m/44'/818'/0'/0/1");

console.log('账户 1:', {
  address: account1.address,
  privateKey: account1.privateKey?.toString('hex')
});
```

### 批量生成地址

```ts
// 生成多个地址
function generateAddresses(masterNode: HDNode, count: number) {
  const addresses = [];

  for (let i = 0; i < count; i++) {
    const node = masterNode.derive(`m/44'/818'/0'/0/${i}`);
    addresses.push({
      index: i,
      address: node.address,
      privateKey: node.privateKey?.toString('hex')
    });
  }

  return addresses;
}

// 生成 10 个地址
const masterNode = HDNode.fromMnemonic(words);
const accounts = generateAddresses(masterNode, 10);

accounts.forEach(account => {
  console.log(`地址 ${account.index}:`, account.address);
});
```

## 私钥管理

### 从私钥创建密钥对

```ts
import { HDNode, HexUInt } from '@vechain/sdk-core';
import * as crypto from 'crypto';

// 生成随机私钥
const randomPrivateKey = crypto.randomBytes(32);
const privateKeyHex = HexUInt.of(randomPrivateKey).toString();

console.log('随机私钥:', privateKeyHex);

// 从私钥创建 HD 节点
const node = HDNode.fromPrivateKey(randomPrivateKey);

console.log('地址:', node.address);
console.log('公钥:', node.publicKey.toString('hex'));
```

### 从私钥恢复账户

```ts
// 已有的私钥
const existingPrivateKey = '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5';

// 转换为 Buffer
const privateKeyBuffer = Buffer.from(existingPrivateKey.slice(2), 'hex');

// 创建节点
const node = HDNode.fromPrivateKey(privateKeyBuffer);

console.log('恢复的地址:', node.address);
```

## 钱包管理类

### 完整的钱包管理器

```ts
import { HDNode, mnemonic, HexUInt } from '@vechain/sdk-core';

class Wallet {
  private masterNode: HDNode;
  private mnemonic: string;

  // 从助记词创建
  static fromMnemonic(words: string): Wallet {
    if (!mnemonic.validate(words)) {
      throw new Error('无效的助记词');
    }
    return new Wallet(words);
  }

  // 从私钥创建
  static fromPrivateKey(privateKey: string): Wallet {
    const pkBuffer = Buffer.from(privateKey.replace('0x', ''), 'hex');
    const node = HDNode.fromPrivateKey(pkBuffer);
    return new Wallet('', node);
  }

  // 生成新钱包
  static generate(wordCount: 12 | 24 = 12): Wallet {
    const words = mnemonic.generate(wordCount);
    return new Wallet(words);
  }

  private constructor(mnemonicWords: string, node?: HDNode) {
    this.mnemonic = mnemonicWords;
    this.masterNode = node || HDNode.fromMnemonic(mnemonicWords);
  }

  // 获取助记词
  getMnemonic(): string {
    return this.mnemonic;
  }

  // 派生账户
  deriveAccount(index: number) {
    const path = `m/44'/818'/0'/0/${index}`;
    const node = this.masterNode.derive(path);

    return {
      index,
      path,
      address: node.address,
      privateKey: node.privateKey ? '0x' + node.privateKey.toString('hex') : undefined,
      publicKey: '0x' + node.publicKey.toString('hex')
    };
  }

  // 批量派生账户
  deriveAccounts(count: number) {
    const accounts = [];
    for (let i = 0; i < count; i++) {
      accounts.push(this.deriveAccount(i));
    }
    return accounts;
  }

  // 通过路径派生
  derivePath(path: string) {
    const node = this.masterNode.derive(path);
    return {
      path,
      address: node.address,
      privateKey: node.privateKey ? '0x' + node.privateKey.toString('hex') : undefined,
      publicKey: '0x' + node.publicKey.toString('hex')
    };
  }
}

// 使用示例

// 1. 生成新钱包
const wallet = Wallet.generate(12);
console.log('助记词:', wallet.getMnemonic());

// 2. 派生账户
const account0 = wallet.deriveAccount(0);
console.log('账户 0:', account0);

// 3. 批量派生
const accounts = wallet.deriveAccounts(5);
accounts.forEach(acc => {
  console.log(`账户 ${acc.index}: ${acc.address}`);
});

// 4. 从助记词恢复
const recoveredWallet = Wallet.fromMnemonic(
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
);

// 5. 从私钥创建
const pkWallet = Wallet.fromPrivateKey(
  '0xea5383ac1f9e625220039a4afac6a7f868bf1ad4f48ce3a1dd78bd214ee4ace5'
);
```

## 多账户管理

### 账户管理器

```ts
interface Account {
  index: number;
  address: string;
  privateKey: string;
  label?: string;
}

class AccountManager {
  private wallet: Wallet;
  private accounts: Map<string, Account> = new Map();

  constructor(mnemonicWords: string) {
    this.wallet = Wallet.fromMnemonic(mnemonicWords);
  }

  // 添加账户
  addAccount(index: number, label?: string): Account {
    const derived = this.wallet.deriveAccount(index);

    if (!derived.privateKey) {
      throw new Error('无法获取私钥');
    }

    const account: Account = {
      index,
      address: derived.address,
      privateKey: derived.privateKey,
      label
    };

    this.accounts.set(derived.address, account);
    return account;
  }

  // 批量添加账户
  addAccounts(count: number): Account[] {
    const accounts: Account[] = [];
    for (let i = 0; i < count; i++) {
      accounts.push(this.addAccount(i, `账户 ${i}`));
    }
    return accounts;
  }

  // 获取账户
  getAccount(address: string): Account | undefined {
    return this.accounts.get(address);
  }

  // 获取所有账户
  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  // 通过标签获取账户
  getAccountByLabel(label: string): Account | undefined {
    return Array.from(this.accounts.values()).find(acc => acc.label === label);
  }

  // 删除账户
  removeAccount(address: string): boolean {
    return this.accounts.delete(address);
  }

  // 更新标签
  updateLabel(address: string, label: string): boolean {
    const account = this.accounts.get(address);
    if (account) {
      account.label = label;
      return true;
    }
    return false;
  }

  // 导出账户列表（不包含私钥）
  exportPublicData() {
    return this.getAllAccounts().map(acc => ({
      index: acc.index,
      address: acc.address,
      label: acc.label
    }));
  }
}

// 使用示例
const manager = new AccountManager(
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
);

// 添加账户
manager.addAccount(0, 'Main Account');
manager.addAccount(1, 'Trading Account');
manager.addAccount(2, 'Savings Account');

// 获取所有账户
const allAccounts = manager.getAllAccounts();
console.log('所有账户:', allAccounts);

// 通过标签查找
const tradingAccount = manager.getAccountByLabel('Trading Account');
console.log('交易账户:', tradingAccount);
```

## 安全最佳实践

### 1. 助记词存储

```ts
// ❌ 不要硬编码助记词
const mnemonic = 'abandon abandon abandon...';

// ✅ 从安全的来源读取
const mnemonic = process.env.WALLET_MNEMONIC;

// ✅ 或使用加密存储
import * as crypto from 'crypto';

function encryptMnemonic(mnemonic: string, password: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', password);
  let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptMnemonic(encrypted: string, password: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', password);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 加密存储
const encrypted = encryptMnemonic(mnemonic, 'userPassword');
localStorage.setItem('wallet', encrypted);

// 解密使用
const password = prompt('请输入密码');
const decrypted = decryptMnemonic(encrypted, password);
const wallet = Wallet.fromMnemonic(decrypted);
```

### 2. 私钥处理

```ts
class SecureWallet {
  private privateKeys: Map<string, Buffer> = new Map();

  // 添加私钥（内存中加密）
  addPrivateKey(address: string, privateKey: Buffer): void {
    // 在实际应用中应该加密存储
    this.privateKeys.set(address, privateKey);
  }

  // 获取私钥用于签名
  getPrivateKeyForSigning(address: string): Buffer | undefined {
    return this.privateKeys.get(address);
  }

  // 清除私钥
  clearPrivateKeys(): void {
    // 覆盖内存中的私钥数据
    for (const [_, key] of this.privateKeys) {
      key.fill(0);
    }
    this.privateKeys.clear();
  }

  // 导出私钥（掩码显示）
  exportPrivateKey(address: string, showFull: boolean = false): string {
    const key = this.privateKeys.get(address);
    if (!key) return '';

    const hex = '0x' + key.toString('hex');
    if (showFull) {
      return hex;
    }
    return `${hex.slice(0, 10)}...${hex.slice(-8)}`;
  }
}
```

### 3. 密码保护

```ts
import * as crypto from 'crypto';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

class PasswordProtectedWallet {
  // 从密码和助记词创建加密钱包
  static async create(mnemonic: string, password: string) {
    // 生成盐值
    const salt = randomBytes(32);

    // 使用 scrypt 派生密钥
    const key = (await scryptAsync(password, salt, 32)) as Buffer;

    // 加密助记词
    const iv = randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  // 解密钱包
  static async unlock(
    encrypted: string,
    salt: string,
    iv: string,
    password: string
  ): Promise<string> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');

    // 派生密钥
    const key = (await scryptAsync(password, saltBuffer, 32)) as Buffer;

    // 解密
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// 使用示例
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const password = 'mySecurePassword123';

// 创建加密钱包
const encryptedWallet = await PasswordProtectedWallet.create(mnemonic, password);
console.log('加密钱包:', encryptedWallet);

// 保存到文件或数据库
// saveToFile(encryptedWallet);

// 解锁钱包
const userPassword = 'mySecurePassword123';
const decryptedMnemonic = await PasswordProtectedWallet.unlock(
  encryptedWallet.encrypted,
  encryptedWallet.salt,
  encryptedWallet.iv,
  userPassword
);

console.log('解锁成功');
const wallet = Wallet.fromMnemonic(decryptedMnemonic);
```

## 实战示例

### 示例 1: 钱包备份和恢复

```ts
class WalletBackup {
  // 备份钱包
  static backup(wallet: Wallet, password: string) {
    const mnemonic = wallet.getMnemonic();
    const encrypted = encryptMnemonic(mnemonic, password);

    const backup = {
      version: '1.0',
      timestamp: Date.now(),
      data: encrypted
    };

    return JSON.stringify(backup);
  }

  // 恢复钱包
  static restore(backupJson: string, password: string): Wallet {
    const backup = JSON.parse(backupJson);

    if (backup.version !== '1.0') {
      throw new Error('不支持的备份版本');
    }

    const mnemonic = decryptMnemonic(backup.data, password);
    return Wallet.fromMnemonic(mnemonic);
  }
}

// 备份
const wallet = Wallet.generate(12);
const backupData = WalletBackup.backup(wallet, 'password123');
console.log('备份数据:', backupData);

// 恢复
const restoredWallet = WalletBackup.restore(backupData, 'password123');
console.log('钱包已恢复');
```

### 示例 2: 多签钱包

```ts
class MultiSigWallet {
  private signers: HDNode[] = [];

  constructor(mnemonics: string[], threshold: number) {
    if (threshold > mnemonics.length) {
      throw new Error('阈值不能大于签名者数量');
    }

    this.signers = mnemonics.map(m => HDNode.fromMnemonic(m));
  }

  // 获取所有签名者地址
  getSignerAddresses(): string[] {
    return this.signers.map(signer => {
      const account = signer.derive("m/44'/818'/0'/0/0");
      return account.address;
    });
  }

  // 多签地址生成（简化版，实际需要使用多签合约）
  getMultiSigAddress(): string {
    // 实际应该部署多签合约并返回合约地址
    // 这里仅作演示
    const addresses = this.getSignerAddresses();
    return `MultiSig(${addresses.join(',')})`;
  }
}

// 使用
const signer1Mnemonic = mnemonic.generate(12);
const signer2Mnemonic = mnemonic.generate(12);
const signer3Mnemonic = mnemonic.generate(12);

const multiSig = new MultiSigWallet(
  [signer1Mnemonic, signer2Mnemonic, signer3Mnemonic],
  2  // 3 个签名者中至少 2 个签名
);

console.log('签名者地址:', multiSig.getSignerAddresses());
```

### 示例 3: 观察钱包

```ts
class WatchOnlyWallet {
  private addresses: Set<string> = new Set();

  // 添加观察地址
  addAddress(address: string): void {
    this.addresses.add(address.toLowerCase());
  }

  // 批量添加
  addAddresses(addresses: string[]): void {
    addresses.forEach(addr => this.addAddress(addr));
  }

  // 检查是否是观察地址
  isWatchingAddress(address: string): boolean {
    return this.addresses.has(address.toLowerCase());
  }

  // 获取所有观察地址
  getAddresses(): string[] {
    return Array.from(this.addresses);
  }

  // 导出
  export(): string {
    return JSON.stringify({
      version: '1.0',
      addresses: this.getAddresses()
    });
  }

  // 导入
  static import(json: string): WatchOnlyWallet {
    const data = JSON.parse(json);
    const wallet = new WatchOnlyWallet();
    wallet.addAddresses(data.addresses);
    return wallet;
  }
}

// 使用
const watchWallet = new WatchOnlyWallet();
watchWallet.addAddress('0x7567d83b7b8d80addcb281a71d54fc7b3364ffed');
watchWallet.addAddress('0x9e7911de289c3c856ce7f421034f66b6cde49c39');

console.log('观察中的地址:', watchWallet.getAddresses());
```
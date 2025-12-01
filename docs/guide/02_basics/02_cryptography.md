# 密码学

> 区块链安全的数学基础

密码学是区块链技术的核心支柱，为数据完整性、身份认证和隐私保护提供数学保障。本文将系统介绍区块链中使用的密码学原理、算法和应用场景。

## 什么是密码学？

**密码学（Cryptography）** 是研究如何在对抗环境中安全传递信息的学科。在区块链中，密码学解决以下核心问题：

| 问题 | 密码学解决方案 | 应用场景 |
|------|---------------|----------|
| **数据完整性** | 哈希函数 | 区块链接、交易验证 |
| **身份认证** | 非对称加密 | 账户系统、签名验证 |
| **不可抵赖性** | 数字签名 | 交易授权、合约执行 |
| **隐私保护** | 零知识证明 | 隐私交易、身份验证 |
| **数据加密** | 对称/非对称加密 | 数据存储、通信保护 |

## 哈希函数

### 什么是哈希函数？

**哈希函数（Hash Function）** 将任意长度的输入数据映射为固定长度的输出（哈希值或摘要）。

```
输入：Hello, World!
↓ SHA-256
输出：dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f
```

### 理想哈希函数的性质

**1. 确定性（Deterministic）**
- 相同输入永远产生相同输出
```
SHA-256("Hello") = 185f8db...（始终一致）
```

**2. 快速计算**
- 正向计算速度快（纳秒级）
- 反向计算几乎不可能（需要宇宙级时间）

**3. 雪崩效应（Avalanche Effect）**
- 输入微小变化导致输出巨大变化
```
SHA-256("Hello")  = 185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969
SHA-256("Hello!") = 334d016f755cd6dc58c53a86e183882f8ec14f52fb05345887c8a5edd42c87b7
                     ↑ 完全不同！
```

**4. 抗碰撞性（Collision Resistance）**
- 难以找到两个不同输入产生相同输出
- SHA-256 碰撞概率：1 / 2^256 ≈ 1 / 10^77

**5. 抗原像攻击（Preimage Resistance）**
- 给定哈希值，无法反推原始输入
- 单向性：Hash(x) ✓，x ← Hash^-1(y) ✗

**6. 抗第二原像攻击**
- 给定输入 x1，难以找到 x2 使得 Hash(x1) = Hash(x2)

### 常用哈希算法对比

| 算法 | 输出长度 | 速度 | 安全性 | 应用 |
|------|---------|------|--------|------|
| **MD5** | 128 位 | 极快 | ⚠️ 已破解 | 文件校验（不推荐） |
| **SHA-1** | 160 位 | 快 | ⚠️ 已破解 | Git（历史遗留） |
| **SHA-256** | 256 位 | 快 | ✅ 安全 | 比特币、以太坊 |
| **SHA-3** | 可变 | 中等 | ✅ 安全 | 新一代标准 |
| **BLAKE2** | 256/512 位 | 极快 | ✅ 安全 | 高性能场景 |
| **Keccak-256** | 256 位 | 快 | ✅ 安全 | 以太坊地址 |

### SHA-256 详解

**算法流程：**
```
1. 消息填充（Padding）
   - 添加 1 bit "1"
   - 添加若干 "0" 使长度 ≡ 448 (mod 512)
   - 添加 64 bit 表示原始消息长度

2. 消息分块
   - 每 512 bit 为一块

3. 初始哈希值
   H0 = 0x6a09e667, H1 = 0xbb67ae85, ...

4. 压缩函数
   - 对每个块进行 64 轮迭代
   - 使用非线性函数和常量

5. 输出
   - 连接 8 个 32 bit 哈希值 → 256 bit
```

**实际应用示例：**

```javascript
// JavaScript 示例
const crypto = require('crypto');

// 计算 SHA-256
const hash = crypto.createHash('sha256')
  .update('Hello, Blockchain!')
  .digest('hex');

console.log(hash);
// 输出：8c7dd922ad47494fc02c388e12c00eac278d4a4d2f0f1b9f5e9f4a9b5c4d3e2f
```

```python
# Python 示例
import hashlib

message = "Hello, Blockchain!"
hash_obj = hashlib.sha256(message.encode())
hash_hex = hash_obj.hexdigest()

print(hash_hex)
# 输出：8c7dd922ad47494fc02c388e12c00eac278d4a4d2f0f1b9f5e9f4a9b5c4d3e2f
```

### 区块链中的哈希应用

**1. 区块链接**
```
区块 N-1                区块 N
┌──────────────┐      ┌──────────────┐
│ Hash: 0xABC  │◄─────┤ PrevHash:    │
│ Data: ...    │      │   0xABC      │
└──────────────┘      │ Data: ...    │
                      │ Hash: 0xDEF  │
                      └──────────────┘
```

**2. 默克尔树（Merkle Tree）**
```
                Root Hash
               /          \
          Hash AB       Hash CD
          /    \        /    \
      Hash A  Hash B  Hash C  Hash D
       |       |       |       |
      Tx A    Tx B    Tx C    Tx D
```

优势：
- ✅ 快速验证交易存在性（O(log n)）
- ✅ 轻节点只需存储 Merkle Root
- ✅ 高效的数据同步

**3. 工作量证明（PoW）**
```python
def proof_of_work(block_data, difficulty):
    nonce = 0
    target = "0" * difficulty  # 例如："0000"

    while True:
        hash_result = sha256(f"{block_data}{nonce}")

        if hash_result.startswith(target):
            return nonce, hash_result

        nonce += 1
```

**4. 地址生成**
```
公钥 → SHA-256 → RIPEMD-160 → Base58 → 比特币地址
公钥 → Keccak-256 → 取后 20 字节 → 以太坊地址
```

## 非对称加密

### 基本概念

**非对称加密（Asymmetric Encryption）** 使用一对密钥：
- **公钥（Public Key）** - 公开，用于加密和验证签名
- **私钥（Private Key）** - 保密，用于解密和生成签名

```
加密过程：
明文 + 公钥 → 密文

解密过程：
密文 + 私钥 → 明文
```

### 核心原理

**数学难题：**
- **RSA** - 大整数因式分解
- **ECC** - 椭圆曲线离散对数问题（ECDLP）
- **DSA** - 离散对数问题

### 对称加密 vs 非对称加密

| 特性 | 对称加密 | 非对称加密 |
|------|---------|-----------|
| **密钥** | 一个密钥 | 公钥 + 私钥 |
| **速度** | 快（适合大数据） | 慢（适合小数据） |
| **密钥分发** | 困难 | 简单 |
| **应用** | 数据加密 | 身份认证、密钥交换 |
| **代表算法** | AES, DES | RSA, ECC |

### 椭圆曲线密码学（ECC）

区块链主要使用 ECC，因为：
- ✅ 安全性高（256 bit ECC ≈ 3072 bit RSA）
- ✅ 密钥更短、签名更小
- ✅ 计算效率更高

**椭圆曲线方程：**
```
y² = x³ + ax + b

比特币/以太坊使用 secp256k1 曲线：
y² = x³ + 7
```

**密钥生成：**
```
1. 生成随机私钥
   private_key = random(1, n-1)  # n 为曲线阶数

2. 计算公钥
   public_key = private_key × G  # G 为基点

3. 公钥压缩
   - 未压缩：04 + x + y（65 字节）
   - 压缩：02/03 + x（33 字节）
```

**示例：**
```python
from cryptography.hazmat.primitives.asymmetric import ec

# 生成私钥
private_key = ec.generate_private_key(ec.SECP256K1())

# 导出公钥
public_key = private_key.public_key()

# 序列化
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

print("私钥:", private_bytes.hex())
print("公钥:", public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
).hex())
```

### 区块链中的非对称加密应用

**1. 账户系统**
```
私钥 → 公钥 → 地址

私钥：保密，用于签名交易
公钥：公开，验证签名
地址：公钥的哈希，接收资产
```

**2. 密钥管理**
```
助记词（12/24 个单词）
    ↓ BIP39
    种子（Seed）
    ↓ BIP32/44（HD钱包）
私钥 1, 私钥 2, ..., 私钥 N
```

## 数字签名

### 什么是数字签名？

**数字签名（Digital Signature）** 是非对称加密的重要应用，提供：
- ✅ **身份认证** - 证明签名者身份
- ✅ **不可抵赖** - 签名者无法否认
- ✅ **数据完整性** - 数据未被篡改

### 签名与验证流程

**签名过程：**
```
1. 对消息计算哈希
   hash = SHA-256(message)

2. 用私钥对哈希签名
   signature = Sign(hash, private_key)

3. 输出签名
   → (r, s) 或 DER 编码
```

**验证过程：**
```
1. 对消息计算哈希
   hash = SHA-256(message)

2. 用公钥验证签名
   valid = Verify(hash, signature, public_key)

3. 返回结果
   → True/False
```

### ECDSA 签名算法

**ECDSA（Elliptic Curve Digital Signature Algorithm）** 是区块链最常用的签名算法。

**签名生成：**
```
1. 生成随机数 k
2. 计算点 (x, y) = k × G
3. 计算 r = x mod n
4. 计算 s = k^-1 × (hash + r × private_key) mod n
5. 输出签名 (r, s)
```

**签名验证：**
```
1. 计算 w = s^-1 mod n
2. 计算 u1 = hash × w mod n
3. 计算 u2 = r × w mod n
4. 计算点 (x, y) = u1 × G + u2 × public_key
5. 验证 r == x mod n
```

### 区块链交易签名示例

**比特币交易签名：**
```python
from bitcoin import *

# 1. 创建私钥
private_key = random_key()
public_key = privtopub(private_key)
address = pubtoaddr(public_key)

# 2. 创建交易
tx = mktx([("prev_tx_hash:index", amount)], [address])

# 3. 签名交易
signed_tx = sign(tx, 0, private_key)

# 4. 广播交易
broadcast(signed_tx)
```

**以太坊交易签名：**
```javascript
const { ethers } = require('ethers');

// 1. 创建钱包
const wallet = ethers.Wallet.createRandom();

// 2. 创建交易
const tx = {
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  value: ethers.parseEther("1.0"),
  gasLimit: 21000,
  gasPrice: ethers.parseUnits("10", "gwei")
};

// 3. 签名交易
const signedTx = await wallet.signTransaction(tx);

// 4. 广播交易
await provider.sendTransaction(signedTx);
```

### 签名安全要点

**1. 随机数 k 的重要性**
```
⚠️ 重复使用 k → 私钥泄露

Sony PS3 事件（2010）：
- 使用固定 k 签名游戏
- 黑客通过两个签名反推出私钥
- 结果：PS3 系统被破解
```

**2. 签名延展性（Malleability）**
```
原始签名：(r, s)
修改后：(r, -s mod n)  # 仍然有效！

问题：交易 ID 改变，但语义相同
解决：BIP66（比特币），EIP-155（以太坊）
```

**3. 签名重放攻击**
```
问题：在不同链上重放相同签名
解决：包含链 ID（Chain ID）到签名中
```

## 零知识证明（ZKP）

### 什么是零知识证明？

**零知识证明（Zero-Knowledge Proof）** 允许证明者向验证者证明某个陈述是真实的，而无需透露除此之外的任何信息。

**经典例子：阿里巴巴洞穴**
```
             洞穴入口
               /  \
              /    \
         路径 A    路径 B
              \    /
               门
            （需要密码）

证明者想证明知道密码，但不想透露密码：

1. 验证者在入口等待
2. 证明者随机选择路径 A 或 B 进入
3. 验证者随机要求从 A 或 B 出来
4. 如果证明者知道密码，总能从要求的路径出来
5. 重复多次后，验证者确信证明者知道密码
```

### ZKP 的三个性质

| 性质 | 说明 |
|------|------|
| **完整性（Completeness）** | 如果陈述为真，诚实的证明者能说服验证者 |
| **可靠性（Soundness）** | 如果陈述为假，作弊的证明者无法说服验证者 |
| **零知识（Zero-Knowledge）** | 验证者除了"陈述为真"外，学不到其他信息 |

### 主流 ZKP 技术

| 技术 | 全称 | 特点 | 应用 |
|------|------|------|------|
| **zk-SNARKs** | Zero-Knowledge Succinct Non-Interactive Argument of Knowledge | 证明小、验证快、需要可信设置 | Zcash, Tornado Cash |
| **zk-STARKs** | Zero-Knowledge Scalable Transparent Arguments of Knowledge | 无需可信设置、抗量子攻击 | StarkNet, Polygon Miden |
| **Bulletproofs** | - | 无需可信设置、证明较大 | Monero |
| **PLONK** | Permutations over Lagrange-bases for Oecumenical Non-interactive arguments of Knowledge | 通用、更新可信设置 | Aztec, Mina |

### zk-SNARKs 详解

**工作流程：**
```
1. 可信设置（Trusted Setup）
   生成公共参数（CRS）

2. 证明生成
   证明者：proof = Prove(statement, witness, CRS)

3. 证明验证
   验证者：valid = Verify(statement, proof, CRS)
```

**特点：**
- ✅ 证明极小（~200 字节）
- ✅ 验证极快（~10ms）
- ⚠️ 需要可信设置（如果被破坏，可伪造证明）
- ⚠️ 不抗量子攻击

**应用案例：Zcash 隐私交易**
```
普通交易：
Alice → Bob: 10 BTC
（金额和地址公开）

隐私交易（Zcash）：
? → ?: ? BTC
（金额和地址隐藏，但证明交易合法）
```

### zk-STARKs 详解

**优势：**
- ✅ 无需可信设置
- ✅ 抗量子攻击
- ✅ 证明生成更快（大规模计算）

**劣势：**
- ❌ 证明较大（~100KB）
- ❌ 验证稍慢

**应用：StarkNet（以太坊 Layer 2）**
```
链下执行成千上万笔交易
    ↓
生成 STARK 证明
    ↓
提交到以太坊主网
    ↓
以太坊验证证明（Gas 成本低）
```

### ZKP 在区块链中的应用

**1. 隐私交易**
- **Zcash** - 完全隐私的数字货币
- **Tornado Cash** - 以太坊混币协议
- **Monero** - 使用 Bulletproofs 的隐私币

**2. Layer 2 扩容**
- **zkSync** - 以太坊 ZK-Rollup
- **StarkNet** - 基于 zk-STARKs
- **Polygon zkEVM** - EVM 兼容的 ZK-Rollup

**3. 身份验证**
- 证明年龄 > 18，但不透露具体年龄
- 证明信用评分 > 700，但不透露具体分数
- 证明拥有某资产，但不透露资产细节

**4. 可验证计算**
```
客户端：我完成了复杂计算，结果是 X
    ↓ ZKP
验证者：证明是 X 确实正确，但我不需要重新计算
```

## 密码学攻击与防御

### 常见攻击方式

| 攻击类型 | 说明 | 防御措施 |
|---------|------|----------|
| **暴力破解** | 尝试所有可能的密钥 | 使用足够长的密钥（256 bit） |
| **生日攻击** | 利用碰撞概率 | 使用 SHA-256（非 MD5/SHA-1） |
| **彩虹表攻击** | 预计算哈希表 | 加盐（Salt） |
| **侧信道攻击** | 通过时间、功耗等泄露信息 | 常数时间算法 |
| **中间人攻击** | 拦截并篡改通信 | 使用签名验证 |
| **量子攻击** | 量子计算机破解 | 使用抗量子算法 |

### 安全最佳实践

**1. 私钥管理**
```
✅ 使用硬件钱包（Ledger, Trezor）
✅ 助记词离线保存
✅ 多签钱包（Multi-sig）
✅ 社交恢复（Social Recovery）

❌ 明文存储私钥
❌ 截图私钥
❌ 云端备份未加密的密钥
```

**2. 随机数生成**
```javascript
// ❌ 不安全
Math.random()

// ✅ 安全
const crypto = require('crypto');
crypto.randomBytes(32)
```

**3. 密码学库选择**
```
✅ 使用成熟的库：
   - OpenSSL
   - libsodium
   - Web3.js/Ethers.js
   - Go crypto/...

❌ 自己实现密码学算法
```

## 量子计算威胁

### 量子计算对密码学的影响

| 算法 | 安全性 | 量子攻击 |
|------|--------|----------|
| **对称加密（AES）** | 256 bit | 需要 2^128 量子操作（仍然安全） |
| **哈希函数（SHA-256）** | 256 bit | 需要 2^128 量子操作（仍然安全） |
| **RSA** | 3072 bit | ⚠️ Shor 算法可破解 |
| **ECC** | 256 bit | ⚠️ Shor 算法可破解 |

### 后量子密码学（Post-Quantum Cryptography）

**抗量子算法：**
- **格密码（Lattice-based）** - NTRU, CRYSTALS-Kyber
- **哈希密码（Hash-based）** - SPHINCS+
- **多变量密码** - Rainbow
- **编码密码** - Classic McEliece

**区块链应对：**
- 以太坊正在研究抗量子签名
- IOTA 使用 Winternitz 一次性签名
- Quantum Resistant Ledger（QRL）专注抗量子

## 总结

密码学是区块链安全的基石：

### 核心技术

1. **哈希函数** - 数据完整性和不可篡改性
2. **非对称加密** - 身份认证和密钥管理
3. **数字签名** - 交易授权和不可抵赖性
4. **零知识证明** - 隐私保护和可扩展性

### 关键要点

- ✅ 使用经过验证的密码学算法（SHA-256, secp256k1）
- ✅ 妥善管理私钥（硬件钱包、多签）
- ✅ 防范常见攻击（暴力破解、重放攻击）
- ⚠️ 关注量子计算威胁
- ⚠️ 不要自己实现密码学算法

密码学让区块链能够在不信任的环境中建立信任，是去中心化系统的数学保障。随着技术发展，新的密码学方案（如 zk-SNARKs、后量子密码）将继续推动区块链向更安全、更隐私、更高效的方向演进。

## 参考资源

- [密码学导论](https://www.crypto101.io/)
- [应用密码学](https://www.schneier.com/books/applied_cryptography/)
- [零知识证明入门](https://zkp.science/)
- [NIST 后量子密码标准](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [区块链密码学](https://github.com/bitcoinbook/bitcoinbook)

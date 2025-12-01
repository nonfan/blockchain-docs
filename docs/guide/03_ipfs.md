# IPFS 去中心化存储

> 下一代互联网协议：从位置寻址到内容寻址

IPFS（InterPlanetary File System，星际文件系统）是一个点对点的分布式文件系统，旨在创建持久化、可分发的数据存储和共享网络。本文将深入介绍 IPFS 的原理、架构和应用。

## 什么是 IPFS？

**IPFS** 是由 Protocol Labs 开发的去中心化存储协议，目标是补充甚至替代传统的 HTTP 协议，构建更快速、更安全、更开放的互联网。

### HTTP vs IPFS

```
HTTP（位置寻址）：
用户 → DNS → 服务器 IP → 获取文件
      https://example.com/file.pdf

问题：
❌ 服务器宕机 → 文件不可访问
❌ 链接失效 → 404 错误
❌ 带宽成本高
❌ 单点故障
❌ 可被审查

IPFS（内容寻址）：
用户 → DHT → 查找节点 → 获取文件
      ipfs://QmXx.../file.pdf

优势：
✅ 文件永久可访问（如果有人托管）
✅ 内容不可篡改（哈希验证）
✅ 就近获取（CDN 效果）
✅ 去中心化
✅ 抗审查
```

### 核心特性对比

| 特性 | HTTP | IPFS |
|------|------|------|
| **寻址方式** | 位置寻址（域名+路径） | 内容寻址（CID） |
| **中心化** | 中心化服务器 | 去中心化节点 |
| **数据完整性** | 需额外校验 | 内置哈希校验 |
| **单点故障** | 有 | 无 |
| **重复数据** | 浪费存储 | 自动去重 |
| **带宽成本** | 高（中心化） | 低（就近获取） |
| **版本控制** | 需额外实现 | 原生支持 |
| **审查抗性** | 弱 | 强 |

## IPFS 架构

### 技术栈

```
┌─────────────────────────────────────┐
│        应用层（Applications）         │
│    NFT、DApp、文件共享、视频流       │
├─────────────────────────────────────┤
│         IPFS 核心层（Core）          │
│  - IPLD（数据模型）                  │
│  - UnixFS（文件系统）                │
│  - MFS（可变文件系统）               │
├─────────────────────────────────────┤
│        交换层（Exchange）            │
│  - Bitswap（数据交换协议）           │
├─────────────────────────────────────┤
│        路由层（Routing）             │
│  - Kademlia DHT（分布式哈希表）      │
├─────────────────────────────────────┤
│        网络层（Network）             │
│  - libp2p（P2P 网络库）             │
│  - NAT 穿透、多路复用               │
└─────────────────────────────────────┘
```

### 核心组件

**1. libp2p - 网络层**
```
功能：
- P2P 通信
- 节点发现
- NAT 穿透
- 流多路复用
- 加密通信

支持的传输协议：
- TCP
- WebSocket
- QUIC
- WebRTC
```

**2. Kademlia DHT - 路由层**
```
作用：
- 内容路由（找到拥有内容的节点）
- 节点路由（找到特定节点）
- 数据发布与查找

特点：
- O(log N) 查询复杂度
- XOR 距离度量
- 自组织网络
```

**3. Bitswap - 数据交换**
```
功能：
- 数据块交换
- 想要列表（Want List）
- 账本系统（激励机制）

工作流程：
1. 节点 A 请求数据块
2. 发送 Want List 给邻居
3. 邻居响应拥有的块
4. 交换数据块
5. 更新账本
```

**4. IPLD - 数据模型**
```
作用：
- 统一的数据结构
- 跨系统互操作
- 链接数据块

支持的格式：
- dag-pb（Protocol Buffers）
- dag-cbor（CBOR）
- dag-json
- dag-eth（以太坊）
- git
```

## CID（内容标识符）

### CID 结构

**CID v0（旧版）：**
```
QmXx... (58 个字符)
- Base58 编码
- 固定使用 SHA-256
- 不包含版本信息
```

**CID v1（新版）：**
```
bafybeif... (59+ 个字符)

结构：
<version><codec><hash-type><hash-value>

示例：
bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
│  │    │                                                  │
│  │    │                                                  └─ Hash Value
│  │    └─ Hash Type (0x12 = SHA-256)
│  └─ Codec (0x70 = dag-pb)
└─ Version (0x01)

Base 编码：
- base32 (b...)
- base58btc (z...)
- base64 (m...)
```

### CID 生成过程

```
文件内容
    ↓
1. 分块（默认 256KB）
    ↓
2. 计算每块哈希（SHA-256）
    ↓
3. 构建 Merkle DAG
    ↓
4. 编码为 CID
    ↓
bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

**实际示例：**
```bash
# 添加文件到 IPFS
$ echo "Hello IPFS" > hello.txt
$ ipfs add hello.txt

added QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx hello.txt

# CID 解析
$ ipfs cid format -v 1 QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx

bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

## Merkle DAG

### 什么是 Merkle DAG？

**Merkle DAG（Directed Acyclic Graph）** 是 IPFS 的核心数据结构，结合了 Merkle Tree 和 DAG 的特性。

```
                  根节点 (CID)
                 /     |     \
            块 1      块 2     块 3
           /  \       |       /  \
      子块1  子块2   块 2   子块3  子块4
```

### 示例：存储大文件

```
大文件（10 MB）
    ↓ 分块
┌─────────────────────────────────┐
│  块 1  │  块 2  │  块 3  │  块 4  │
│ 256KB  │ 256KB  │ 256KB  │ 256KB  │
└─────────────────────────────────┘
    ↓ 哈希
┌─────────────────────────────────┐
│ Hash1  │ Hash2  │ Hash3  │ Hash4  │
└─────────────────────────────────┘
    ↓ 构建 DAG
        ┌──── Root Hash ────┐
        │    (文件 CID)      │
        └────────┬───────────┘
        ┌────────┴────────┐
    Hash1  Hash2  Hash3  Hash4
```

**优势：**
- ✅ 大文件高效存储
- ✅ 重复数据自动去重
- ✅ 支持部分检索
- ✅ 版本控制友好

### 目录结构示例

```
myproject/
├── README.md
├── src/
│   ├── main.js
│   └── utils.js
└── package.json

IPFS DAG 表示：
        myproject (CID_root)
        /        |         \
    README    src (CID)  package.json
              /    \
          main.js  utils.js
```

## DHT（分布式哈希表）

### Kademlia DHT 详解

IPFS 使用 Kademlia DHT 实现内容路由。

**节点 ID：**
```
ID = SHA-256(PublicKey)
结果：256 bit 标识符
```

**XOR 距离度量：**
```
distance(A, B) = A XOR B

示例：
ID_A = 1010
ID_B = 1100
distance = 1010 XOR 1100 = 0110 (二进制) = 6
```

**K-Bucket 路由表：**
```
每个节点维护 256 个 K-Bucket（k 通常 = 20）

距离范围              节点列表
[2^0, 2^1)    →  [Node1, Node2, ...]  (最多 20 个)
[2^1, 2^2)    →  [Node3, Node4, ...]
[2^2, 2^3)    →  [Node5, Node6, ...]
...
[2^255, 2^256) → [NodeN, ...]
```

**内容查找流程：**
```
1. 计算目标 CID 的哈希
2. 查找距离最近的 k 个节点
3. 并行查询这些节点
4. 每个节点返回更近的节点列表
5. 递归查询，直到找到内容或超时
6. 最多 O(log N) 跳
```

## IPFS 网络层（libp2p）

### 多地址（Multiaddr）

IPFS 使用自描述的多地址格式：

```
传统地址：
192.168.1.1:4001

Multiaddr：
/ip4/192.168.1.1/tcp/4001/p2p/QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N

组件：
/ip4/192.168.1.1  → IPv4 地址
/tcp/4001         → TCP 端口
/p2p/QmYy...      → 节点 Peer ID
```

**多种传输协议：**
```
/ip4/127.0.0.1/tcp/4001
/ip6/::1/tcp/4001
/dns4/ipfs.io/tcp/443/wss
/ip4/1.2.3.4/udp/4001/quic
```

### 连接建立

```
1. 节点发现
   - mDNS（局域网）
   - DHT 引导节点
   - 手动添加地址

2. 握手（Noise Protocol）
   - 交换公钥
   - 建立加密通道

3. 协议协商（Multistream）
   - 节点声明支持的协议
   - 选择共同协议

4. 数据传输
   - Yamux/Mplex 流多路复用
   - 并行传输多个数据流
```

## 数据持久化

### Pin（固定）机制

**问题：**
IPFS 节点会定期进行垃圾回收（GC），删除未被 Pin 的数据。

**解决方案：**
```
本地 Pin：
$ ipfs pin add <CID>

查看 Pin 列表：
$ ipfs pin ls

取消 Pin：
$ ipfs pin rm <CID>

递归 Pin（包括子节点）：
$ ipfs pin add -r <CID>
```

**Pin 类型：**

| 类型 | 说明 | 示例 |
|------|------|------|
| **Direct** | 直接固定单个块 | 单个文件 |
| **Recursive** | 递归固定所有子块 | 目录树 |
| **Indirect** | 间接固定（被递归固定的子块） | 自动管理 |

### Pin 服务

**公共 Pin 服务：**

**1. Pinata**
```
特点：
- 免费 1GB
- API 友好
- IPFS 专用网关
- 付费计划支持更大存储

使用：
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@myfile.jpg"
```

**2. Web3.Storage**
```
特点：
- Protocol Labs 官方
- 免费使用
- 自动备份到 Filecoin
- 简单 API

使用：
npm install web3.storage

const { Web3Storage } = require('web3.storage')
const client = new Web3Storage({ token: API_TOKEN })
const cid = await client.put([file])
```

**3. NFT.Storage**
```
专为 NFT 优化：
- 免费存储 NFT 数据
- 自动备份到 Filecoin
- 符合 NFT 元数据标准
```

**4. Filebase**
```
特点：
- S3 兼容 API
- 多链存储（IPFS + Filecoin + Storj）
- 企业级 SLA
```

## 使用 IPFS

### 安装 IPFS

```bash
# macOS
brew install ipfs

# Linux
wget https://dist.ipfs.io/go-ipfs/v0.20.0/go-ipfs_v0.20.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.20.0_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh

# 验证
ipfs --version
```

### 初始化和启动

```bash
# 初始化节点
ipfs init

# 启动守护进程
ipfs daemon

# 输出：
# Initializing daemon...
# API server listening on /ip4/127.0.0.1/tcp/5001
# Gateway server listening on /ip4/127.0.0.1/tcp/8080
# Daemon is ready
```

### 基本操作

**添加文件：**
```bash
# 添加单个文件
$ ipfs add myfile.txt
added QmXx... myfile.txt

# 添加目录
$ ipfs add -r mydir/
added QmYy... mydir/file1.txt
added QmZz... mydir/file2.txt
added QmAa... mydir

# 只计算 CID，不添加
$ ipfs add --only-hash myfile.txt
```

**获取文件：**
```bash
# 下载文件
$ ipfs get QmXx... -o myfile.txt

# 查看文件内容
$ ipfs cat QmXx...

# 查看目录
$ ipfs ls QmAa...
```

**固定管理：**
```bash
# 固定文件
$ ipfs pin add QmXx...

# 查看 Pin 列表
$ ipfs pin ls --type=recursive

# 取消固定
$ ipfs pin rm QmXx...

# 垃圾回收
$ ipfs repo gc
```

**节点管理：**
```bash
# 查看节点 ID
$ ipfs id

# 查看连接的节点
$ ipfs swarm peers

# 连接到特定节点
$ ipfs swarm connect /ip4/.../p2p/QmXx...

# 查看节点信息
$ ipfs stats bw  # 带宽统计
$ ipfs repo stat # 存储统计
```

### JavaScript API

**安装：**
```bash
npm install ipfs-http-client
```

**使用示例：**
```javascript
const { create } = require('ipfs-http-client');

// 连接到本地节点
const ipfs = create({ url: 'http://localhost:5001' });

// 添加文件
async function addFile() {
  const file = {
    path: 'hello.txt',
    content: Buffer.from('Hello IPFS!')
  };

  const result = await ipfs.add(file);
  console.log('CID:', result.cid.toString());
  // CID: QmXx...
}

// 获取文件
async function getFile(cid) {
  const chunks = [];
  for await (const chunk of ipfs.cat(cid)) {
    chunks.push(chunk);
  }
  const content = Buffer.concat(chunks).toString();
  console.log('Content:', content);
}

// 添加目录
async function addDirectory() {
  const files = [
    { path: 'mydir/file1.txt', content: 'File 1' },
    { path: 'mydir/file2.txt', content: 'File 2' }
  ];

  for await (const result of ipfs.addAll(files)) {
    console.log(result.path, result.cid.toString());
  }
}

// Pin 管理
async function pinFile(cid) {
  await ipfs.pin.add(cid);
  console.log('Pinned:', cid);
}

// 查询节点信息
async function getNodeInfo() {
  const id = await ipfs.id();
  console.log('Node ID:', id.id);
  console.log('Addresses:', id.addresses);
}
```

### Go API

```go
package main

import (
    "context"
    "fmt"
    "io"
    "os"

    "github.com/ipfs/go-ipfs-api"
)

func main() {
    // 连接到本地节点
    sh := shell.NewShell("localhost:5001")

    // 添加文件
    file, _ := os.Open("myfile.txt")
    defer file.Close()

    cid, err := sh.Add(file)
    if err != nil {
        panic(err)
    }
    fmt.Println("CID:", cid)

    // 获取文件
    reader, err := sh.Cat(cid)
    if err != nil {
        panic(err)
    }
    defer reader.Close()

    content, _ := io.ReadAll(reader)
    fmt.Println("Content:", string(content))

    // Pin 文件
    err = sh.Pin(cid)
    if err != nil {
        panic(err)
    }
}
```

## IPFS 网关

### 什么是网关？

IPFS 网关允许通过 HTTP 访问 IPFS 内容，方便浏览器用户访问。

**格式：**
```
https://gateway.ipfs.io/ipfs/<CID>
https://ipfs.io/ipfs/<CID>
https://<CID>.ipfs.dweb.link
```

**示例：**
```
CID: QmXx...

公共网关访问：
https://gateway.ipfs.io/ipfs/QmXx.../hello.txt
https://cloudflare-ipfs.com/ipfs/QmXx.../hello.txt
https://ipfs.io/ipfs/QmXx.../hello.txt

子域名网关（更安全）：
https://bafybeigdyrzt.ipfs.dweb.link/hello.txt
```

### 公共网关列表

| 网关 | URL | 特点 |
|------|-----|------|
| **IPFS.io** | https://ipfs.io | 官方网关 |
| **Cloudflare** | https://cloudflare-ipfs.com | CDN 加速 |
| **Pinata** | https://gateway.pinata.cloud | Pin 服务专用 |
| **Infura** | https://ipfs.infura.io | 企业级 |
| **dweb.link** | https://dweb.link | 子域名隔离 |

### 自建网关

```bash
# 启动本地网关
$ ipfs daemon

# 默认端口：8080
# 访问：http://localhost:8080/ipfs/<CID>

# 配置公网访问
$ ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# 配置域名
$ ipfs config --json Gateway.PublicGateways '{
  "example.com": {
    "Paths": ["/ipfs", "/ipns"],
    "UseSubdomains": true
  }
}'
```

### 网关安全

**跨域隔离：**
```
问题：
不同 CID 的内容在同一域名下，可能产生跨站攻击

解决：
使用子域名网关
https://<CID>.ipfs.dweb.link

每个 CID 独立域名，浏览器隔离
```

**CORS 配置：**
```bash
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'
```

## IPFS 与区块链集成

### NFT 存储

**标准做法：**
```javascript
// 1. 上传图片和元数据到 IPFS
const imageCID = await ipfs.add(imageFile);
// bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

// 2. 创建元数据
const metadata = {
  name: "My NFT",
  description: "...",
  image: `ipfs://${imageCID}`,
  attributes: [...]
};

// 3. 上传元数据
const metadataCID = await ipfs.add(JSON.stringify(metadata));

// 4. Mint NFT（链上存储 CID）
await nftContract.mint(tokenId, `ipfs://${metadataCID}`);
```

**OpenSea 元数据标准：**
```json
{
  "name": "NFT Name",
  "description": "Description",
  "image": "ipfs://QmXx.../image.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Rare"
    }
  ]
}
```

### DApp 前端托管

```bash
# 构建 React 应用
npm run build

# 上传到 IPFS
ipfs add -r build/
added QmXx... build

# 通过网关访问
https://ipfs.io/ipfs/QmXx...

# 绑定 IPNS（可变地址）
ipfs name publish QmXx...
Published to QmYy... (Peer ID)

# 访问
https://ipfs.io/ipns/QmYy...
```

### 智能合约数据存储

**Solidity 示例：**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IPFSStorage {
    // 存储 IPFS CID
    mapping(uint256 => string) public documents;

    event DocumentAdded(uint256 indexed id, string cid);

    // 添加文档
    function addDocument(uint256 id, string memory cid) public {
        documents[id] = cid;
        emit DocumentAdded(id, cid);
    }

    // 获取文档
    function getDocument(uint256 id) public view returns (string memory) {
        return documents[id];
    }
}
```

**使用流程：**
```javascript
// 1. 上传文档到 IPFS
const file = new File([documentData], 'document.pdf');
const cid = await ipfs.add(file);

// 2. 存储 CID 到链上
await contract.addDocument(tokenId, cid.toString());

// 3. 从链上读取 CID
const cid = await contract.getDocument(tokenId);

// 4. 从 IPFS 获取文档
const content = await ipfs.cat(cid);
```

## 性能优化

### 1. 分块优化

```bash
# 自定义块大小（默认 256KB）
ipfs add --chunker=size-1048576 largefile.bin  # 1MB 块

# 使用 Rabin 指纹分块（CDC）
ipfs add --chunker=rabin-262144-524288-1048576 file.bin
```

**选择建议：**
- 小文件（< 1MB）：默认块大小
- 大文件（> 100MB）：增大块大小
- 增量更新频繁：使用 Rabin 分块

### 2. 并行传输

```javascript
// 并发上传多个文件
const files = [...]; // 文件列表
const uploadPromises = files.map(file => ipfs.add(file));
const results = await Promise.all(uploadPromises);
```

### 3. Bitswap 优化

```bash
# 调整 Bitswap 配置
ipfs config --json Swarm.ConnMgr.HighWater 200
ipfs config --json Swarm.ConnMgr.LowWater 100

# 更多连接 → 更快下载
```

### 4. 缓存策略

```javascript
// 客户端缓存
const cachedCID = localStorage.getItem('data_cid');
if (cachedCID) {
  // 使用缓存的 CID
  const data = await ipfs.cat(cachedCID);
} else {
  // 获取新数据并缓存 CID
  const newCID = await fetchLatestCID();
  localStorage.setItem('data_cid', newCID);
}
```

## 安全考虑

### 1. 内容验证

```javascript
// 总是验证 CID
async function verifyCID(cid, expectedContent) {
  const content = await ipfs.cat(cid);
  const hash = await calculateHash(content);
  const calculatedCID = createCID(hash);

  if (calculatedCID !== cid) {
    throw new Error('CID mismatch!');
  }
}
```

### 2. 隐私保护

**问题：**
IPFS 上的内容是公开的，任何人都可以通过 CID 访问。

**解决方案：**
```javascript
// 加密后再上传
const crypto = require('crypto');

// 加密
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

let encrypted = cipher.update(content, 'utf8', 'hex');
encrypted += cipher.final('hex');

// 上传加密内容
const cid = await ipfs.add(encrypted);

// 链上或链下存储密钥（仅授权用户可访问）
```

### 3. 访问控制

**使用 Lit Protocol：**
```javascript
// 基于 NFT 的访问控制
const accessControlConditions = [
  {
    contractAddress: NFT_CONTRACT,
    standardContractType: 'ERC721',
    method: 'balanceOf',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '>',
      value: '0'
    }
  }
];

// 加密内容
const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(content);

// 上传到 IPFS
const cid = await ipfs.add(encryptedString);

// 只有持有 NFT 的用户才能解密
```

## IPFS 替代方案

| 项目 | 特点 | 适用场景 |
|------|------|----------|
| **IPFS** | 成熟、生态丰富 | 通用文件存储 |
| **Filecoin** | IPFS + 经济激励 | 长期存储 |
| **Arweave** | 一次付费、永久存储 | 归档数据 |
| **Storj** | S3 兼容、企业级 | 云存储替代 |
| **Sia** | 低成本 | 大容量存储 |
| **Swarm** | 以太坊生态 | DApp 存储 |

### Filecoin vs IPFS

```
IPFS：
- 内容寻址协议
- 自愿托管
- 无经济激励

Filecoin：
- 基于 IPFS
- 付费存储
- 存储证明（PoRep + PoSt）
- 存储矿工激励

组合使用：
IPFS（热数据） + Filecoin（冷数据/备份）
```

## 常见问题

### Q1: IPFS 数据会永久存在吗？

**A:** 不一定。
- 只要有节点 Pin，数据就存在
- 如果所有节点都删除，数据消失
- 使用 Pin 服务保证持久性
- 考虑备份到 Filecoin

### Q2: IPFS 适合存储敏感数据吗？

**A:** 不建议直接存储。
- IPFS 数据公开可访问
- 需要加密后再上传
- 考虑使用私有 IPFS 网络
- 或使用访问控制方案（Lit Protocol）

### Q3: 如何加速 IPFS 访问？

**A:** 多种方案：
- 使用公共网关（Cloudflare）
- 部署专用网关
- 预热缓存（提前 Pin）
- 使用 CDN（通过网关）
- 增加节点连接数

### Q4: IPFS 成本如何？

**A:**
- 运行节点：免费（硬件+带宽）
- Pin 服务：
  - Pinata: 免费 1GB，付费从 $20/月
  - Web3.Storage: 免费
  - NFT.Storage: 免费（NFT 专用）
- Filecoin 存储：~$0.000001/GB/月

### Q5: CID 会改变吗？

**A:**
- 内容不变 → CID 不变
- 内容改变 → 生成新 CID
- 使用 IPNS 创建可变地址
- 或链上存储最新 CID

## 实际应用案例

### 1. OpenSea - NFT 市场

```
方案：
- NFT 图片和元数据存储在 IPFS
- 使用 Pinata 固定服务
- 链上存储 ipfs:// URI

好处：
- 去中心化存储
- 永久可访问
- 降低链上成本
```

### 2. Audius - 音乐流媒体

```
方案：
- 音频文件存储在 IPFS
- 内容节点网络（IPFS + CDN）
- 元数据上链

好处：
- 创作者直接控制内容
- 抗审查
- 降低存储成本
```

### 3. Brave 浏览器

```
集成：
- 原生支持 ipfs:// 协议
- 内置 IPFS 节点
- 自动解析 IPNS

好处：
- 用户无需插件
- 浏览器直接访问 IPFS
```

### 4. Fleek - Web3 托管

```
服务：
- 自动部署到 IPFS
- 分配 .eth 域名
- CDN 加速

工作流：
git push → CI/CD → IPFS → ENS 更新
```

## 总结

IPFS 通过内容寻址、P2P 网络和 Merkle DAG 构建了去中心化的存储系统：

### 核心技术

1. **内容寻址（CID）** - 基于内容的唯一标识
2. **Merkle DAG** - 高效的数据结构
3. **DHT** - 分布式内容路由
4. **libp2p** - P2P 网络层
5. **Bitswap** - 数据交换协议

### 关键优势

- ✅ 去中心化存储
- ✅ 内容永久可访问（如果被 Pin）
- ✅ 自动去重
- ✅ 就近获取（CDN 效果）
- ✅ 抗审查

### 实践要点

- ⚠️ 数据默认公开，敏感数据需加密
- ⚠️ 需要 Pin 服务保证持久性
- ⚠️ 网关可能有延迟
- ⚠️ 大文件传输需优化

IPFS 正在重新定义互联网的数据存储和分发方式，成为 Web3 基础设施的重要组成部分。随着 Filecoin、IPNS 等技术的发展，IPFS 生态将更加完善。

## 参考资源

- [IPFS 官网](https://ipfs.io)
- [IPFS 文档](https://docs.ipfs.io)
- [ProtoSchool 教程](https://proto.school)
- [Awesome IPFS](https://awesome.ipfs.io)
- [IPFS 白皮书](https://ipfs.io/ipfs/QmR7GSQM93Cx5eAg6a6yRzNde1FQv7uL6X1o4k7zrJa3LX/ipfs.draft3.pdf)

# 安装与配置 <Badge type="tip" text="^5.0.0" />

> OpenZeppelin Contracts：生产级智能合约库

> [!IMPORTANT] 本节重点
> 1. 如何在不同开发环境（Hardhat、Foundry、Remix）中安装 OpenZeppelin？
> 2. 普通合约和可升级合约有什么区别？
> 3. 如何选择合适的版本？
> 4. 开发环境如何配置？
> 5. 如何验证安装成功？

## 什么是 OpenZeppelin Contracts？

**OpenZeppelin Contracts** 是以太坊及 EVM 兼容链上最广泛使用的智能合约库，提供了：

- ✅ **经过审计的代码**：所有合约经过多轮安全审计
- ✅ **生产级质量**：被数千个项目使用，管理数十亿美元资产
- ✅ **模块化设计**：可组合、可扩展的合约组件
- ✅ **完整文档**：详细的 API 文档和最佳实践指南
- ✅ **持续更新**：跟随 Solidity 和 EIP 标准更新

### 核心功能模块

| 模块            | 功能                     | 典型用例                  |
| ------------- | ---------------------- | --------------------- |
| **Token**     | ERC20、ERC721、ERC1155  | DeFi 代币、NFT、游戏道具      |
| **Access**    | Ownable、AccessControl | 权限管理、多角色系统            |
| **Security**  | ReentrancyGuard、Pausable | 防重入、紧急暂停              |
| **Proxy**     | UUPS、Transparent      | 可升级合约                 |
| **Governance** | Governor、Votes        | DAO 治理                |
| **Utils**     | Math、Strings、Cryptography | 数学运算、字符串处理、签名验证       |

### 官方资源

- 📘 [官方文档](https://docs.openzeppelin.com/contracts)
- 💻 [GitHub 仓库](https://github.com/OpenZeppelin/openzeppelin-contracts)
- 📦 [NPM 包](https://www.npmjs.com/package/@openzeppelin/contracts)
- 🎓 [学习资源](https://docs.openzeppelin.com/learn)

## 安装方法

### 方法 1：Hardhat 项目（推荐）

**适用于：** 大多数 DApp 开发、DeFi 项目

```bash
# 1. 创建 Hardhat 项目
mkdir my-project && cd my-project
npm init -y
npm install --save-dev hardhat

# 2. 初始化 Hardhat
npx hardhat init
# 选择 "Create a JavaScript project" 或 "Create a TypeScript project"

# 3. 安装 OpenZeppelin Contracts
npm install @openzeppelin/contracts

# 4. （可选）安装可升级合约版本
npm install @openzeppelin/contracts-upgradeable

# 5. （可选）安装 Hardhat 升级插件
npm install --save-dev @openzeppelin/hardhat-upgrades
```

**验证安装：**

```solidity
// contracts/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000 * 10**18);
    }
}
```

```bash
# 编译测试
npx hardhat compile
```

### 方法 2：Foundry 项目

**适用于：** 追求极致性能、高级开发者

```bash
# 1. 创建 Foundry 项目
forge init my-project
cd my-project

# 2. 安装 OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# 3. 配置 remappings
echo "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/" > remappings.txt

# 4. （可选）安装可升级版本
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
echo "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/" >> remappings.txt
```

**验证安装：**

```solidity
// src/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000 * 10**18);
    }
}
```

```bash
# 编译测试
forge build
```

### 方法 3：Remix IDE（在线开发）

**适用于：** 快速原型、学习测试、小型项目

1. 打开 [Remix IDE](https://remix.ethereum.org)
2. 创建新文件 `MyToken.sol`
3. 直接使用 GitHub 导入：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 通过 GitHub URL 导入
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000 * 10**18);
    }
}
```

或者使用 Remix 内置的 GitHub 插件：
- 点击左侧 "Plugin Manager"
- 激活 "DGit" 插件
- Clone `OpenZeppelin/openzeppelin-contracts` 仓库

### 方法 4：Truffle 项目（传统方法）

```bash
# 1. 创建 Truffle 项目
mkdir my-project && cd my-project
npm init -y
npm install --save-dev truffle

# 2. 初始化 Truffle
npx truffle init

# 3. 安装 OpenZeppelin
npm install @openzeppelin/contracts
```

## 版本选择指南

### 当前版本对比

| 版本    | Solidity 版本     | 发布日期        | 状态    | 推荐使用场景           |
| ----- | --------------- | ----------- | ----- | ---------------- |
| 5.x   | ^0.8.20         | 2023+       | ✅ 最新 | 新项目（推荐）          |
| 4.x   | ^0.8.0          | 2021-2023   | 🔄 维护 | 现有项目、兼容性需求       |
| 3.x   | ^0.6.0 / ^0.7.0 | 2020-2021   | ⚠️ 停止 | 仅维护，不推荐新项目       |

### 安装指定版本

```bash
# 最新稳定版（推荐）
npm install @openzeppelin/contracts

# 指定主版本
npm install @openzeppelin/contracts@^5.0.0

# 精确版本
npm install @openzeppelin/contracts@5.0.0

# 查看可用版本
npm view @openzeppelin/contracts versions
```

### 版本选择建议

**新项目：** 使用最新版本（5.x）
```bash
npm install @openzeppelin/contracts@latest
```

**现有项目：** 保持当前主版本，仅升级补丁版本
```bash
# package.json
{
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0"  // 锁定主版本
  }
}
```

**生产环境：** 锁定精确版本
```bash
# package.json
{
  "dependencies": {
    "@openzeppelin/contracts": "5.0.0"  // 不使用 ^
  }
}
```

## 普通合约 vs 可升级合约

OpenZeppelin 提供两种包：

### @openzeppelin/contracts（标准版）

- ✅ 适用于**不可升级**的合约
- ✅ Gas 成本更低
- ✅ 代码更简单
- ❌ 部署后无法修改逻辑

```bash
npm install @openzeppelin/contracts
```

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {}
}
```

### @openzeppelin/contracts-upgradeable（可升级版）

- ✅ 适用于**可升级**的合约（使用代理模式）
- ✅ 可修复 bug、添加功能
- ✅ 保持合约地址不变
- ❌ Gas 成本略高
- ❌ 开发复杂度增加

```bash
npm install @openzeppelin/contracts-upgradeable
npm install --save-dev @openzeppelin/hardhat-upgrades
```

```solidity
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeable is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

### 如何选择？

| 场景                | 推荐          | 原因                    |
| ----------------- | ----------- | --------------------- |
| 学习、原型、测试          | 标准版         | 简单、快速                 |
| 小型 DApp、NFT 项目    | 标准版         | 无需升级，Gas 更低           |
| DeFi 协议、DAO、企业级应用 | 可升级版        | 需要修复 bug、添加功能         |
| 高价值合约（> 100 万美元）  | 可升级版 + 多签   | 安全性最高，可应对紧急情况         |
| 已部署的合约            | 根据当前版本      | 无法更改                  |

## 开发环境配置

### Hardhat 配置

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades"); // 如果使用可升级合约

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // 本地测试网络配置
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
```

### Foundry 配置

```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200

# Remappings
remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
]
```

### VSCode 配置（推荐）

创建 `.vscode/settings.json`：

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.20",
  "solidity.packageDefaultDependenciesContractsDirectory": "contracts",
  "solidity.packageDefaultDependenciesDirectory": "node_modules",
  "solidity.remappings": [
    "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
    "@openzeppelin/contracts-upgradeable/=node_modules/@openzeppelin/contracts-upgradeable/"
  ]
}
```

## 验证安装

### 创建测试合约

```solidity
// contracts/TestInstallation.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TestInstallation is ERC20, Ownable {
    using Math for uint256;
    using Strings for uint256;

    constructor() ERC20("Test Token", "TEST") Ownable(msg.sender) {
        _mint(msg.sender, 1000 * 10**18);
    }

    function testMath() external pure returns (uint256) {
        return Math.max(100, 200);
    }

    function testStrings() external pure returns (string memory) {
        return uint256(123).toString();
    }
}
```

### 编译测试

**Hardhat:**
```bash
npx hardhat compile

# 预期输出：
# Compiled 1 Solidity file successfully
```

**Foundry:**
```bash
forge build

# 预期输出：
# [⠊] Compiling...
# [⠒] Compiling 1 files with 0.8.20
# [⠢] Solc 0.8.20 finished in 1.23s
```

### 运行简单测试

**Hardhat 测试：**

```javascript
// test/TestInstallation.js
const { expect } = require("chai");

describe("TestInstallation", function () {
  it("Should deploy successfully", async function () {
    const Test = await ethers.getContractFactory("TestInstallation");
    const test = await Test.deploy();

    expect(await test.name()).to.equal("Test Token");
    expect(await test.symbol()).to.equal("TEST");
    expect(await test.testMath()).to.equal(200);
    expect(await test.testStrings()).to.equal("123");
  });
});
```

```bash
npx hardhat test
```

**Foundry 测试：**

```solidity
// test/TestInstallation.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TestInstallation.sol";

contract TestInstallationTest is Test {
    TestInstallation test;

    function setUp() public {
        test = new TestInstallation();
    }

    function testDeployment() public {
        assertEq(test.name(), "Test Token");
        assertEq(test.symbol(), "TEST");
        assertEq(test.testMath(), 200);
        assertEq(test.testStrings(), "123");
    }
}
```

```bash
forge test
```

## 常见问题

### Q1: 安装后提示找不到模块？

**A:** 检查 import 路径和 remappings 配置

```solidity
// ❌ 错误
import "openzeppelin/contracts/token/ERC20/ERC20.sol";

// ✅ 正确
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
```

**Hardhat:** 确保 `node_modules` 存在
```bash
ls node_modules/@openzeppelin/contracts
```

**Foundry:** 检查 `remappings.txt`
```bash
cat remappings.txt
# 应输出：@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

### Q2: 编译时出现版本不兼容？

**A:** 确保 Solidity 版本匹配

| OpenZeppelin 版本 | 最低 Solidity 版本 |
| -------------- | -------------- |
| 5.x            | ^0.8.20        |
| 4.x            | ^0.8.0         |
| 3.x            | ^0.6.0 / ^0.7.0 |

```solidity
// 检查合约头部
pragma solidity ^0.8.20; // 确保版本正确
```

### Q3: 如何更新到最新版本？

**A:** 谨慎升级，先阅读变更日志

```bash
# 1. 查看当前版本
npm list @openzeppelin/contracts

# 2. 查看可用版本
npm view @openzeppelin/contracts versions

# 3. 更新到最新版本
npm update @openzeppelin/contracts

# 4. 或安装特定版本
npm install @openzeppelin/contracts@5.0.0
```

**⚠️ 重要：** 主版本升级（如 4.x → 5.x）可能有破坏性变更，必须：
1. 阅读 [迁移指南](https://docs.openzeppelin.com/contracts/5.x/upgrades)
2. 全面测试
3. 重新审计

### Q4: 可以混用标准版和可升级版吗？

**A:** 不推荐，应选择其一

```solidity
// ❌ 不推荐：混用
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// ✅ 统一使用标准版
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ✅ 或统一使用可升级版
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
```

### Q5: 如何在 Remix 中使用最新版本？

**A:** 指定版本号的 GitHub URL

```solidity
// ✅ 指定版本
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/ERC20.sol";

// ❌ 避免使用 master 分支（不稳定）
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";
```

### Q6: 如何查看已安装的合约源码？

**A:**

**Hardhat/NPM:**
```bash
# 查看源码位置
ls node_modules/@openzeppelin/contracts/

# 查看特定文件
cat node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol
```

**Foundry:**
```bash
# 查看源码位置
ls lib/openzeppelin-contracts/contracts/

# 查看特定文件
cat lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol
```

## 下一步

安装完成后，你可以：

1. 📖 **学习核心模块**：
   - [Utils - 工具库](./01_utils.md)
   - [Access - 权限控制](./02_access.md)
   - [Token - 代币标准](./03_token.md)

2. 🚀 **构建第一个合约**：
   ```solidity
   import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

   contract MyFirstToken is ERC20 {
       constructor() ERC20("My First Token", "MFT") {
           _mint(msg.sender, 1_000_000 * 10**18);
       }
   }
   ```

3. 🔐 **了解安全最佳实践**：
   - [Security - 安全工具](./06_security.md)
   - [Proxy - 可升级合约](./04_proxy.md)

4. 🏛️ **探索高级功能**：
   - [Governance - DAO 治理](./05_governance.md)

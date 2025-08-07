# 合约部署升级

智能合约一旦部署到区块链上，代码本身将不可更改。如果后续发现漏洞、需要功能迭代或修复，通常需要通过升级机制进行合约维护。下面将介绍
VeChain 上合约部署与升级的基础流程与最佳实践。

## 部署合约

最基本的方式是将合约一次性部署到链上。部署后合约地址和内容不可变，不能直接修改代码。

### 初始化 Hardhat 项目

`VeChain SDK Hardhat` 插件将 Hardhat 与 VeChain SDK 无缝集成，为开发人员在 VeChainThor 区块链上开发智能合约提供了强大的工具集。这个重要的软件包简化了在
VeChain 生态系统中创建、测试、部署智能合约和与智能合约交互的过程。

::: code-group

```bash npm
npm install --save-dev hardhat
npx hardhat

npm install @vechain/sdks-hardhat-plugin
```

```bash yarn
yarn add --dev hardhat
npx hardhat

yarn add @vechain/sdks-hardhat-plugin
```

:::

**配置您的 hardhat.config.ts：**

```ts
import '@vechain/sdks-hardhat-plugin';

import {HttpNetworkConfig} from 'hardhat/types';

const VET_DERIVATION_PATH = "m/44'/818'/0'/0"
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: 'paris' // EVM version (e.g., "byzantium", "constantinople", "petersburg", "istanbul", "berlin", "london")
        }
      },
    ]
  },
  networks: {
    networks: {
      vechain_testnet: {
        // Testnet
        url: "https://vethor-node-test.vechaindev.com",
        accounts: {
          mnemonic: process.env.MNEMONIC,
          path: "m/44'/818'/0'/0",
          count: 3,
          initialIndex: 0,
        },
        gas: 6000000,
        gasPrice: "auto",
        gasMultiplier: 1,
        timeout: 60000,
        httpHeaders: {},
      },
      vechain_mainnet: {
        // Mainnet
        url: "https://vethor-node.vechain.com",
        accounts: {
          mnemonic: process.env.MNEMONIC,
          path: "m/44'/818'/0'/0",
          count: 3,
          initialIndex: 0,
        },
        gas: 6000000,
        gasPrice: "auto",
        gasMultiplier: 1,
        timeout: 60000,
        httpHeaders: {},
      },
    },
  }
};
```

> [!NOTE] 注意
> VeChainThor EVM 在 `paris` 硬分叉时与以太坊保持一致。如果您使用的是 solidity 编译器版本 `0.8.20` 或更高版本，请将
> evmVersion 设置为 paris。

> [!TIP] VeChain网络
> 在命名VeChain网络时，需要附带前缀 `vechain_`，否则无效。

**经过实践检验，目前VeChain最好用的RPC节点就是:**

- Mainnet: `https://vethor-node.vechain.com`
- Testnet: `https://vethor-node-test.vechaindev.com`

### 编写合约

使用 Solidity 语言编写你的智能合约，定义合约的功能、状态变量和访问权限。
建议在 `contracts/` 目录下新建 `.sol` 文件，并遵循良好的代码规范和注释习惯。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    uint256 public value;

    function setValue(uint256 _value) public {
        value = _value;
    }
}
```

### 编写部署脚本

在根目录创建 `scripts` 文件夹，添加 `scripts/deploy.ts`, 这样可以一键部署合约，并便于后续升级与测试。

```bash
# 编译合约
npx hardhat compile
```

```js [deploy.ts]
import {ethers} from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const signer = (await ethers.getSigners())[0];

  const vechainHelloWorldFactory = await ethers.getContractFactory(
    "MyContract",
    signer
  );

  const txResponse = await vechainHelloWorldFactory.deploy;

  console.log(
    "合约地址:",
    txResponse.target
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

```

```shell
# 运行部署命令
npx hardhat run scripts/deploy.ts --network network-name
```

## 升级合约

在实际项目中，为了支持合约未来的升级与维护，通常采用**代理模式（Proxy Pattern）**部署合约。推荐使用 OpenZeppelin
提供的插件，实现可升级的智能合约部署。

### 安装插件

:::code-group

```bash [npm]
npm install --save-dev @openzeppelin/hardhat-upgrades @openzeppelin/contracts-upgradeable
```

```bash [yarn]
yarn add --dev @openzeppelin/hardhat-upgrades @openzeppelin/contracts-upgradeable
```

:::

`@openzeppelin/hardhat-upgrades`：用于 Hardhat 的合约升级插件。
`@openzeppelin/contracts-upgradeable`：包含可升级合约标准库（如 UUPS、Transparent Proxy）。

在 `hardhat.config.ts` 引入:

```ts
import "@openzeppelin/hardhat-upgrades";
```

### 编写升级合约

为支持合约未来升级，建议使用 OpenZeppelin 提供的可升级合约基类（如 UUPS、Transparent Proxy）。
升级合约需要继承对应的 Upgradeable 基类，并使用初始化函数代替构造函数。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyUpgradeableContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    function initialize(uint256 _initValue) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        value = _initValue;
    }

    function setValue(uint256 _value) public onlyOwner {
        value = _value;
    }

    // UUPS 必须实现此函数，控制谁有权升级合约
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // 预留变量50固定存储
    uint256[50] private __gap;
}
```

### 编写部署脚本

编写 `deploy.ts` 文件。

```ts
import {ethers, upgrades} from "hardhat";

async function main() {
  // 获取当前 network.name
  const net = network.name.includes("main") ? "mainnet" : "testnet";

  const Contract = await ethers.getContractFactory("MyUpgradeableContract");
  const proxy = await upgrades.deployProxy(
    Contract,
    [/*初始值参数*/ "500"],
    {
      initializer: "initialize",
      kind: "uups", // 推荐显式指定 UUPS
    }
  );

  await proxy.waitForDeployment();
  console.log(`${net} Deployed to proxy address:`, await proxy.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 编写合约升级脚步

```ts
const {ethers, upgrades} = require("hardhat");

async function main() {
  const proxyAddress = "YOUR_PROXY_ADDRESS"; // 替换为实际代理地址
  const Contract = await ethers.getContractFactory("MyUpgradeableContract");

  // 仅在第一次升级时，注册，后续再次升级应该注释
  await upgrades.forceImport(proxyAddress, Contract, {kind: "uups"});
  console.log("Proxy imported! Now you can upgrade it safely.");

  // 验证升级兼容性
  await upgrades.validateUpgrade(proxyAddress, Contract);
  console.log("Upgrade validation passed!");

  // 执行升级
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Contract);
  console.log("Upgrade successful! New implementation at:", await upgraded.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 验证实现地址唯一

**部署升级合约流程**：`deploy` -> `upgrade`(首次升级，需要注册) -> `upgrade`(注释注册代码)

查看获取的实现地址（非代理地址）是否唯一，如果遇到升级无效，可能是每次升级的实现代码没有变化。

```ts
const slot =
  "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";
const impl = await ethers.provider.getStorage(proxyAddress, slot);
console.log("Current Implementation Address:", "0x" + impl.slice(-40));
```

### 手动升级

在初始化合约时，你可以通过 `__Ownable_init(owner)` 指定合约的 **Owner（拥有者）地址**。这样一来，只有 Owner
才有权进行合约升级，而不是任意人或任意脚本。

当 Owner 不是部署脚本默认账户时，后续合约升级操作（如调用
upgradeProxy）就不能在本地脚本里直接完成，因为升级流程会调用合约的 _`authorizeUpgrade` 权限校验，需要 Owner 账户签名。

- 此时，即使你运行 `npx hardhat run scripts/upgrade.ts`，脚本也会因没有 Owner 权限而升级失败。
- 必须用指定的 Owner 钱包（如硬件钱包、Metamask 等）手动发起升级交易。
- 这种模式增强了安全性，防止合约被非授权账户升级，但带来了操作的复杂性。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyUpgradeableContract is Initializable, OwnableUpgradeable {
    uint256 public value;

    // 初始化时设置 Owner
    function initialize(address _owner, uint256 _initValue) public initializer {
        __Ownable_init(_owner); // 设置合约 Owner
        value = _initValue;
    }

    function setValue(uint256 _value) public onlyOwner {
        value = _value;
    }
}
```

在链下用 Owner 账户手动发起升级合约操作时，需要提前获取新实现合约（implementation）的地址，然后再由 Owner 账户执行升级（如
`upgradeToAndCall`）。

**编写 `/scripts/get-implementation.ts` 脚本，获取实现地址：**

```ts
import {ethers, upgrades} from "hardhat";

async function main() {
  const Contract = await ethers.getContractFactory("MyUpgradeableContract");
  const proxyAddress = "需要升级的合约";

  await upgrades.forceImport(proxyAddress, Contract, {kind: "uups"});
  console.log("Proxy imported! Now you can upgrade it safely.");

  // 验证新实现是否能安全升级
  await upgrades.validateUpgrade(proxyAddress, Contract);
  console.log("Upgrade validation passed!");

  // 第二步：升级实现合约
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Contract);
  await upgraded.waitForDeployment(); // 确保链上完成

  console.log("Proxy upgraded at:", await upgraded.getAddress());

  const slot =
    "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";
  const impl = await ethers.provider.getStorage(proxyAddress, slot);
  console.log("Current Implementation Address:", "0x" + impl.slice(-40));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

> [!WARNING]
> 每当你对合约代码做出任何修改（包括功能新增、变量扩展、修复 bug 等），都必须重新编译合约，才能生成最新的合约字节码和
> ABI，并正确部署新的实现合约。

**Owner链下调用 `upgradeToAndCall` 合约:**

```ts
const handleUpgrade = () => {
  const connexInstance = new Connex({
    network: 'test' | "main",
    node: "https://testnet.vechain.org" | "https://mainnet.vechain.org",
  });

  const newImplementation = 'Implementation Address';
  const clause = connex.thor
    .account("ProxyAddress")
    .method({
      inputs: [
        {
          internalType: 'address',
          name: 'newImplementation',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'upgradeToAndCall',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    })
    .asClause(newImplementation, "0x");
};
```

> [!INFO] upgradeToAndCall 方法解释
> `upgradeToAndCall` 是升级合约代理（如 UUPS Proxy 或 Transparent Proxy）时常用的一个函数。 
> 它的作用是在完成合约升级的同时，立刻调用新实现合约的某个初始化函数（如升级后的初始化或数据迁移），实现“升级+初始化”一步到位。
> - `newImplementation`：新实现合约的地址。 
> - `data`：编码后的函数调用数据（通常为新实现的初始化或迁移函数）。 
> - 可以附带 `msg.value`，以太坊/VeChain 都支持。
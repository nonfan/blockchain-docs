# Hardhat

> [Hardhat](https://hardhat.org/) 是一个以太坊智能合约的开发环境与任务运行器，主要用来：**编译**智能合约、**部署**
> 到本地/测试网/主网、运行**测试、调试和分析**交易和管理插件和脚本。

## 快速入门

Hardhat 项目本质上是一个 Node.js 项目，所以先创建并初始化：

**初始化项目**

```bash
mkdir my-hardhat-app && cd my-hardhat-app
npm init -y
```

**安装 Hardhat**

```bash
npm install --save-dev hardhat
```

**创建 Hardhat 项目**

```bash
npx hardhat init
```

```text
$ npx hardhat init
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

Welcome to Hardhat v2.25.0

? What do you want to do? …
▸ Create a JavaScript project
  Create a TypeScript project
  Create a TypeScript project (with Viem)
  Create an empty hardhat.config.js
  Quit
```

选择创建 JavaScript 项目（或 TypeScript），向导会自动生成目录和配置，并安装所需依赖。

```text
my-hardhat-app
├── contracts
├── hardhat.config.ts
├── ignition
├── node_modules
├── package-lock.json
├── package.json
├── README.md
├── test
└── tsconfig.json
```

如果选择创建一个空的 `hardhat.config.js`，Hardhat 将创建一个如下所示的 hardhat.config.js：

```js
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};
```

**编译合约**

```bash
npx hardhat compile
```

**测试合约**

> Hardhat 内置本地网络（Hardhat Network）和测试工具：

```bash
npx hardhat test
```

**部署到网络, 配置 hardhat**

:::code-group

```js [hardhat.config.js]
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/<API_KEY>",
      accounts: ["0x私钥"]
    }
  }
};
```

:::

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**使用插件**

> `@nomicfoundation/hardhat-toolbox` 就是 Hardhat 官方出的一站式开发插件集合，它帮你一次性装好并配置好常用的 Hardhat
> 插件和工具，让你开箱即用。

安装它 ≈ 同时安装并集成以下功能：

1. `ethers.js` 集成
2. Hardhat Chai Matchers: 扩展 Chai 断言，支持合约相关的断言
3. Hardhat Network Helpers: 快速控制本地链时间、区块、高度等
4. 合约验证
5. 测试工具（Mocha + Chai）默认集成

```js
import "@nomicfoundation/hardhat-toolbox";

export default {
  solidity: "0.8.28",
};
```

**TypeScript 配置**

我们需要对您的配置进行一次更改才能使其与 TypeScript 一起使用：您必须使用 `import/export` 而不是 `require/module.exports`。

:::code-group

```js [javascript]
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};
```

```ts [typescript]
import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;
```

:::

## Hardhat 命令行简写

Hardhat 官方提供了一个 命令行简写工具 `hardhat-shorthand`，它有两个作用：

- 提供全局命令 hh，等价于 npx hardhat（命令更短）
- 支持 命令行自动补全（autocomplete）

:::code-group

```bash [全局安装]
npm install --global hardhat-shorthand
```

:::

```bash
# 等价 => npx hardhat compile
hh compile
```

## 进阶

### HRE

> HRE（Hardhat Runtime Environment）是 Hardhat 在运行任务、测试或脚本时提供的核心对象，几乎可以理解为“Hardhat 本身”。

```js
const hardhat = require("hardhat")
```

**HRE 实例:**

- 在初始化时，Hardhat 会将配置文件中的任务（tasks）、配置（configs）、插件（plugins） 加入 HRE。
- HRE 的作用是统一协调 Hardhat 内部所有组件，插件也可以向 HRE 注入功能，任何地方都能访问。

**HRE 的使用方式:**

1. HRE 提供默认访问:任务运行器、配置系统、EIP-1193 兼容的 Ethereum Provider。
2. 扩展 HRE:

HRE 提供的只是核心功能，直接操作 Ethereum 有时不够方便。

可以通过 HRE extender 向 HRE 注入功能，保证全局可用：

```js
// 新功能在所有任务、测试、脚本中可用
extendEnvironment((hre) => {
  const Web3 = require("web3");
  hre.Web3 = Web3;
  hre.web3 = new Web3(hre.network.provider); // provider 是 EIP1193 兼容的
});
```

### Solidity 版本控制

Hardhat 支持使用不同、不兼容版本的 solc 的项目。例如，如果您有一个项目，其中某些文件使用 Solidity 0.5，而其他文件使用
0.6，则可以将 Hardhat 配置为使用与这些文件兼容的编译器版本，如下所示：

```js
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.5",
      },
      {
        version: "0.6.7",
        settings: {},
      },
    ],
  },
};
```

一个文件可能会使用多个配置的编译器进行编译，例如具有 `pragma solidity >=0.5.0` 的文件。在这种情况下，将使用具有最高版本的兼容编译器（本例中为
0.6.7）。如果您不希望这种情况发生，您可以**使用重写为每个文件指定**应使用哪个编译器：

```js
module.exports = {
  solidity: {
    compilers: [...],
    overrides: {
      "contracts/Foo.sol": {
        version: "0.5.5",
        settings: {}
      }
    }
  }
}
```

### 使用 Hardhat 编写脚本

Hardhat 允许你编写自定义脚本，并可以访问 Hardhat Runtime Environment（HRE） 的所有功能。

**通过 Hardhat CLI 运行脚本**

脚本中可以直接使用 HRE 的属性作为全局变量。

必须通过 Hardhat 运行：

```bash
npx hardhat run scripts/script.js
```

**独立脚本：将 Hardhat 当作库使用**

Hardhat 可以作为库使用，更灵活地创建独立的 CLI 工具。

```js
const hre = require("hardhat");
```

```bash
node scripts/script.js
```

:::code-group

```js [独立脚步示例]
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// node scripts/accounts.js 运行
```

```text [CLI脚步 VS 独立脚步]
                       ┌─────────────────────────────┐
                       │      Hardhat 项目目录         │
                       │  contracts/ scripts/ test/  │
                       └─────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
      ┌─────────────────────┐                  ┌─────────────────────┐
      │  CLI 脚本            │                  │ 独立脚本             │
      │ (npx hardhat run)   │                  │ (node scripts/*.js) │
      └─────────┬───────────┘                  └─────────┬───────────┘
                │                                        │
                ▼                                        ▼
  ┌─────────────────────────────┐          ┌─────────────────────────────┐
  │ HRE 注入全局变量              │          │ 显式导入 HRE                  │
  │ 可直接访问 ethers、network等   │          │ const hre = require("hardhat") │
  └─────────┬───────────────────┘          └─────────┬───────────────────┘
            │                                           │
            ▼                                           ▼
 ┌───────────────────────────┐            ┌───────────────────────────┐
 │ 运行方式：                  │            |  运行方式：                 |
 │ npx hardhat run script.js │            │ node scripts/script.js    │
 └─────────┬─────────────────┘            └─────────┬─────────────────┘
           │                                          │
           ▼                                          ▼
┌───────────────────────────────┐     ┌───────────────────────────────┐
│ 优点：                         │     │ 优点：                         │
│ - 简单，快速                    │     │ - 灵活，独立运行                │
│ - 适合迁移 CLI 脚本             │     │ - 可直接用 Node、Mocha 测试      │
└───────────────────────────────┘     └───────────────────────────────┘
```

:::

> [!INFO] 推荐
> 尽管 Hardhat CLI 运行时, Hardhat CLI 自动注入全局变量, 但应对编辑器/编译器类型检查，还是简易显式导入（推荐，类型安全）

## 插件

### @nomicfoundation/hardhat-toolbox

- Hardhat 官方推荐的全功能插件包。
- 集成了：`ethers.js`、`waffle/chai` 测试匹配器、`viem`、`hardhat-verify` 等常用工具。
- 作用：开箱即用，快速搭建 Solidity 开发、测试、部署环境。

### @nomicfoundation/hardhat-toolbox-viem

- 专门集成了 `Viem` 以替代或补充 `ethers.js` 功能。
- 提供 Viem 的工具函数、类型支持和 HRE 集成。
- 适合需要在 Hardhat 项目中使用 `Viem` 而非 ethers.js 的开发者。

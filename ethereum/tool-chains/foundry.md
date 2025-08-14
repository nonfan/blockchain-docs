# Foundry

> [Foundry](https://getfoundry.sh/) 是一个用 Rust 编写的以太坊开发工具链，特点是超快、命令行驱动、原生支持
> Solidity。它的定位也是智能合约的**编译、测试、部署、交互**一体化工具，但它相比 Hardhat **更轻量、运行速度更快**。

它包含三个核心命令：

- `forge`：合约开发与测试
- `cast`：链上数据查询与交互
- `anvil`：本地以太坊节点

## 快速入门

### 安装

:::code-group

```bash [MacOS]
curl -L https://foundry.paradigm.xyz | bash

source ~/.zshenv
```

:::

然后执行：`foundryup` 命令会下载 `forge`、`cast` 和 `anvil`。

**验证安装**

```bash
forge --version
cast --version
anvil --version
```

### 手动安装

> 因为防火墙原因启用 `foundryup` 命令无法下载三个核心命令，只能手动拉去GitHub仓库下载。

- 打开 https://github.com/foundry-rs/foundry/releases/latest 下载对应 CPU 架构的压缩包：

- 解压到 `~/.foundry/bin`：

```bash
mkdir -p ~/.foundry/bin
tar -xzf foundry_stable_darwin_arm64.tar.gz -C ~/.foundry/bin
```

- 确保 PATH 有 `~/.foundry/bin`：

```bash
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.zshenv
source ~/.zshenv
```

- 验证安装

```bash
forge --version
cast --version
anvil --version
```

### 初始化项目

```bash
mkdir my-foundry-project && cd my-foundry-project
forge init
```

```text
my-foundry-project
├── foundry.lock
├── foundry.toml
├── lib
│   └── forge-std
├── README.md
├── script
│   └── Counter.s.sol
├── src
│   └── Counter.sol
└── test
    └── Counter.t.sol
```

### 编译

```bash
forge build
```

### 部署

配置环境变量创建 `.env` 文件。

:::code-group

```dotenv [.env]
MNEMONIC="test test test test test test test test test test test junk"
RPC_URL="https://testnet-rpc.monad.xyz"
```

:::

**运行部署命令：**

```bash
# 加载环境变量到当前终端
source .env

forge script script/DeployB3TR.s.sol --rpc-url $RPC_URL --broadcast --mnemonics $MNEMONICS
```
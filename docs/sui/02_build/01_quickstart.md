# 快速入门

> [从零开始搭建 Sui 开发环境并创建第一个应用](https://docs-zh.sui-book.com/guides/developer/getting-started)


## 开发环境搭建

### 系统要求

- **操作系统**：macOS、Linux 或 Windows (WSL2)
- **内存**：至少 8GB RAM
- **磁盘空间**：至少 10GB 可用空间

### 安装 Sui CLI

:::code-group

```bash [macOS (Intel)]
# 下载并安装
curl -fsSL https://github.com/MystenLabs/sui/releases/download/mainnet-v1.14.0/sui-mainnet-v1.14.0-macos-x86_64.tgz | tar -xz

# 移动到系统路径
sudo mv sui /usr/local/bin/

# 验证安装
sui --version
```

```bash [macOS (Apple Silicon)]
# 下载并安装
curl -fsSL https://github.com/MystenLabs/sui/releases/download/mainnet-v1.14.0/sui-mainnet-v1.14.0-macos-arm64.tgz | tar -xz

# 移动到系统路径
sudo mv sui /usr/local/bin/

# 验证安装
sui --version
```

```bash [Linux]
# 下载并安装
curl -fsSL https://github.com/MystenLabs/sui/releases/download/mainnet-v1.14.0/sui-mainnet-v1.14.0-ubuntu-x86_64.tgz | tar -xz

# 移动到系统路径
sudo mv sui /usr/local/bin/

# 验证安装
sui --version
```

```bash [Chocolately]
# Window包管理器安装：管理员权限运行 PowerShell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 管理员权限运行 PowerShell:安装 Sui
choco install sui

# 验证安装
sui --version
```

```bash [Cargo]
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 使用 Cargo 安装 Sui
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui

# 验证安装
sui --version
```

:::

### 安装开发工具

```bash
# 安装 Node.js 和 npm（如果还没有）
# macOS
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

## 钱包管理

### 创建新钱包

```bash
# 创建新地址
sui client new-address ed25519

# 输出示例：
# Created new keypair and saved it to keystore.
# Address: 0x1234567890abcdef...
```

**密钥算法选项：**
- `ed25519` - 推荐，最常用
- `secp256k1` - 与以太坊兼容
- `secp256r1` - 企业级应用

### 查看钱包信息

```bash
# 查看当前活跃地址
sui client active-address

# 查看所有地址
sui client addresses

# 切换活跃地址
sui client switch --address 0x1234...

# 查看活跃环境
sui client active-env

# 切换网络（devnet, testnet, mainnet）
sui client switch --env devnet
```

### 获取测试币

```bash
# 从水龙头获取测试币（仅 devnet 和 testnet）
# https://faucet.sui.io/?address=钱包地址
sui client faucet

# 查看余额
sui client gas

# 输出示例：
# ╭────────────────────────────────────────────────────────────────────┬────────────╮
# │ gasCoinId                                                           │ gasBalance │
# ├────────────────────────────────────────────────────────────────────┼────────────┤
# │ 0x1234567890abcdef...                                              │ 1000000000 │
# ╰────────────────────────────────────────────────────────────────────┴────────────╯
```

## 创建第一个项目

### 初始化项目

```bash
# 创建新项目
sui move new hello_sui

# 进入项目目录
cd hello_sui

# 项目结构
# hello_sui/
# ├── Move.toml          # 项目配置
# └── sources/
#     └── hello.move     # 源代码（需要创建）
```

### Hello World 示例

创建 `sources/hello.move` 文件：

```move
module hello_sui::hello {
    use std::string;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Hello World 对象
    public struct HelloWorld has key {
        id: UID,
        message: string::String
    }

    /// 创建 HelloWorld 对象
    public entry fun create(ctx: &mut TxContext) {
        let hello = HelloWorld {
            id: object::new(ctx),
            message: string::utf8(b"Hello, Sui!")
        };

        // 转移给调用者
        transfer::transfer(hello, tx_context::sender(ctx));
    }

    /// 更新消息
    public entry fun update_message(
        hello: &mut HelloWorld,
        new_message: vector<u8>
    ) {
        hello.message = string::utf8(new_message);
    }

    /// 获取消息（查询函数）
    public fun get_message(hello: &HelloWorld): string::String {
        hello.message
    }
}
```

### 配置 Move.toml

编辑 `Move.toml` 文件：

```toml
[package]
name = "hello_sui"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet" }

[addresses]
hello_sui = "0x0"
```

### 编译项目

```bash
# 编译
sui move build

# 输出示例：
# UPDATING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
# INCLUDING DEPENDENCY Sui
# BUILDING hello_sui
# Success

# 查看编译产物
ls build/hello_sui/bytecode_modules/
```

### 测试项目

创建测试文件 `sources/hello_tests.move`：

```move
#[test_only]
module hello_sui::hello_tests {
    use hello_sui::hello;
    use sui::test_scenario;
    use std::string;

    #[test]
    fun test_create() {
        let user = @0xA;
        let mut scenario = test_scenario::begin(user);

        // 创建 HelloWorld
        {
            let ctx = test_scenario::ctx(&mut scenario);
            hello::create(ctx);
        };

        // 验证对象创建
        test_scenario::next_tx(&mut scenario, user);
        {
            let hello_world = test_scenario::take_from_sender<hello::HelloWorld>(&scenario);
            let message = hello::get_message(&hello_world);

            assert!(message == string::utf8(b"Hello, Sui!"), 0);

            test_scenario::return_to_sender(&scenario, hello_world);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_message() {
        let user = @0xA;
        let mut scenario = test_scenario::begin(user);

        // 创建对象
        {
            let ctx = test_scenario::ctx(&mut scenario);
            hello::create(ctx);
        };

        // 更新消息
        test_scenario::next_tx(&mut scenario, user);
        {
            let mut hello_world = test_scenario::take_from_sender<hello::HelloWorld>(&scenario);

            hello::update_message(&mut hello_world, b"Hello, Move!");

            let message = hello::get_message(&hello_world);
            assert!(message == string::utf8(b"Hello, Move!"), 0);

            test_scenario::return_to_sender(&scenario, hello_world);
        };

        test_scenario::end(scenario);
    }
}
```

运行测试：

```bash
# 运行所有测试
sui move test

# 输出示例：
# BUILDING hello_sui
# Running Move unit tests
# [ PASS    ] hello_sui::hello_tests::test_create
# [ PASS    ] hello_sui::hello_tests::test_update_message
# Test result: OK. Total tests: 2; passed: 2; failed: 0

# 运行特定测试
sui move test test_create

# 显示详细输出
sui move test --verbose

# 生成代码覆盖率
sui move test --coverage
```

### 部署项目

```bash
# 部署到 devnet
sui client publish --gas-budget 100000000

# 输出示例：
# UPDATING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
# INCLUDING DEPENDENCY Sui
# BUILDING hello_sui
# Successfully verified dependencies on-chain against source.
# Transaction Digest: ABC123...
#
# ╭──────────────────────────────────────────────────────────────────────╮
# │ Object Changes                                                        │
# ├──────────────────────────────────────────────────────────────────────┤
# │ Created Objects:                                                      │
# │  ┌──                                                                  │
# │  │ PackageID: 0xabcd1234...                                          │
# │  └──                                                                  │
# ╰──────────────────────────────────────────────────────────────────────╯

# 保存 Package ID 以便后续调用
export PACKAGE_ID=0xabcd1234...
```

### 调用函数

```bash
# 调用 create 函数
sui client call \
  --package $PACKAGE_ID \
  --module hello \
  --function create \
  --gas-budget 10000000

# 输出会显示创建的对象 ID
# 保存对象 ID
export OBJECT_ID=0x5678abcd...

# 调用 update_message 函数
sui client call \
  --package $PACKAGE_ID \
  --module hello \
  --function update_message \
  --args $OBJECT_ID "Hello, Blockchain!" \
  --gas-budget 10000000
```

## Sui CLI 常用命令

### 客户端命令

```bash
# ========== 账户管理 ==========
# 创建新地址
sui client new-address ed25519

# 查看活跃地址
sui client active-address

# 查看所有地址
sui client addresses

# 切换地址
sui client switch --address 0x1234...

# 导入私钥
sui keytool import "private_key" ed25519

# 导出私钥
sui keytool export --key-identity 0x1234...

# ========== 网络管理 ==========
# 查看当前网络
sui client active-env

# 切换网络
sui client switch --env devnet    # devnet
sui client switch --env testnet   # testnet
sui client switch --env mainnet   # mainnet

# 添加自定义 RPC
sui client new-env --alias custom --rpc https://your-rpc-url

# ========== Gas 管理 ==========
# 查看 Gas 币
sui client gas

# 获取测试币
sui client faucet

# 合并 Gas 币
sui client merge-coin --primary-coin 0x123 --coin-to-merge 0x456 --gas-budget 1000000

# 拆分 Gas 币
sui client split-coin --coin-id 0x123 --amounts 1000000000 --gas-budget 1000000

# ========== 对象查询 ==========
# 查看拥有的对象
sui client objects

# 查看对象详情
sui client object 0x1234...

# 查看动态字段
sui client dynamic-field 0x1234...

# ========== 交易相关 ==========
# 查询你钱包的代币ID
sui client gas
╭────────────────────────────────────────────────────────────────────┬────────────────────┬──────────────────╮
│ gasCoinId                                                          │ mistBalance (MIST) │ suiBalance (SUI) │
├────────────────────────────────────────────────────────────────────┼────────────────────┼──────────────────┤
│ 0x9882571c340abec7c1a2b788e3cb42c9f8a351fb482a3240503bc7a45e92e4a7 │ 100000000          │ 0.10             │
╰────────────────────────────────────────────────────────────────────┴────────────────────┴──────────────────╯
# 转账
sui client transfer-sui --to 0xrecipient... --amount 100000000 --gas-budget 100000000 --sui-coin-object-id gasCoinId

# 转账对象
sui client transfer \
  --to 0xrecipient... \
  --object-id 0x1234... \
  --gas-budget 10000000

# 查看交易
sui client transaction-block 0xdigest...
```

### Move 命令

```bash
# ========== 项目管理 ==========
# 创建新项目
sui move new project_name

# 编译项目
sui move build

# 测试项目
sui move test
sui move test --coverage              # 生成覆盖率
sui move test test_name               # 运行特定测试
sui move test --verbose               # 详细输出

# ========== 部署相关 ==========
# 发布包
sui client publish --gas-budget 100000000

# 升级包（需要 UpgradeCap）
sui client upgrade \
  --upgrade-capability 0xcap_id... \
  --gas-budget 100000000

# ========== 调用函数 ==========
# 调用函数
sui client call \
  --package 0xpackage... \
  --module module_name \
  --function function_name \
  --args arg1 arg2 \
  --gas-budget 10000000

# 传递对象参数
sui client call \
  --package 0xpackage... \
  --module module_name \
  --function function_name \
  --args 0xobject_id... \
  --gas-budget 10000000
```

### 查询和调试

```bash
# 查看链上事件
sui client events --package 0xpackage...

# 查看包信息
sui client object --json 0xpackage... | jq

# 验证包
sui client verify-source

# 查看协议配置
sui client protocol-config

# 查看验证器信息
sui client validators
```
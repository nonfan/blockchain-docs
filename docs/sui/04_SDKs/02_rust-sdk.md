# Rust SDK

> 使用 Rust 构建高性能 Sui 应用的完整指南

> [!IMPORTANT] 本节重点
> 1. 如何安装和配置 Sui Rust SDK？
> 2. 如何连接到 Sui 网络？
> 3. 如何创建和管理密钥对？
> 4. 如何查询链上数据？
> 5. 如何构建和执行交易？
> 6. 如何处理类型和 BCS 编码？

## SDK 概述

**sui-sdk** 是 Sui 官方提供的 Rust SDK，提供了完整的功能来：

- 🔗 连接到 Sui 网络
- 🔑 管理密钥对和地址
- 📊 查询链上数据
- 🚀 构建和发送交易
- 🎯 调用智能合约
- ⚡ 高性能异步操作
- 🛡️ 类型安全的 API

## 安装和配置

### 环境要求

- **Rust**: >= 1.70.0
- **Cargo**: 最新版本

### 安装 Rust

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

### 添加依赖

在 `Cargo.toml` 中添加：

```toml
[dependencies]
sui-sdk = "0.54"  # 使用最新版本
tokio = { version = "1.35", features = ["full"] }
anyhow = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## 快速开始

### 创建项目

```bash
# 创建新项目
cargo new sui-app
cd sui-app

# 添加依赖
cargo add sui-sdk tokio anyhow serde serde_json
```

### 基础示例

创建 `src/main.rs`：

```rust
use sui_sdk::SuiClientBuilder;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // 连接到 Sui devnet
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    println!("Sui SDK 版本: {}", sui.api_version());

    // 查询链信息
    let chain_id = sui.read_api().get_chain_identifier().await?;
    println!("链 ID: {}", chain_id);

    Ok(())
}
```

运行：

```bash
cargo run
```

## 连接到 Sui 网络

### 创建客户端

```rust
use sui_sdk::SuiClientBuilder;

#[tokio::main]
async fn main() -> Result<()> {
    // 连接到 devnet
    let sui_devnet = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    // 连接到 testnet
    let sui_testnet = SuiClientBuilder::default()
        .build("https://fullnode.testnet.sui.io:443")
        .await?;

    // 连接到 mainnet
    let sui_mainnet = SuiClientBuilder::default()
        .build("https://fullnode.mainnet.sui.io:443")
        .await?;

    // 连接到自定义 RPC
    let sui_custom = SuiClientBuilder::default()
        .build("https://your-custom-rpc-url")
        .await?;

    Ok(())
}
```

### 配置客户端

```rust
use sui_sdk::SuiClientBuilder;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .request_timeout(Duration::from_secs(30))
        .max_concurrent_requests(100)
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    Ok(())
}
```

## 密钥对管理

### 创建新密钥对

```rust
use sui_sdk::types::crypto::{
    Ed25519SuiSignature,
    Signature,
    SuiKeyPair
};
use sui_keys::keystore::{AccountKeystore, Keystore, FileBasedKeystore};

// 生成 Ed25519 密钥对
fn generate_keypair() -> SuiKeyPair {
    SuiKeyPair::Ed25519(sui_keys::keypair::Ed25519KeyPair::generate(&mut rand::thread_rng()))
}

// 获取地址
fn get_address(keypair: &SuiKeyPair) -> sui_types::base_types::SuiAddress {
    keypair.public().into()
}

#[tokio::main]
async fn main() -> Result<()> {
    let keypair = generate_keypair();
    let address = get_address(&keypair);

    println!("地址: {}", address);

    Ok(())
}
```

### 从私钥导入

```rust
use sui_keys::keypair::SuiKeyPair;
use std::str::FromStr;

fn import_keypair(private_key_base64: &str) -> Result<SuiKeyPair> {
    let keypair = SuiKeyPair::decode_base64(private_key_base64)?;
    Ok(keypair)
}

#[tokio::main]
async fn main() -> Result<()> {
    let private_key = "your_base64_private_key";
    let keypair = import_keypair(private_key)?;
    let address = keypair.public().into();

    println!("导入的地址: {}", address);

    Ok(())
}
```

### 使用 Keystore

```rust
use sui_keys::keystore::{AccountKeystore, FileBasedKeystore};
use sui_types::crypto::SuiKeyPair;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<()> {
    // 创建 keystore
    let keystore_path = PathBuf::from("~/.sui/sui_config/sui.keystore");
    let mut keystore = FileBasedKeystore::new(&keystore_path)?;

    // 生成新密钥
    let address = keystore.generate_and_add_new_key(
        sui_types::crypto::SignatureScheme::ED25519,
        None,
        None,
        None,
    )?;

    println!("新地址: {}", address);

    // 获取所有地址
    let addresses = keystore.addresses();
    println!("所有地址: {:?}", addresses);

    // 获取密钥对
    let keypair = keystore.get_key(&address)?;

    Ok(())
}
```

## 查询链上数据

### 查询余额

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::SuiAddress;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let address = SuiAddress::from_str("0x...")?;

    // 查询 SUI 余额
    let balance = sui
        .coin_read_api()
        .get_balance(address, None)
        .await?;

    println!("总余额: {}", balance.total_balance);
    println!("币种: {}", balance.coin_type);
    println!("对象数量: {}", balance.coin_object_count);

    Ok(())
}
```

### 查询所有代币余额

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::SuiAddress;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let address = SuiAddress::from_str("0x...")?;

    // 查询所有余额
    let balances = sui
        .coin_read_api()
        .get_all_balances(address)
        .await?;

    for balance in balances {
        println!("币种: {}", balance.coin_type);
        println!("余额: {}", balance.total_balance);
        println!("---");
    }

    Ok(())
}
```

### 查询拥有的对象

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::SuiAddress;
use sui_sdk::rpc_types::SuiObjectDataOptions;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let address = SuiAddress::from_str("0x...")?;

    // 查询所有对象
    let objects = sui
        .read_api()
        .get_owned_objects(
            address,
            Some(SuiObjectDataOptions {
                show_type: true,
                show_owner: true,
                show_previous_transaction: true,
                show_display: false,
                show_content: true,
                show_bcs: false,
                show_storage_rebate: true,
            }),
            None,
            None,
        )
        .await?;

    for obj in objects.data {
        if let Some(data) = obj.data {
            println!("对象 ID: {}", data.object_id);
            println!("版本: {}", data.version);
            println!("类型: {:?}", data.type_);
            println!("---");
        }
    }

    Ok(())
}
```

### 查询对象详情

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::ObjectID;
use sui_sdk::rpc_types::SuiObjectDataOptions;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let object_id = ObjectID::from_str("0x...")?;

    // 查询对象
    let object = sui
        .read_api()
        .get_object_with_options(
            object_id,
            SuiObjectDataOptions::full_content(),
        )
        .await?;

    println!("对象数据: {:#?}", object.data);

    Ok(())
}
```

### 查询交易

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::digests::TransactionDigest;
use sui_sdk::rpc_types::SuiTransactionBlockResponseOptions;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let digest = TransactionDigest::from_str("your_tx_digest")?;

    // 查询交易详情
    let tx = sui
        .read_api()
        .get_transaction_with_options(
            digest,
            SuiTransactionBlockResponseOptions {
                show_input: true,
                show_effects: true,
                show_events: true,
                show_object_changes: true,
                show_balance_changes: true,
                show_raw_input: false,
            },
        )
        .await?;

    println!("交易详情: {:#?}", tx);

    Ok(())
}
```

### 查询事件

```rust
use sui_sdk::SuiClientBuilder;
use sui_sdk::rpc_types::{EventFilter, EventPage};
use sui_types::base_types::ObjectID;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let package_id = ObjectID::from_str("0x...")?;

    // 查询包的事件
    let events = sui
        .event_api()
        .query_events(
            EventFilter::Package(package_id),
            None,  // cursor
            Some(10),  // limit
            false,  // descending
        )
        .await?;

    for event in events.data {
        println!("事件 ID: {:?}", event.id);
        println!("类型: {}", event.type_);
        println!("发送者: {}", event.sender);
        println!("数据: {:?}", event.parsed_json);
        println!("---");
    }

    Ok(())
}
```

## 构建和执行交易

### 基础转账

```rust
use sui_sdk::SuiClientBuilder;
use sui_sdk::types::transaction::{TransactionData, Transaction};
use sui_types::base_types::{SuiAddress, ObjectID};
use sui_keys::keypair::SuiKeyPair;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let sender = SuiAddress::from_str("0x...")?;
    let recipient = SuiAddress::from_str("0x...")?;
    let amount = 1_000_000_000u64;  // 1 SUI

    // 获取 gas 对象
    let gas_coins = sui
        .coin_read_api()
        .get_coins(sender, None, None, None)
        .await?;

    let gas_object_id = gas_coins.data[0].coin_object_id;
    let gas_budget = 5_000_000u64;

    // 构建交易
    let tx_data = sui
        .transaction_builder()
        .transfer_sui(sender, gas_object_id, gas_budget, recipient, Some(amount))
        .await?;

    // 签名（需要 keypair）
    let keypair = SuiKeyPair::Ed25519(/* your keypair */);
    let signature = keypair.sign(&tx_data.digest());

    // 执行交易
    let tx_response = sui
        .quorum_driver_api()
        .execute_transaction_block(
            Transaction::from_data(tx_data, vec![signature]),
            sui_sdk::rpc_types::SuiTransactionBlockResponseOptions::full_content(),
            Some(sui_sdk::types::quorum_driver_types::ExecuteTransactionRequestType::WaitForLocalExecution),
        )
        .await?;

    println!("交易摘要: {}", tx_response.digest);
    println!("状态: {:?}", tx_response.effects);

    Ok(())
}
```

### 转移对象

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::{SuiAddress, ObjectID, ObjectRef};

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let sender = SuiAddress::from_str("0x...")?;
    let recipient = SuiAddress::from_str("0x...")?;
    let object_id = ObjectID::from_str("0x...")?;

    // 获取对象引用
    let object = sui
        .read_api()
        .get_object_with_options(
            object_id,
            sui_sdk::rpc_types::SuiObjectDataOptions::default(),
        )
        .await?;

    let object_ref = object.data.unwrap().object_ref();

    // 获取 gas
    let gas_coins = sui
        .coin_read_api()
        .get_coins(sender, None, None, None)
        .await?;

    let gas_object_id = gas_coins.data[0].coin_object_id;
    let gas_budget = 5_000_000u64;

    // 构建转移交易
    let tx_data = sui
        .transaction_builder()
        .transfer_object(sender, object_ref, gas_object_id, gas_budget, recipient)
        .await?;

    // 签名并执行...

    Ok(())
}
```

### 调用智能合约

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::{SuiAddress, ObjectID, ObjectArg};
use sui_sdk::rpc_types::SuiTypeTag;
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let sender = SuiAddress::from_str("0x...")?;
    let package_id = ObjectID::from_str("0x...")?;
    let module = "my_module";
    let function = "my_function";

    // 获取 gas
    let gas_coins = sui
        .coin_read_api()
        .get_coins(sender, None, None, None)
        .await?;

    let gas_object_id = gas_coins.data[0].coin_object_id;
    let gas_budget = 10_000_000u64;

    // 准备参数
    let object_arg = ObjectID::from_str("0x...")?;

    // 构建 Move 调用
    let tx_data = sui
        .transaction_builder()
        .move_call(
            sender,
            package_id,
            module,
            function,
            vec![],  // 类型参数
            vec![
                sui_json::SuiJsonValue::from_str("100")?,  // 普通参数
                sui_json::SuiJsonValue::from_object_id(object_arg),  // 对象参数
            ],
            Some(gas_object_id),
            gas_budget,
            None,
        )
        .await?;

    // 签名并执行...

    Ok(())
}
```

### 批量操作

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::transaction::TransactionKind;
use sui_sdk::transaction_builder::TransactionBuilder;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let sender = SuiAddress::from_str("0x...")?;

    // 批量转账
    let recipients = vec![
        (SuiAddress::from_str("0x...")?, 1_000_000_000u64),
        (SuiAddress::from_str("0x...")?, 2_000_000_000u64),
        (SuiAddress::from_str("0x...")?, 3_000_000_000u64),
    ];

    // 获取 gas
    let gas_coins = sui
        .coin_read_api()
        .get_coins(sender, None, None, None)
        .await?;

    let gas_object_id = gas_coins.data[0].coin_object_id;
    let gas_budget = 20_000_000u64;

    // 构建批量转账交易
    let tx_data = sui
        .transaction_builder()
        .batch_transaction(
            sender,
            recipients.iter().map(|(addr, amount)| {
                // 构建单个转账操作
                // 需要手动构建 TransactionKind
            }).collect(),
            gas_object_id,
            gas_budget,
        )
        .await?;

    Ok(())
}
```

### 赞助交易（Sponsored Transaction）

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::SuiAddress;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await?;

    let sender = SuiAddress::from_str("0x...")?;
    let sponsor = SuiAddress::from_str("0x...")?;  // Gas 赞助者
    let recipient = SuiAddress::from_str("0x...")?;

    // 获取赞助者的 gas
    let sponsor_gas = sui
        .coin_read_api()
        .get_coins(sponsor, None, None, None)
        .await?;

    let gas_object_id = sponsor_gas.data[0].coin_object_id;
    let gas_budget = 5_000_000u64;

    // 构建交易（使用赞助者的 gas）
    let tx_data = sui
        .transaction_builder()
        .transfer_sui(sender, gas_object_id, gas_budget, recipient, Some(1_000_000_000))
        .await?;

    // 需要两个签名：
    // 1. 发送者签名
    // 2. 赞助者签名

    Ok(())
}
```

## 订阅事件

### 订阅交易

```rust
use sui_sdk::SuiClientBuilder;
use sui_sdk::rpc_types::SuiTransactionBlockResponseOptions;
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("wss://fullnode.devnet.sui.io:443")  // 使用 WebSocket
        .await?;

    // 订阅交易
    let mut subscribe_tx = sui
        .read_api()
        .subscribe_transaction(
            SuiTransactionBlockResponseOptions::full_content()
        )
        .await?;

    println!("开始监听交易...");

    while let Some(tx) = subscribe_tx.next().await {
        match tx {
            Ok(transaction) => {
                println!("新交易: {}", transaction.digest);
                println!("发送者: {:?}", transaction.transaction);
            }
            Err(e) => {
                eprintln!("错误: {}", e);
            }
        }
    }

    Ok(())
}
```

### 订阅事件

```rust
use sui_sdk::SuiClientBuilder;
use sui_sdk::rpc_types::EventFilter;
use sui_types::base_types::ObjectID;
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("wss://fullnode.devnet.sui.io:443")
        .await?;

    let package_id = ObjectID::from_str("0x...")?;

    // 订阅包事件
    let mut subscribe_event = sui
        .event_api()
        .subscribe_event(EventFilter::Package(package_id))
        .await?;

    println!("开始监听事件...");

    while let Some(event) = subscribe_event.next().await {
        match event {
            Ok(sui_event) => {
                println!("事件类型: {}", sui_event.type_);
                println!("发送者: {}", sui_event.sender);
                println!("数据: {:?}", sui_event.parsed_json);
                println!("---");
            }
            Err(e) => {
                eprintln!("错误: {}", e);
            }
        }
    }

    Ok(())
}
```

## BCS 编码和解码

### BCS 序列化

```rust
use sui_types::base_types::{SuiAddress, ObjectID};
use bcs;

#[derive(serde::Serialize, serde::Deserialize)]
struct MyData {
    value: u64,
    address: SuiAddress,
    object_id: ObjectID,
}

fn serialize_bcs() -> Result<Vec<u8>> {
    let data = MyData {
        value: 100,
        address: SuiAddress::from_str("0x...")?,
        object_id: ObjectID::from_str("0x...")?,
    };

    let bytes = bcs::to_bytes(&data)?;
    println!("BCS 编码: {:?}", bytes);

    Ok(bytes)
}

fn deserialize_bcs(bytes: &[u8]) -> Result<MyData> {
    let data: MyData = bcs::from_bytes(bytes)?;
    println!("解码后的值: {}", data.value);

    Ok(data)
}
```

### 类型标签

```rust
use sui_sdk::rpc_types::SuiTypeTag;
use std::str::FromStr;

fn parse_type_tags() -> Result<()> {
    // 解析类型标签
    let type_tag = SuiTypeTag::from_str("0x2::sui::SUI")?;
    println!("类型标签: {:?}", type_tag);

    // 泛型类型
    let generic_type = SuiTypeTag::from_str("0x2::coin::Coin<0x2::sui::SUI>")?;
    println!("泛型类型: {:?}", generic_type);

    Ok(())
}
```

## 实用工具

### 地址格式化

```rust
use sui_types::base_types::SuiAddress;
use std::str::FromStr;

fn address_utils() -> Result<()> {
    // 从字符串解析
    let addr = SuiAddress::from_str("0x2")?;
    println!("标准格式: {}", addr);

    // 转换为字节
    let bytes = addr.to_vec();
    println!("字节: {:?}", bytes);

    // 从字节创建
    let addr_from_bytes = SuiAddress::from_bytes(&bytes)?;

    Ok(())
}
```

### Gas 计算

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::SuiAddress;

async fn estimate_gas(sui: &sui_sdk::SuiClient, sender: SuiAddress) -> Result<u64> {
    // 查询当前参考 gas 价格
    let gas_price = sui.read_api().get_reference_gas_price().await?;

    println!("当前 gas 价格: {}", gas_price);

    Ok(gas_price)
}

// Gas 预算计算
fn calculate_gas_budget(
    computation_cost: u64,
    storage_cost: u64,
    gas_price: u64,
) -> u64 {
    (computation_cost + storage_cost) * gas_price
}
```

### 单位转换

```rust
const MIST_PER_SUI: u64 = 1_000_000_000;

fn mist_to_sui(mist: u64) -> f64 {
    mist as f64 / MIST_PER_SUI as f64
}

fn sui_to_mist(sui: f64) -> u64 {
    (sui * MIST_PER_SUI as f64) as u64
}

fn main() {
    let balance_in_mist = 1_500_000_000u64;
    let balance_in_sui = mist_to_sui(balance_in_mist);

    println!("{} MIST = {} SUI", balance_in_mist, balance_in_sui);

    let amount_in_sui = 2.5;
    let amount_in_mist = sui_to_mist(amount_in_sui);

    println!("{} SUI = {} MIST", amount_in_sui, amount_in_mist);
}
```

## 完整示例

### NFT 管理系统

```rust
use sui_sdk::SuiClientBuilder;
use sui_types::base_types::{SuiAddress, ObjectID};
use sui_keys::keypair::SuiKeyPair;
use anyhow::Result;

struct NFTManager {
    sui: sui_sdk::SuiClient,
    keypair: SuiKeyPair,
    package_id: ObjectID,
}

impl NFTManager {
    async fn new(
        rpc_url: &str,
        keypair: SuiKeyPair,
        package_id: ObjectID,
    ) -> Result<Self> {
        let sui = SuiClientBuilder::default()
            .build(rpc_url)
            .await?;

        Ok(Self {
            sui,
            keypair,
            package_id,
        })
    }

    async fn mint_nft(
        &self,
        name: String,
        description: String,
        image_url: String,
    ) -> Result<ObjectID> {
        let sender: SuiAddress = self.keypair.public().into();

        // 获取 gas
        let gas_coins = self.sui
            .coin_read_api()
            .get_coins(sender, None, None, None)
            .await?;

        let gas_object_id = gas_coins.data[0].coin_object_id;
        let gas_budget = 10_000_000u64;

        // 构建交易
        let tx_data = self.sui
            .transaction_builder()
            .move_call(
                sender,
                self.package_id,
                "nft",
                "mint",
                vec![],
                vec![
                    sui_json::SuiJsonValue::from_str(&format!("\"{}\"", name))?,
                    sui_json::SuiJsonValue::from_str(&format!("\"{}\"", description))?,
                    sui_json::SuiJsonValue::from_str(&format!("\"{}\"", image_url))?,
                ],
                Some(gas_object_id),
                gas_budget,
                None,
            )
            .await?;

        // 签名
        let signature = self.keypair.sign(&tx_data.digest());

        // 执行
        let response = self.sui
            .quorum_driver_api()
            .execute_transaction_block(
                sui_sdk::types::transaction::Transaction::from_data(
                    tx_data,
                    vec![signature],
                ),
                sui_sdk::rpc_types::SuiTransactionBlockResponseOptions {
                    show_object_changes: true,
                    ..Default::default()
                },
                None,
            )
            .await?;

        // 提取创建的 NFT ID
        if let Some(object_changes) = response.object_changes {
            for change in object_changes {
                if let sui_sdk::rpc_types::ObjectChange::Created { object_id, .. } = change {
                    return Ok(object_id);
                }
            }
        }

        Err(anyhow::anyhow!("NFT 创建失败"))
    }

    async fn transfer_nft(
        &self,
        nft_id: ObjectID,
        recipient: SuiAddress,
    ) -> Result<()> {
        let sender: SuiAddress = self.keypair.public().into();

        // 获取 NFT 对象引用
        let nft = self.sui
            .read_api()
            .get_object_with_options(
                nft_id,
                sui_sdk::rpc_types::SuiObjectDataOptions::default(),
            )
            .await?;

        let nft_ref = nft.data.unwrap().object_ref();

        // 获取 gas
        let gas_coins = self.sui
            .coin_read_api()
            .get_coins(sender, None, None, None)
            .await?;

        let gas_object_id = gas_coins.data[0].coin_object_id;
        let gas_budget = 5_000_000u64;

        // 构建转移交易
        let tx_data = self.sui
            .transaction_builder()
            .transfer_object(sender, nft_ref, gas_object_id, gas_budget, recipient)
            .await?;

        // 签名并执行
        let signature = self.keypair.sign(&tx_data.digest());

        self.sui
            .quorum_driver_api()
            .execute_transaction_block(
                sui_sdk::types::transaction::Transaction::from_data(
                    tx_data,
                    vec![signature],
                ),
                sui_sdk::rpc_types::SuiTransactionBlockResponseOptions::default(),
                None,
            )
            .await?;

        Ok(())
    }

    async fn get_user_nfts(&self, address: SuiAddress) -> Result<Vec<ObjectID>> {
        let objects = self.sui
            .read_api()
            .get_owned_objects(
                address,
                Some(sui_sdk::rpc_types::SuiObjectDataOptions {
                    show_type: true,
                    ..Default::default()
                }),
                None,
                None,
            )
            .await?;

        let nft_type = format!("{}::nft::NFT", self.package_id);
        let mut nft_ids = Vec::new();

        for obj in objects.data {
            if let Some(data) = obj.data {
                if let Some(type_) = data.type_ {
                    if type_.to_string().contains(&nft_type) {
                        nft_ids.push(data.object_id);
                    }
                }
            }
        }

        Ok(nft_ids)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化
    let keypair = SuiKeyPair::Ed25519(/* your keypair */);
    let package_id = ObjectID::from_str("0x...")?;

    let nft_manager = NFTManager::new(
        "https://fullnode.devnet.sui.io:443",
        keypair,
        package_id,
    ).await?;

    // Mint NFT
    let nft_id = nft_manager.mint_nft(
        "My NFT".to_string(),
        "This is my first NFT".to_string(),
        "https://example.com/image.png".to_string(),
    ).await?;

    println!("NFT 已创建: {}", nft_id);

    // 查询用户的所有 NFT
    let sender: SuiAddress = nft_manager.keypair.public().into();
    let user_nfts = nft_manager.get_user_nfts(sender).await?;

    println!("用户拥有 {} 个 NFT", user_nfts.len());

    Ok(())
}
```

## 最佳实践

### 1. 错误处理

```rust
use anyhow::{Context, Result};

async fn safe_transaction() -> Result<()> {
    let sui = SuiClientBuilder::default()
        .build("https://fullnode.devnet.sui.io:443")
        .await
        .context("无法连接到 Sui 网络")?;

    let balance = sui
        .coin_read_api()
        .get_balance(sender, None)
        .await
        .context("查询余额失败")?;

    if balance.total_balance < required_amount {
        anyhow::bail!("余额不足");
    }

    Ok(())
}
```

### 2. 异步并发

```rust
use tokio::try_join;

async fn parallel_queries(
    sui: &sui_sdk::SuiClient,
    addresses: Vec<SuiAddress>,
) -> Result<()> {
    // 并发查询多个地址
    let futures = addresses.iter().map(|addr| {
        sui.coin_read_api().get_balance(*addr, None)
    });

    let results = futures::future::try_join_all(futures).await?;

    for (addr, balance) in addresses.iter().zip(results.iter()) {
        println!("{}: {}", addr, balance.total_balance);
    }

    Ok(())
}
```

### 3. 重试机制

```rust
use tokio::time::{sleep, Duration};

async fn retry_transaction<F, T>(
    mut f: F,
    max_retries: u32,
) -> Result<T>
where
    F: FnMut() -> futures::future::BoxFuture<'static, Result<T>>,
{
    let mut attempts = 0;

    loop {
        match f().await {
            Ok(result) => return Ok(result),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                println!("重试 {}/{}...", attempts, max_retries);
                sleep(Duration::from_secs(2u64.pow(attempts))).await;
            }
            Err(e) => return Err(e),
        }
    }
}
```

### 4. 配置管理

```rust
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    network: String,
    private_key: String,
    package_id: String,
}

impl Config {
    fn load(path: &str) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let config = Config::load("config.json")?;

    let sui = SuiClientBuilder::default()
        .build(&config.network)
        .await?;

    Ok(())
}
```

## 常见问题

### Q1: 如何处理大整数？

**A:** 使用 u64 或 u128：

```rust
// Sui 的余额通常使用 u64
let balance: u64 = 1_000_000_000;  // 1 SUI

// 对于更大的数值，使用 u128
let large_value: u128 = 1_000_000_000_000_000_000;
```

### Q2: 如何调试交易失败？

**A:** 查看交易效果：

```rust
let response = sui
    .quorum_driver_api()
    .execute_transaction_block(
        transaction,
        SuiTransactionBlockResponseOptions {
            show_effects: true,
            show_events: true,
            show_object_changes: true,
            show_balance_changes: true,
            ..Default::default()
        },
        None,
    )
    .await?;

if let Some(effects) = response.effects {
    println!("状态: {:?}", effects.status());
    println!("Gas 使用: {:?}", effects.gas_used());
}
```

### Q3: 如何处理并发请求？

**A:** 使用 tokio 的并发工具：

```rust
use tokio::task::JoinSet;

let mut set = JoinSet::new();

for address in addresses {
    let sui_clone = sui.clone();
    set.spawn(async move {
        sui_clone.coin_read_api().get_balance(address, None).await
    });
}

while let Some(result) = set.join_next().await {
    match result {
        Ok(Ok(balance)) => println!("余额: {}", balance.total_balance),
        Ok(Err(e)) => eprintln!("查询错误: {}", e),
        Err(e) => eprintln!("任务错误: {}", e),
    }
}
```

### Q4: 如何优化性能？

**A:** 几个建议：

1. **使用连接池**：重用 `SuiClient` 实例
2. **批量操作**：使用 `multi_get_*` 方法
3. **并发查询**：使用 `tokio::spawn` 或 `join_all`
4. **缓存结果**：缓存不变的数据如包 ID

```rust
// 批量查询对象
let object_ids = vec![/* ... */];
let objects = sui
    .read_api()
    .multi_get_object_with_options(
        object_ids,
        SuiObjectDataOptions::default(),
    )
    .await?;
```

### Q5: 如何管理密钥安全？

**A:** 使用环境变量和加密：

```rust
use std::env;

fn load_keypair() -> Result<SuiKeyPair> {
    let private_key = env::var("SUI_PRIVATE_KEY")
        .expect("未设置 SUI_PRIVATE_KEY 环境变量");

    let keypair = SuiKeyPair::decode_base64(&private_key)?;
    Ok(keypair)
}

// 使用
// export SUI_PRIVATE_KEY="your_base64_key"
```

## 参考资源

- [Sui Rust SDK 官方文档](https://docs.sui.io/build/rust-sdk)
- [API 文档](https://docs.rs/sui-sdk/)
- [GitHub 仓库](https://github.com/MystenLabs/sui/tree/main/crates/sui-sdk)
- [示例代码](https://github.com/MystenLabs/sui/tree/main/crates/sui-sdk/examples)
- [Rust Book](https://doc.rust-lang.org/book/)

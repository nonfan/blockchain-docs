# 存储与所有权

> Sui 的数据存储机制和高级所有权模式

> [!IMPORTANT] 本节重点
> 1. 动态字段和动态对象字段有什么区别？
> 2. Table、Bag 等集合类型如何使用？
> 3. 对象包装和 UID 包装有何不同？
> 4. 如何优化存储成本？
> 5. 转移机制和所有权管理最佳实践？

## 存储模型概述

Sui 的存储模型与传统区块链不同，采用**对象存储**而非全局状态树。

### 存储类型对比

```
传统区块链（以太坊）:
Contract Storage:
  mapping(address => uint) balances;
  mapping(uint => Item) items;

Sui:
Object 1: { id: 0x123, owner: Alice, balance: 100 }
Object 2: { id: 0x456, owner: Bob, balance: 50 }
Object 3: { id: 0x789, type: Item, data: ... }
```

**优势：**
- ✅ 并行访问（不同对象可并行处理）
- ✅ 明确的所有权语义
- ✅ 更好的可扩展性
- ✅ 存储成本可预测

### Sui 的三种存储方式

| 方式 | 说明 | 用途 | Gas 成本 |
|------|------|------|----------|
| **静态字段** | 结构体内的固定字段 | 已知的固定数据 | 最低 |
| **动态字段** | 运行时添加的键值对 | 动态数量的数据 | 中等 |
| **子对象** | 独立的子对象 | 复杂的嵌套结构 | 较高 |

## 动态字段（Dynamic Fields）

**动态字段**允许在运行时向对象添加任意键值对，类似于 Solidity 的 `mapping`。

### 基本用法

```move
module example::dynamic_fields {
    use sui::object::{Self, UID};
    use sui::dynamic_field as df;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    struct Parent has key {
        id: UID
    }

    // 创建父对象
    public entry fun create_parent(ctx: &mut TxContext) {
        let parent = Parent {
            id: object::new(ctx)
        };
        transfer::transfer(parent, tx_context::sender(ctx));
    }

    // 添加动态字段
    public entry fun add_field(parent: &mut Parent, key: vector<u8>, value: u64) {
        df::add(&mut parent.id, key, value);
    }

    // 读取动态字段
    public fun read_field(parent: &Parent, key: vector<u8>): u64 {
        *df::borrow(&parent.id, key)
    }

    // 修改动态字段
    public entry fun update_field(parent: &mut Parent, key: vector<u8>, new_value: u64) {
        let value_ref = df::borrow_mut(&mut parent.id, key);
        *value_ref = new_value;
    }

    // 删除动态字段
    public entry fun remove_field(parent: &mut Parent, key: vector<u8>): u64 {
        df::remove(&mut parent.id, key)
    }

    // 检查字段是否存在
    public fun has_field(parent: &Parent, key: vector<u8>): bool {
        df::exists_(&parent.id, key)
    }
}
```

### 支持的键类型

```move
module example::key_types {
    use sui::dynamic_field as df;

    struct Container has key {
        id: UID
    }

    // ✅ 字节向量作为键
    public fun add_bytes_key(container: &mut Container) {
        df::add(&mut container.id, b"my_key", 100u64);
    }

    // ✅ 数字作为键
    public fun add_number_key(container: &mut Container) {
        df::add(&mut container.id, 123u64, b"value");
    }

    // ✅ 地址作为键
    public fun add_address_key(container: &mut Container, addr: address) {
        df::add(&mut container.id, addr, 500u64);
    }

    // ✅ 自定义结构体作为键（需要 copy + drop + store）
    struct CustomKey has copy, drop, store {
        id: u64,
        category: vector<u8>
    }

    public fun add_custom_key(container: &mut Container) {
        let key = CustomKey {
            id: 1,
            category: b"premium"
        };
        df::add(&mut container.id, key, b"custom_value");
    }
}
```

### 动态字段实战：用户积分系统

```move
module example::points_system {
    use sui::object::{Self, UID};
    use sui::dynamic_field as df;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // 积分系统（共享对象）
    struct PointsSystem has key {
        id: UID,
        total_users: u64
    }

    // 初始化
    fun init(ctx: &mut TxContext) {
        let system = PointsSystem {
            id: object::new(ctx),
            total_users: 0
        };
        transfer::share_object(system);
    }

    // 为用户添加积分（使用地址作为键）
    public entry fun add_points(
        system: &mut PointsSystem,
        user: address,
        points: u64
    ) {
        if (df::exists_(&system.id, user)) {
            // 用户已存在，增加积分
            let current_points = df::borrow_mut(&mut system.id, user);
            *current_points = *current_points + points;
        } else {
            // 新用户
            df::add(&mut system.id, user, points);
            system.total_users = system.total_users + 1;
        }
    }

    // 查询积分
    public fun get_points(system: &PointsSystem, user: address): u64 {
        if (df::exists_(&system.id, user)) {
            *df::borrow(&system.id, user)
        } else {
            0
        }
    }

    // 使用积分
    public entry fun spend_points(
        system: &mut PointsSystem,
        user: address,
        amount: u64
    ) {
        assert!(df::exists_(&system.id, user), 0);

        let points = df::borrow_mut(&mut system.id, user);
        assert!(*points >= amount, 1);

        *points = *points - amount;
    }

    // 转移积分
    public entry fun transfer_points(
        system: &mut PointsSystem,
        from: address,
        to: address,
        amount: u64,
        ctx: &TxContext
    ) {
        // 验证发送者
        assert!(tx_context::sender(ctx) == from, 0);

        // 扣除积分
        let from_points = df::borrow_mut(&mut system.id, from);
        assert!(*from_points >= amount, 1);
        *from_points = *from_points - amount;

        // 增加积分
        add_points(system, to, amount);
    }
}
```

## 动态对象字段（Dynamic Object Fields）

**动态对象字段**存储的是对象（有 `key` 能力的类型），而不是普通值。

### 动态字段 vs 动态对象字段

```move
module example::field_comparison {
    use sui::object::{Self, UID, ID};
    use sui::dynamic_field as df;
    use sui::dynamic_object_field as dof;

    struct Parent has key {
        id: UID
    }

    // 普通值类型（store 能力）
    struct ValueData has store {
        amount: u64
    }

    // 对象类型（key + store 能力）
    struct ChildObject has key, store {
        id: UID,
        data: vector<u8>
    }

    // ✅ 动态字段：存储值类型
    public fun add_value_field(parent: &mut Parent) {
        let data = ValueData { amount: 100 };
        df::add(&mut parent.id, b"value", data);
    }

    // ✅ 动态对象字段：存储对象
    public fun add_object_field(parent: &mut Parent, child: ChildObject) {
        let child_id = object::id(&child);
        dof::add(&mut parent.id, child_id, child);
    }

    // 获取动态对象字段
    public fun get_child(parent: &Parent, child_id: ID): &ChildObject {
        dof::borrow(&parent.id, child_id)
    }

    // 移除动态对象字段
    public fun remove_child(parent: &mut Parent, child_id: ID): ChildObject {
        dof::remove(&mut parent.id, child_id)
    }
}
```

**关键区别：**

| 特性 | 动态字段 (df) | 动态对象字段 (dof) |
|------|---------------|-------------------|
| **值类型** | 任何有 `store` 的类型 | 必须有 `key + store` |
| **是否可索引** | ❌ 不可直接查询 | ✅ 可通过对象 ID 查询 |
| **链上可见性** | 仅通过父对象访问 | 可独立查询 |
| **典型用途** | 简单键值存储 | 复杂的嵌套对象 |

### 实战：NFT 附件系统

```move
module example::nft_attachments {
    use sui::object::{Self, UID, ID};
    use sui::dynamic_object_field as dof;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;

    // 主 NFT
    struct MainNFT has key, store {
        id: UID,
        name: String,
        attachment_count: u64
    }

    // 附件 NFT
    struct Attachment has key, store {
        id: UID,
        attachment_type: String,  // "weapon", "armor", etc.
        power: u64
    }

    // 创建主 NFT
    public entry fun mint_nft(
        name: vector<u8>,
        ctx: &mut TxContext
    ) {
        let nft = MainNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            attachment_count: 0
        };

        transfer::public_transfer(nft, tx_context::sender(ctx));
    }

    // 创建附件
    public entry fun create_attachment(
        attachment_type: vector<u8>,
        power: u64,
        ctx: &mut TxContext
    ) {
        let attachment = Attachment {
            id: object::new(ctx),
            attachment_type: string::utf8(attachment_type),
            power
        };

        transfer::public_transfer(attachment, tx_context::sender(ctx));
    }

    // 附加到 NFT
    public entry fun attach(
        nft: &mut MainNFT,
        attachment: Attachment
    ) {
        let attachment_id = object::id(&attachment);

        // 添加为动态对象字段
        dof::add(&mut nft.id, attachment_id, attachment);
        nft.attachment_count = nft.attachment_count + 1;
    }

    // 分离附件
    public entry fun detach(
        nft: &mut MainNFT,
        attachment_id: ID,
        ctx: &mut TxContext
    ) {
        let attachment = dof::remove<ID, Attachment>(&mut nft.id, attachment_id);
        nft.attachment_count = nft.attachment_count - 1;

        transfer::public_transfer(attachment, tx_context::sender(ctx));
    }

    // 查看附件
    public fun get_attachment(nft: &MainNFT, attachment_id: ID): &Attachment {
        dof::borrow(&nft.id, attachment_id)
    }

    // 查看附件数量
    public fun attachment_count(nft: &MainNFT): u64 {
        nft.attachment_count
    }

    // 检查是否有附件
    public fun has_attachment(nft: &MainNFT, attachment_id: ID): bool {
        dof::exists_<ID>(&nft.id, attachment_id)
    }
}
```

## 集合类型

Sui 提供了多种集合类型，用于存储大量数据。

### Table - 哈希表

```move
module example::table_usage {
    use sui::table::{Self, Table};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    struct UserRegistry has key {
        id: UID,
        users: Table<address, UserInfo>
    }

    struct UserInfo has store {
        username: vector<u8>,
        score: u64,
        is_active: bool
    }

    // 创建注册表
    public entry fun create_registry(ctx: &mut TxContext) {
        let registry = UserRegistry {
            id: object::new(ctx),
            users: table::new(ctx)
        };
        transfer::share_object(registry);
    }

    // 注册用户
    public entry fun register(
        registry: &mut UserRegistry,
        username: vector<u8>,
        ctx: &TxContext
    ) {
        let user = tx_context::sender(ctx);

        let info = UserInfo {
            username,
            score: 0,
            is_active: true
        };

        table::add(&mut registry.users, user, info);
    }

    // 更新分数
    public entry fun update_score(
        registry: &mut UserRegistry,
        user: address,
        new_score: u64
    ) {
        let info = table::borrow_mut(&mut registry.users, user);
        info.score = new_score;
    }

    // 查询用户
    public fun get_user(registry: &UserRegistry, user: address): &UserInfo {
        table::borrow(&registry.users, user)
    }

    // 移除用户
    public entry fun remove_user(
        registry: &mut UserRegistry,
        user: address
    ) {
        table::remove(&mut registry.users, user);
    }

    // 检查用户是否存在
    public fun user_exists(registry: &UserRegistry, user: address): bool {
        table::contains(&registry.users, user)
    }
}
```

### Bag - 异构集合

**Bag** 可以存储不同类型的值，比 Table 更灵活。

```move
module example::bag_usage {
    use sui::bag::{Self, Bag};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    struct Storage has key {
        id: UID,
        items: Bag
    }

    // 创建存储
    public entry fun create_storage(ctx: &mut TxContext) {
        let storage = Storage {
            id: object::new(ctx),
            items: bag::new(ctx)
        };
        transfer::transfer(storage, tx_context::sender(ctx));
    }

    // 存储不同类型的值
    public entry fun store_number(storage: &mut Storage, key: vector<u8>, value: u64) {
        bag::add(&mut storage.items, key, value);
    }

    public entry fun store_bool(storage: &mut Storage, key: vector<u8>, value: bool) {
        bag::add(&mut storage.items, key, value);
    }

    public entry fun store_address(storage: &mut Storage, key: vector<u8>, value: address) {
        bag::add(&mut storage.items, key, value);
    }

    // 读取值（需要指定类型）
    public fun get_number(storage: &Storage, key: vector<u8>): u64 {
        *bag::borrow(&storage.items, key)
    }

    public fun get_bool(storage: &Storage, key: vector<u8>): bool {
        *bag::borrow(&storage.items, key)
    }
}
```

### ObjectTable 和 ObjectBag

```move
module example::object_collections {
    use sui::object_table::{Self, ObjectTable};
    use sui::object_bag::{Self, ObjectBag};
    use sui::object::{Self, UID, ID};

    struct NFT has key, store {
        id: UID,
        name: vector<u8>
    }

    // ObjectTable: 同类型对象的表
    struct NFTCollection has key {
        id: UID,
        nfts: ObjectTable<u64, NFT>  // 索引 -> NFT
    }

    public fun add_to_table(
        collection: &mut NFTCollection,
        index: u64,
        nft: NFT
    ) {
        object_table::add(&mut collection.nfts, index, nft);
    }

    // ObjectBag: 不同类型对象的包
    struct MixedCollection has key {
        id: UID,
        items: ObjectBag
    }

    struct ItemA has key, store {
        id: UID,
        value_a: u64
    }

    struct ItemB has key, store {
        id: UID,
        value_b: vector<u8>
    }

    public fun add_to_bag(
        collection: &mut MixedCollection,
        key_a: vector<u8>,
        item_a: ItemA
    ) {
        object_bag::add(&mut collection.items, key_a, item_a);
    }

    public fun add_different_type(
        collection: &mut MixedCollection,
        key_b: vector<u8>,
        item_b: ItemB
    ) {
        object_bag::add(&mut collection.items, key_b, item_b);
    }
}
```

### 集合类型对比

| 类型 | 值类型 | 键类型 | 典型用途 | Gas 成本 |
|------|--------|--------|----------|----------|
| **Table** | 单一类型 | copy+drop+store | 同质数据（用户列表） | 中等 |
| **Bag** | 多种类型 | copy+drop+store | 异构数据（配置项） | 中等 |
| **ObjectTable** | 单一对象类型 | copy+drop+store | 对象集合（NFT系列） | 较高 |
| **ObjectBag** | 多种对象类型 | copy+drop+store | 混合对象（多类资产） | 较高 |

## 对象包装模式

### 直接包装

```move
module example::wrapping {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::Coin;
    use sui::sui::SUI;

    // 内部对象（需要 store）
    struct Inner has key, store {
        id: UID,
        value: u64
    }

    // 包装对象
    struct Wrapper has key {
        id: UID,
        inner: Inner,  // 直接包装
        extra_data: vector<u8>
    }

    // 创建并包装
    public entry fun create_wrapped(
        value: u64,
        extra: vector<u8>,
        ctx: &mut TxContext
    ) {
        let inner = Inner {
            id: object::new(ctx),
            value
        };

        let wrapper = Wrapper {
            id: object::new(ctx),
            inner,
            extra_data: extra
        };

        transfer::transfer(wrapper, tx_context::sender(ctx));
    }

    // 解包
    public entry fun unwrap(
        wrapper: Wrapper,
        ctx: &mut TxContext
    ) {
        let Wrapper { id, inner, extra_data: _ } = wrapper;
        object::delete(id);

        transfer::public_transfer(inner, tx_context::sender(ctx));
    }

    // 访问包装的对象
    public fun get_inner_value(wrapper: &Wrapper): u64 {
        wrapper.inner.value
    }

    // 修改包装的对象
    public entry fun update_inner(wrapper: &mut Wrapper, new_value: u64) {
        wrapper.inner.value = new_value;
    }
}
```

### UID 包装（存储对象 ID）

```move
module example::uid_wrapping {
    use sui::object::{Self, UID, ID};
    use sui::dynamic_object_field as dof;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    struct Asset has key, store {
        id: UID,
        value: u64
    }

    // 使用 UID 存储对象
    struct Vault has key {
        id: UID,
        // 不直接存储 Asset，而是作为动态对象字段
        asset_count: u64
    }

    // 创建保险库
    public entry fun create_vault(ctx: &mut TxContext) {
        let vault = Vault {
            id: object::new(ctx),
            asset_count: 0
        };
        transfer::transfer(vault, tx_context::sender(ctx));
    }

    // 存入资产
    public entry fun deposit(
        vault: &mut Vault,
        asset: Asset
    ) {
        let asset_id = object::id(&asset);
        dof::add(&mut vault.id, asset_id, asset);
        vault.asset_count = vault.asset_count + 1;
    }

    // 取出资产
    public entry fun withdraw(
        vault: &mut Vault,
        asset_id: ID,
        ctx: &mut TxContext
    ) {
        let asset = dof::remove<ID, Asset>(&mut vault.id, asset_id);
        vault.asset_count = vault.asset_count - 1;

        transfer::public_transfer(asset, tx_context::sender(ctx));
    }

    // 查看资产
    public fun view_asset(vault: &Vault, asset_id: ID): &Asset {
        dof::borrow(&vault.id, asset_id)
    }
}
```

**直接包装 vs UID 包装：**

| 特性 | 直接包装 | UID 包装（动态对象字段） |
|------|----------|-------------------------|
| **灵活性** | ❌ 固定数量 | ✅ 动态数量 |
| **访问性** | ✅ 直接访问 | ⚠️ 需要 ID 查询 |
| **Gas 成本** | 低 | 中等 |
| **典型用途** | 单个子对象 | 多个子对象/集合 |

## 转移机制

### 四种转移方式

```move
module example::transfer_mechanisms {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    struct MyObject has key {
        id: UID,
        value: u64
    }

    struct MyToken has key, store {
        id: UID,
        amount: u64
    }

    // 1. transfer - 转移给地址（对象所有权改变）
    public entry fun transfer_to_address(obj: MyObject, recipient: address) {
        transfer::transfer(obj, recipient);
    }

    // 2. public_transfer - 公共转移（需要 store 能力）
    public entry fun public_transfer_token(token: MyToken, recipient: address) {
        transfer::public_transfer(token, recipient);
    }

    // 3. share_object - 转为共享对象（不可逆）
    public entry fun make_shared(obj: MyObject) {
        transfer::share_object(obj);
    }

    // 4. freeze_object - 转为不可变对象（不可逆）
    public entry fun make_immutable(obj: MyObject) {
        transfer::freeze_object(obj);
    }

    // 5. public_share_object - 公共共享（需要 store）
    public entry fun public_make_shared(token: MyToken) {
        transfer::public_share_object(token);
    }

    // 6. public_freeze_object - 公共冻结（需要 store）
    public entry fun public_make_immutable(token: MyToken) {
        transfer::public_freeze_object(token);
    }
}
```

### 条件转移

```move
module example::conditional_transfer {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    struct PremiumNFT has key {
        id: UID,
        tier: u8
    }

    struct MembershipCard has key {
        id: UID,
        level: u8
    }

    const ENotAuthorized: u64 = 0;
    const EInsufficientLevel: u64 = 1;

    // 需要支付才能接收
    public entry fun transfer_with_payment(
        nft: PremiumNFT,
        payment: Coin<SUI>,
        recipient: address,
        ctx: &TxContext
    ) {
        // 检查支付金额
        let amount = coin::value(&payment);
        assert!(amount >= 1_000_000_000, 0);  // 1 SUI

        // 销毁支付或转给创建者
        transfer::public_transfer(payment, @creator_address);

        // 转移 NFT
        transfer::transfer(nft, recipient);
    }

    // 需要会员资格才能接收
    public entry fun transfer_to_member(
        nft: PremiumNFT,
        recipient_card: &MembershipCard,
        recipient: address
    ) {
        // 检查会员等级
        assert!(recipient_card.level >= 3, EInsufficientLevel);

        // 转移 NFT
        transfer::transfer(nft, recipient);
    }

    // 只能转给白名单地址
    public entry fun whitelist_transfer(
        nft: PremiumNFT,
        recipient: address
    ) {
        // 检查白名单（简化示例）
        assert!(
            recipient == @whitelisted1 ||
            recipient == @whitelisted2,
            ENotAuthorized
        );

        transfer::transfer(nft, recipient);
    }
}
```

## 存储成本优化

### Gas 成本因素

```move
module example::gas_optimization {
    use sui::object::{Self, UID};
    use sui::dynamic_field as df;
    use sui::table::{Self, Table};

    // ❌ 不推荐：大型静态字段
    struct BadDesign has key {
        id: UID,
        data: vector<vector<u8>>  // 大量数据直接存储
    }

    // ✅ 推荐：使用动态字段
    struct GoodDesign has key {
        id: UID,
        count: u64
    }

    public fun add_data_good(obj: &mut GoodDesign, key: vector<u8>, value: vector<u8>) {
        df::add(&mut obj.id, key, value);
    }

    // ✅ 推荐：使用 Table 存储大量数据
    struct Optimized has key {
        id: UID,
        data: Table<u64, vector<u8>>
    }
}
```

### 最佳实践

```move
module example::storage_best_practices {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::tx_context::TxContext;

    // ✅ 好的设计
    struct EfficientStorage has key {
        id: UID,
        // 固定的小型字段
        owner: address,
        created_at: u64,
        // 大量动态数据使用 Table
        items: Table<u64, ItemData>
    }

    struct ItemData has store {
        // 保持结构体小而紧凑
        value: u64,
        timestamp: u64
    }

    // ❌ 避免：嵌套大型向量
    // struct BadStorage has key {
    //     id: UID,
    //     nested: vector<vector<vector<u8>>>  // 多层嵌套
    // }

    // ✅ 分批处理
    public fun add_items_batch(
        storage: &mut EfficientStorage,
        start_id: u64,
        count: u64,
        ctx: &mut TxContext
    ) {
        let mut i = 0;
        while (i < count) {
            let item = ItemData {
                value: i,
                timestamp: tx_context::epoch(ctx)
            };
            table::add(&mut storage.items, start_id + i, item);
            i = i + 1;
        }
    }
}
```

## 实战示例

### 示例 1：去中心化存储库

```move
module example::decentralized_storage {
    use sui::object::{Self, UID, ID};
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    // 存储系统
    struct StorageSystem has key {
        id: UID,
        files: Table<ID, FileMetadata>,
        total_files: u64,
        total_size: u64
    }

    // 文件元数据
    struct FileMetadata has store {
        owner: address,
        filename: vector<u8>,
        size: u64,
        content_hash: vector<u8>,
        upload_time: u64,
        is_public: bool
    }

    // 文件访问凭证
    struct FileAccess has key {
        id: UID,
        file_id: ID
    }

    // 事件
    struct FileUploaded has copy, drop {
        file_id: ID,
        owner: address,
        size: u64
    }

    // 初始化
    fun init(ctx: &mut TxContext) {
        let system = StorageSystem {
            id: object::new(ctx),
            files: table::new(ctx),
            total_files: 0,
            total_size: 0
        };
        transfer::share_object(system);
    }

    // 上传文件
    public entry fun upload_file(
        system: &mut StorageSystem,
        filename: vector<u8>,
        size: u64,
        content_hash: vector<u8>,
        is_public: bool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 检查存储费用（每 KB 0.001 SUI）
        let cost = (size / 1024) * 1_000_000;  // 0.001 SUI per KB
        assert!(coin::value(&payment) >= cost, 0);

        // 销毁支付
        transfer::public_transfer(payment, @storage_treasury);

        // 创建文件 ID
        let file_id = object::new(ctx);
        let file_id_inner = object::uid_to_inner(&file_id);
        object::delete(file_id);

        // 存储元数据
        let metadata = FileMetadata {
            owner: tx_context::sender(ctx),
            filename,
            size,
            content_hash,
            upload_time: tx_context::epoch(ctx),
            is_public
        };

        table::add(&mut system.files, file_id_inner, metadata);
        system.total_files = system.total_files + 1;
        system.total_size = system.total_size + size;

        // 发出事件
        event::emit(FileUploaded {
            file_id: file_id_inner,
            owner: tx_context::sender(ctx),
            size
        });
    }

    // 授权访问
    public entry fun grant_access(
        system: &StorageSystem,
        file_id: ID,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // 检查文件所有权
        let metadata = table::borrow(&system.files, file_id);
        assert!(metadata.owner == tx_context::sender(ctx), 1);

        // 创建访问凭证
        let access = FileAccess {
            id: object::new(ctx),
            file_id
        };

        transfer::transfer(access, recipient);
    }

    // 读取文件（需要访问权限）
    public fun read_file(
        system: &StorageSystem,
        file_id: ID,
        access: &FileAccess
    ): &FileMetadata {
        // 验证访问凭证
        assert!(access.file_id == file_id, 2);

        table::borrow(&system.files, file_id)
    }

    // 公开读取
    public fun read_public_file(
        system: &StorageSystem,
        file_id: ID
    ): &FileMetadata {
        let metadata = table::borrow(&system.files, file_id);
        assert!(metadata.is_public, 3);
        metadata
    }
}
```

### 示例 2：多层级组织结构

```move
module example::organization {
    use sui::object::{Self, UID, ID};
    use sui::dynamic_object_field as dof;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};

    // 部门
    struct Department has key, store {
        id: UID,
        name: vector<u8>,
        manager: address,
        employee_count: u64
    }

    // 员工
    struct Employee has key, store {
        id: UID,
        name: vector<u8>,
        role: vector<u8>,
        salary: u64,
        department_id: ID
    }

    // 公司（顶层对象）
    struct Company has key {
        id: UID,
        name: vector<u8>,
        departments: Table<ID, DepartmentRef>
    }

    struct DepartmentRef has store {
        dept_id: ID,
        name: vector<u8>
    }

    // 创建公司
    public entry fun create_company(
        name: vector<u8>,
        ctx: &mut TxContext
    ) {
        let company = Company {
            id: object::new(ctx),
            name,
            departments: table::new(ctx)
        };
        transfer::share_object(company);
    }

    // 添加部门
    public entry fun add_department(
        company: &mut Company,
        dept_name: vector<u8>,
        manager: address,
        ctx: &mut TxContext
    ) {
        let department = Department {
            id: object::new(ctx),
            name: dept_name,
            manager,
            employee_count: 0
        };

        let dept_id = object::id(&department);
        let dept_ref = DepartmentRef {
            dept_id,
            name: dept_name
        };

        // 将部门作为动态对象字段添加
        dof::add(&mut company.id, dept_id, department);

        // 在 Table 中记录引用
        table::add(&mut company.departments, dept_id, dept_ref);
    }

    // 雇佣员工
    public entry fun hire_employee(
        company: &mut Company,
        dept_id: ID,
        name: vector<u8>,
        role: vector<u8>,
        salary: u64,
        ctx: &mut TxContext
    ) {
        let employee = Employee {
            id: object::new(ctx),
            name,
            role,
            salary,
            department_id: dept_id
        };

        let employee_id = object::id(&employee);

        // 获取部门并增加员工数
        let department = dof::borrow_mut<ID, Department>(&mut company.id, dept_id);
        department.employee_count = department.employee_count + 1;

        // 将员工作为部门的动态对象字段
        dof::add(&mut department.id, employee_id, employee);
    }

    // 查看员工信息
    public fun get_employee(
        company: &Company,
        dept_id: ID,
        employee_id: ID
    ): &Employee {
        let department = dof::borrow<ID, Department>(&company.id, dept_id);
        dof::borrow(&department.id, employee_id)
    }

    // 调整薪资
    public entry fun adjust_salary(
        company: &mut Company,
        dept_id: ID,
        employee_id: ID,
        new_salary: u64,
        ctx: &TxContext
    ) {
        let department = dof::borrow_mut<ID, Department>(&mut company.id, dept_id);

        // 验证管理员权限
        assert!(department.manager == tx_context::sender(ctx), 0);

        let employee = dof::borrow_mut<ID, Employee>(&mut department.id, employee_id);
        employee.salary = new_salary;
    }
}
```

## 最佳实践总结

### 1. 选择合适的存储方式

```move
// ✅ 固定小型数据 -> 静态字段
struct Config has key {
    id: UID,
    max_supply: u64,
    decimals: u8
}

// ✅ 动态键值对 -> 动态字段
// df::add(&mut obj.id, key, value)

// ✅ 大量同类数据 -> Table
struct Registry has key {
    id: UID,
    users: Table<address, UserInfo>
}

// ✅ 嵌套对象 -> 动态对象字段
// dof::add(&mut parent.id, child_id, child_object)
```

### 2. 优化 Gas 成本

```move
// ✅ 避免大型静态字段
// ✅ 使用 Table/Bag 存储集合
// ✅ 分批处理大量操作
// ✅ 保持结构体紧凑
```

### 3. 所有权设计

```move
// ✅ 个人资产 -> transfer
// ✅ 多人访问 -> share_object
// ✅ 只读配置 -> freeze_object
// ✅ 嵌套对象 -> 动态对象字段
```

## 常见问题

### Q1: 动态字段和 Table 有什么区别？

**A:** 主要区别：

| 特性 | 动态字段 | Table |
|------|---------|-------|
| **类型安全** | ✅ 编译时检查 | ✅ 编译时检查 |
| **键类型** | 任意 copy+drop+store | 任意 copy+drop+store |
| **批量操作** | ❌ 不支持 | ✅ 支持（length等） |
| **Gas 成本** | 略低 | 略高 |
| **典型用途** | 少量键值对 | 大量数据集合 |

### Q2: 何时使用对象包装？

**A:** 选择标准：
- **已知数量**（1-3个）→ 直接包装
- **动态数量** → UID 包装（动态对象字段）
- **需要独立查询** → UID 包装
- **简单嵌套** → 直接包装

### Q3: 共享对象的性能影响？

**A:** 共享对象需要共识，性能较慢：
- **拥有对象**：< 1秒确认
- **共享对象**：1-2秒确认

建议：只有多人访问的数据才用共享对象。

### Q4: 如何降低存储成本？

**A:** 优化策略：
1. 使用动态字段代替大型静态数组
2. 使用 Table 存储大量数据
3. 压缩数据（如使用 u8 代替 u64）
4. 避免重复存储相同数据
5. 定期清理不需要的数据

### Q5: 对象删除后存储费用会退还吗？

**A:** **会的**。Sui 有存储退款机制（Storage Rebate）：
- 创建对象时支付存储费用
- 删除对象时退还部分费用
- 鼓励开发者清理不需要的数据

## 参考资源

- [Sui 对象模型](https://docs.sui.io/build/programming-with-objects)
- [动态字段文档](https://docs.sui.io/build/programming-with-objects/dynamic-fields)
- [集合类型文档](https://docs.sui.io/build/collections)
- [存储最佳实践](https://docs.sui.io/guides/developer/advanced/storage-optimization)
- [Sui Framework 源码](https://github.com/MystenLabs/sui/tree/main/crates/sui-framework)

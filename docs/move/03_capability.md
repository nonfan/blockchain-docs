# 能力系统与设计模式

> Move 的能力系统和 Sui 的高级设计模式

> [!IMPORTANT] 本节重点
> 1. Move 的能力系统（Abilities）如何工作？
> 2. Witness 模式和 OTW 是什么？
> 3. Hot Potato 模式如何强制执行规则？
> 4. 如何使用 Capability 实现权限控制？
> 5. Publisher、Kiosk 等高级模式如何应用？

## 什么是能力系统？

**能力（Abilities）** 是 Move 类型系统的核心特性，用于控制类型的行为和约束。
快速理解：
- `copy`：可复制的普通值；
- `drop`：可丢弃，超出作用域自动释放；
- `store`：可作为字段被存入其他结构体或对象；
- `key`：可作为链上对象（带 `UID`）存入全局存储。

### 四种基本能力

```move
module example::abilities {
    // copy - 可以复制
    struct Copyable has copy, drop {
        value: u64
    }

    // drop - 可以丢弃（超出作用域自动销毁）
    struct Droppable has drop {
        data: vector<u8>
    }

    // store - 可以存储在其他结构体中
    struct Storable has store {
        count: u64
    }

    // key - 可以作为对象（全局存储的键）
    struct Object has key {
        id: UID
    }

    // 组合能力
    struct Token has key, store {
        id: UID,
        value: u64
    }
}
```

### 能力规则

```move
module example::ability_rules {
    use sui::object::UID;

    // ✅ 正确：嵌套类型必须有 store
    struct Container has key {
        id: UID,
        item: ItemWithStore  // OK: ItemWithStore has store
    }

    struct ItemWithStore has store {
        value: u64
    }

    // ❌ 错误：嵌套类型没有 store
    // struct BadContainer has key {
    //     id: UID,
    //     item: ItemWithoutStore  // 编译错误！
    // }

    struct ItemWithoutStore {
        value: u64
    }

    // ✅ 资源类型（不能复制或丢弃）
    struct Asset has key {
        id: UID,
        value: u64
    }
    // Asset 没有 copy 或 drop，必须显式处理

    // ✅ 必须解构才能删除
    public fun delete_asset(asset: Asset) {
        let Asset { id, value: _ } = asset;
        object::delete(id);
    }
}
```

## Witness 模式



**Witness（见证者）** 是一种设计模式，通过类型参数确保某个操作只能由特定模块执行。

> 一句话理解：通过“类型参数见证者”把权限固定在某个模块，其他模块即使知道函数也无法创建见证者从而无法调用受限操作；常用于“只能由本包初始化或铸造”的场景。
### 基本 Witness 模式

```move
module example::witness_pattern {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    // Witness 类型（空结构体）
    struct WITNESS_PATTERN has drop {}

    // 受保护的资源
    struct ProtectedResource<phantom T> has key {
        id: UID,
        data: vector<u8>
    }

    // 只有持有 Witness 才能创建
    public fun create<T: drop>(
        _witness: T,
        data: vector<u8>,
        ctx: &mut TxContext
    ): ProtectedResource<T> {
        ProtectedResource {
            id: object::new(ctx),
            data
        }
    }

    // 只有本模块能创建 WITNESS_PATTERN
    public entry fun create_protected(
        data: vector<u8>,
        ctx: &mut TxContext
    ) {
        let witness = WITNESS_PATTERN {};
        let resource = create(witness, data, ctx);
        transfer::transfer(resource, tx_context::sender(ctx));
    }
}
```

**作用：**
- 🔒 类型安全的权限控制
- 🎯 确保只有特定模块能执行操作
- 📝 常用于代币创建、系列验证等场景

## One-Time Witness (OTW)

**一次性见证者（OTW）** 是只能在模块初始化时创建一次的特殊 Witness。

> 系统在模块 `init` 阶段只发放一次同名大写见证者，用来声明“唯一性”的能力（如唯一代币类型、唯一 Publisher）；离开 `init` 后再也无法获得。

### OTW 规则

OTW 必须满足以下条件：
1. 类型名必须是模块名的全大写形式
2. 必须有 `drop` 能力
3. 只能在 `init` 函数中创建
4. 系统自动生成一个实例传给 `init`

```move
module example::my_token {
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::TxContext;

    // OTW 类型（名称必须是模块名的大写）
    struct MY_TOKEN has drop {}

    // init 函数会自动收到 OTW 实例
    fun init(witness: MY_TOKEN, ctx: &mut TxContext) {
        // OTW 只能在这里使用一次
        let (treasury, metadata) = coin::create_currency(
            witness,           // 消耗 OTW
            9,                 // 小数位数
            b"MTK",           // 符号
            b"My Token",      // 名称
            b"My token description",
            option::none(),
            ctx
        );

        // 转移 treasury 控制权
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_freeze_object(metadata);
    }

    // ❌ 无法在其他地方创建 MY_TOKEN
    // 这是编译错误，因为 OTW 只有系统能创建
}
```

### OTW 使用场景

```move
module example::nft_collection {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::package;
    use sui::display::{Self, Display};
    use std::string::{Self, String};

    // OTW
    struct NFT_COLLECTION has drop {}

    // NFT 类型
    struct MyNFT has key, store {
        id: UID,
        name: String,
        image_url: String
    }

    // init 函数
    fun init(otw: NFT_COLLECTION, ctx: &mut TxContext) {
        // 1. 创建 Publisher（证明包所有权）
        let publisher = package::claim(otw, ctx);

        // 2. 创建 Display（定义 NFT 显示规则）
        let mut display = display::new<MyNFT>(&publisher, ctx);

        display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
        display::update_version(&mut display);

        // 3. 转移所有权
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    // 铸造 NFT
    public entry fun mint(
        name: vector<u8>,
        image_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let nft = MyNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            image_url: string::utf8(image_url)
        };

        transfer::public_transfer(nft, tx_context::sender(ctx));
    }
}
```

## Hot Potato 模式

**Hot Potato** 是一种没有任何能力的类型，必须被显式处理，无法丢弃或存储。

> 返回一个没有任何能力的“临时凭据”，调用方必须在同一交易内继续消费它，借此在类型层面强制完整业务流程（如借款→还款、请求→完成）。

### 基本 Hot Potato

```move
module example::hot_potato {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // Hot Potato（没有任何能力）
    struct Receipt {
        action: u8,
        value: u64
    }

    struct Vault has key {
        id: UID,
        balance: u64
    }

    // 存款返回 Receipt
    public fun deposit(vault: &mut Vault, amount: u64): Receipt {
        vault.balance = vault.balance + amount;

        // 返回 Receipt（必须被处理）
        Receipt {
            action: 1,
            value: amount
        }
    }

    // 必须调用这个函数消耗 Receipt
    public fun confirm_receipt(receipt: Receipt) {
        let Receipt { action: _, value: _ } = receipt;
        // Receipt 被解构并销毁
    }

    // 使用示例
    public entry fun deposit_and_confirm(
        vault: &mut Vault,
        amount: u64
    ) {
        let receipt = deposit(vault, amount);

        // ❌ 不能忽略 receipt
        // ❌ 不能存储 receipt
        // ✅ 必须消耗 receipt
        confirm_receipt(receipt);
    }
}
```

### Hot Potato 强制执行流程

```move
module example::flash_loan {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;

    // Hot Potato - 闪电贷收据
    struct FlashLoan {
        amount: u64
    }

    struct Pool has key {
        id: UID,
        balance: Balance<SUI>
    }

    // 1. 借款（返回 Hot Potato）
    public fun borrow(
        pool: &mut Pool,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<SUI>, FlashLoan) {
        let coin = coin::take(&mut pool.balance, amount, ctx);
        let receipt = FlashLoan { amount };

        (coin, receipt)  // 必须返还
    }

    // 2. 还款（消耗 Hot Potato）
    public fun repay(
        pool: &mut Pool,
        payment: Coin<SUI>,
        receipt: FlashLoan
    ) {
        let FlashLoan { amount } = receipt;  // 消耗 Hot Potato

        // 检查还款金额
        assert!(coin::value(&payment) >= amount, 0);

        // 归还池子
        coin::put(&mut pool.balance, payment);
    }

    // 3. 使用闪电贷
    public entry fun use_flash_loan(pool: &mut Pool, ctx: &mut TxContext) {
        // 借款
        let (borrowed, receipt) = borrow(pool, 1000, ctx);

        // 使用借来的币（套利、清算等）
        // let profit = do_arbitrage(borrowed);

        // ✅ 必须还款，否则交易失败
        repay(pool, borrowed, receipt);
    }
}
```

**优势：**
- ✅ 在类型层面强制执行流程
- ✅ 无法绕过规则
- ✅ 编译时检查，零运行时开销
- 🎯 **用途：闪电贷、多步骤流程、原子操作**

## Capability 模式

**Capability（能力）** 是一种访问控制模式，通过持有特定对象来证明权限。
区别速览：
- `Abilities`：类型级约束，编译期决定能否复制/存储/作为对象；
- `Capability`：运行期凭证对象，函数通过参数是否持有它来判定权限。

### AdminCap 模式

用法概览：把敏感操作的函数签名写成 `(_: &AdminCap, ...)`，调用者必须持有该对象的借用引用才能通过类型检查；`AdminCap` 可转移，便于权限交接。

```move
module example::admin_system {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // 管理员凭证
    struct AdminCap has key, store {
        id: UID
    }

    // 受保护的配置
    struct Config has key {
        id: UID,
        max_supply: u64,
        paused: bool
    }

    // 初始化时创建 AdminCap
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };

        let config = Config {
            id: object::new(ctx),
            max_supply: 1000000,
            paused: false
        };

        // 转移 AdminCap 给部署者
        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(config);
    }

    // 只有持有 AdminCap 才能调用
    public entry fun set_max_supply(
        _admin: &AdminCap,  // 验证管理员权限
        config: &mut Config,
        new_max: u64
    ) {
        config.max_supply = new_max;
    }

    // 暂停系统
    public entry fun pause(
        _admin: &AdminCap,
        config: &mut Config
    ) {
        config.paused = true;
    }

    // 恢复系统
    public entry fun unpause(
        _admin: &AdminCap,
        config: &mut Config
    ) {
        config.paused = false;
    }

    // 转移管理员权限
    public entry fun transfer_admin(
        admin_cap: AdminCap,
        new_admin: address
    ) {
        transfer::transfer(admin_cap, new_admin);
    }
}
```
使用指南：
- 受限函数签名形如 `(_: &AdminCap, ...)` 或 `(_: &mut AdminCap, ...)`；
- 交易发起者必须持有该对象，才能在执行时借用到它并通过权限校验；
- 可将 `AdminCap` 转移到其他地址，实现权限移交。

### 多级权限系统

```move
module example::multi_role {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    // 超级管理员
    struct SuperAdminCap has key, store {
        id: UID
    }

    // 普通管理员
    struct AdminCap has key, store {
        id: UID
    }

    // 操作员
    struct OperatorCap has key, store {
        id: UID
    }

    struct System has key {
        id: UID,
        critical_value: u64,
        normal_value: u64,
        public_value: u64
    }

    // 超级管理员操作
    public entry fun critical_operation(
        _super_admin: &SuperAdminCap,
        system: &mut System,
        new_value: u64
    ) {
        system.critical_value = new_value;
    }

    // 管理员操作
    public entry fun admin_operation(
        _admin: &AdminCap,
        system: &mut System,
        new_value: u64
    ) {
        system.normal_value = new_value;
    }

    // 操作员操作
    public entry fun operator_operation(
        _operator: &OperatorCap,
        system: &mut System,
        new_value: u64
    ) {
        system.public_value = new_value;
    }

    // 超级管理员可以创建管理员
    public entry fun create_admin(
        _super_admin: &SuperAdminCap,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, recipient);
    }

    // 管理员可以创建操作员
    public entry fun create_operator(
        _admin: &AdminCap,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let operator_cap = OperatorCap {
            id: object::new(ctx)
        };
        transfer::transfer(operator_cap, recipient);
    }
}
```

## Publisher 模式

**Publisher** 证明包的所有权，用于创建 `Display`、`TransferPolicy` 等。

> 一句话理解：在 `init` 中用 OTW 声明 `Publisher`，后续基于该身份创建标准化的展示与转移策略对象；通常在 NFT 系列初始化时一次性完成。

```move
module example::publisher_usage {
    use sui::package;
    use sui::display::{Self, Display};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};

    // OTW
    struct PUBLISHER_USAGE has drop {}

    struct MyNFT has key, store {
        id: UID,
        name: String,
        description: String
    }

    fun init(otw: PUBLISHER_USAGE, ctx: &mut TxContext) {
        // 1. 声明 Publisher
        let publisher = package::claim(otw, ctx);

        // 2. 创建 Display
        let mut display = display::new<MyNFT>(&publisher, ctx);

        // 设置 NFT 显示规则
        display::add(
            &mut display,
            string::utf8(b"name"),
            string::utf8(b"{name}")
        );
        display::add(
            &mut display,
            string::utf8(b"description"),
            string::utf8(b"{description}")
        );
        display::add(
            &mut display,
            string::utf8(b"image_url"),
            string::utf8(b"https://example.com/nft/{id}")
        );
        display::update_version(&mut display);

        // 3. 冻结 Display（可选）
        transfer::public_transfer(display, tx_context::sender(ctx));

        // 4. 保留 Publisher 用于未来操作
        transfer::public_transfer(publisher, tx_context::sender(ctx));
    }
}
```

## TransferPolicy 和 Kiosk

**TransferPolicy** 和 **Kiosk** 是 Sui 的 NFT 交易和版税系统。

关系说明：`TransferPolicy` 负责定义转移规则（如版税、黑白名单），`Kiosk` 负责上架/购买并在购买时返回请求对象；必须调用 `confirm_request` 以强制执行策略，否则交易不成立。

### 创建 TransferPolicy

```move
module example::transfer_policy_example {
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap};
    use sui::package::Publisher;
    use sui::coin::Coin;
    use sui::sui::SUI;

    struct MyNFT has key, store {
        id: UID,
        name: String
    }

    // 创建转移策略
    public fun create_policy(
        publisher: &Publisher,
        ctx: &mut TxContext
    ): (TransferPolicy<MyNFT>, TransferPolicyCap<MyNFT>) {
        // 创建策略
        let (policy, policy_cap) = transfer_policy::new<MyNFT>(
            publisher,
            ctx
        );

        (policy, policy_cap)
    }

    // 添加版税规则
    public fun add_royalty_rule(
        policy: &mut TransferPolicy<MyNFT>,
        policy_cap: &TransferPolicyCap<MyNFT>,
        royalty_bps: u16,  // 版税基点（500 = 5%）
        min_amount: u64
    ) {
        use sui::transfer_policy;
        use sui::royalty_rule;

        royalty_rule::add(
            policy,
            policy_cap,
            royalty_bps,
            min_amount
        );
    }
}
```

### Kiosk 交易

```move
module example::kiosk_trading {
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::transfer_policy::TransferPolicy;
    use sui::coin::Coin;
    use sui::sui::SUI;

    struct MyNFT has key, store {
        id: UID
    }

    // 创建 Kiosk
    public entry fun create_kiosk(ctx: &mut TxContext) {
        let (kiosk, kiosk_cap) = kiosk::new(ctx);

        transfer::public_share_object(kiosk);
        transfer::public_transfer(kiosk_cap, tx_context::sender(ctx));
    }

    // 将 NFT 放入 Kiosk
    public entry fun place_in_kiosk(
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        nft: MyNFT
    ) {
        kiosk::place(kiosk, kiosk_cap, nft);
    }

    // 在 Kiosk 中挂单
    public entry fun list_for_sale(
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        nft_id: ID,
        price: u64
    ) {
        kiosk::list<MyNFT>(kiosk, kiosk_cap, nft_id, price);
    }

    // 从 Kiosk 购买（自动执行版税）
    public entry fun purchase(
        kiosk: &mut Kiosk,
        nft_id: ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<MyNFT>,
        ctx: &mut TxContext
    ) {
        // 购买 NFT
        let (nft, request) = kiosk::purchase<MyNFT>(
            kiosk,
            nft_id,
            payment
        );

        // 确认符合转移策略
        transfer_policy::confirm_request(policy, request);

        // 转移给买家
        transfer::public_transfer(nft, tx_context::sender(ctx));
    }
}
```

## 实战示例

### 示例 1：代币发行系统

```move
module example::token_system {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // OTW
    struct TOKEN_SYSTEM has drop {}

    // 铸币权限
    struct MinterCap has key, store {
        id: UID
    }

    fun init(otw: TOKEN_SYSTEM, ctx: &mut TxContext) {
        // 创建代币
        let (treasury, metadata) = coin::create_currency(
            otw,
            9,
            b"EXAMPLE",
            b"Example Token",
            b"An example token with minter capability",
            option::none(),
            ctx
        );

        // 冻结元数据
        transfer::public_freeze_object(metadata);

        // 创建 MinterCap
        let minter_cap = MinterCap {
            id: object::new(ctx)
        };

        // 转移 treasury 和 minter_cap
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(minter_cap, tx_context::sender(ctx));
    }

    // 铸造代币（需要 MinterCap）
    public entry fun mint(
        _minter: &MinterCap,
        treasury: &mut TreasuryCap<TOKEN_SYSTEM>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    // 销毁代币
    public entry fun burn(
        treasury: &mut TreasuryCap<TOKEN_SYSTEM>,
        coin: Coin<TOKEN_SYSTEM>
    ) {
        coin::burn(treasury, coin);
    }
}
```

### 示例 2：NFT 市场（带版税）

```move
module example::nft_marketplace {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;

    // OTW
    struct NFT_MARKETPLACE has drop {}

    // NFT 定义
    struct ArtNFT has key, store {
        id: UID,
        name: String,
        creator: address,
        royalty_bps: u16  // 版税百分比（基点）
    }

    // 市场（共享对象）
    struct Marketplace has key {
        id: UID,
        listings: Table<ID, Listing>
    }

    // 挂单信息
    struct Listing has store {
        seller: address,
        price: u64,
        nft_id: ID
    }

    // 事件
    struct NFTListed has copy, drop {
        nft_id: ID,
        seller: address,
        price: u64
    }

    struct NFTSold has copy, drop {
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64,
        royalty: u64
    }

    // 初始化
    fun init(_otw: NFT_MARKETPLACE, ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            listings: table::new(ctx)
        };
        transfer::share_object(marketplace);
    }

    // 铸造 NFT
    public entry fun mint_nft(
        name: vector<u8>,
        royalty_bps: u16,
        ctx: &mut TxContext
    ) {
        let nft = ArtNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            creator: tx_context::sender(ctx),
            royalty_bps
        };

        transfer::public_transfer(nft, tx_context::sender(ctx));
    }

    // 挂单
    public entry fun list(
        marketplace: &mut Marketplace,
        nft: ArtNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        let nft_id = object::id(&nft);
        let sender = tx_context::sender(ctx);

        // 创建挂单
        let listing = Listing {
            seller: sender,
            price,
            nft_id
        };

        table::add(&mut marketplace.listings, nft_id, listing);

        // 转移 NFT 到市场
        transfer::public_transfer(nft, object::uid_to_address(&marketplace.id));

        // 发出事件
        event::emit(NFTListed {
            nft_id,
            seller: sender,
            price
        });
    }

    // 购买（自动支付版税）
    public entry fun buy(
        marketplace: &mut Marketplace,
        nft_id: ID,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 获取挂单信息
        let listing = table::remove(&mut marketplace.listings, nft_id);
        let Listing { seller, price, nft_id: _ } = listing;

        // 检查支付金额
        assert!(coin::value(&payment) >= price, 0);

        // 获取 NFT（实际应用需要动态对象字段）
        // 这里简化处理
        // let nft = dynamic_object_field::remove<ID, ArtNFT>(...);

        // 假设我们获取了 NFT
        // let royalty_amount = (price * (nft.royalty_bps as u64)) / 10000;
        let royalty_amount = 0;  // 简化

        // 分配资金
        if (royalty_amount > 0) {
            let royalty_coin = coin::split(&mut payment, royalty_amount, ctx);
            // transfer::public_transfer(royalty_coin, nft.creator);
        }

        // 支付给卖家
        transfer::public_transfer(payment, seller);

        // 转移 NFT 给买家
        // transfer::public_transfer(nft, tx_context::sender(ctx));

        // 发出事件
        event::emit(NFTSold {
            nft_id,
            seller,
            buyer: tx_context::sender(ctx),
            price,
            royalty: royalty_amount
        });
    }
}
```

### 示例 3：质押系统（Hot Potato）

```move
module example::staking_with_hot_potato {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // 质押池
    struct StakingPool has key {
        id: UID,
        total_staked: Balance<SUI>,
        reward_rate: u64  // 每个 epoch 的奖励率
    }

    // 质押凭证
    struct StakeReceipt has key, store {
        id: UID,
        amount: u64,
        stake_epoch: u64
    }

    // Hot Potato - 取款请求
    struct WithdrawRequest {
        amount: u64,
        receipt_id: ID
    }

    // 质押
    public entry fun stake(
        pool: &mut StakingPool,
        stake_coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&stake_coin);
        let stake_epoch = tx_context::epoch(ctx);

        // 添加到池子
        coin::put(&mut pool.total_staked, stake_coin);

        // 创建凭证
        let receipt = StakeReceipt {
            id: object::new(ctx),
            amount,
            stake_epoch
        };

        transfer::transfer(receipt, tx_context::sender(ctx));
    }

    // 请求取款（返回 Hot Potato）
    public fun request_withdraw(
        receipt: StakeReceipt
    ): WithdrawRequest {
        let StakeReceipt { id, amount, stake_epoch: _ } = receipt;
        let receipt_id = object::uid_to_inner(&id);
        object::delete(id);

        WithdrawRequest {
            amount,
            receipt_id
        }
    }

    // 完成取款（消耗 Hot Potato）
    public fun complete_withdraw(
        pool: &mut StakingPool,
        request: WithdrawRequest,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let WithdrawRequest { amount, receipt_id: _ } = request;

        // 计算奖励
        let reward = amount / 100;  // 1% 奖励（简化）
        let total_amount = amount + reward;

        // 从池子取出
        coin::take(&mut pool.total_staked, total_amount, ctx)
    }

    // 使用示例：必须完成完整流程
    public entry fun withdraw(
        pool: &mut StakingPool,
        receipt: StakeReceipt,
        ctx: &mut TxContext
    ) {
        // 1. 请求取款（获得 Hot Potato）
        let request = request_withdraw(receipt);

        // 2. 必须完成取款（消耗 Hot Potato）
        let withdrawn = complete_withdraw(pool, request, ctx);

        // 3. 转移给用户
        transfer::public_transfer(withdrawn, tx_context::sender(ctx));
    }
}
```

## 最佳实践

### 选择合适的模式

```move
// ✅ 使用 OTW 创建唯一代币类型
struct MY_TOKEN has drop {}
fun init(otw: MY_TOKEN, ctx: &mut TxContext) { ... }

// ✅ 使用 Capability 实现权限控制
struct AdminCap has key, store { id: UID }
public fun admin_only(_: &AdminCap, ...) { ... }

// ✅ 使用 Hot Potato 强制执行流程
struct FlashLoan { amount: u64 }  // 无任何能力
```

### 能力最小化

```move
// ✅ 资产类型不要随意添加 copy 或 drop
struct Asset has key {
    id: UID,
    value: u64
}

// ❌ 避免：资产可复制
// struct BadAsset has key, copy {
//     id: UID,
//     value: u64
// }
```

### 权限分离

```move
// ✅ 不同权限使用不同的 Capability
struct SuperAdminCap has key { id: UID }
struct AdminCap has key { id: UID }
struct MinterCap has key { id: UID }

// ❌ 避免：单一万能权限
// struct GodModeCap has key { id: UID }
```

### 使用 Publisher 标准化

```move
// ✅ 使用 OTW 声明 Publisher
fun init(otw: MY_MODULE, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    // 创建 Display、TransferPolicy 等
}
```

## 常见问题

### Q1: Witness 和 Hot Potato 有什么区别？

**A:** 核心区别在于用途和能力：

| 特性 | Witness | Hot Potato |
|------|---------|------------|
| **能力** | 有 `drop` | 无任何能力 |
| **用途** | 类型级别的权限证明 | 强制执行流程 |
| **生命周期** | 可以立即丢弃 | 必须被显式处理 |
| **典型场景** | 代币创建、包所有权 | 闪电贷、多步骤操作 |

### Q2: OTW 为什么只能使用一次？

**A:** OTW 的唯一性保证了某些操作的唯一性：
- 代币类型只能创建一次
- Publisher 只能声明一次
- 防止重复初始化

系统自动生成 OTW 实例并传给 `init`，之后无法再创建。

### Q3: 如何转移 Capability？

**A:** Capability 必须有 `store` 能力才能转移：

```move
struct AdminCap has key, store {  // ✅ 有 store
    id: UID
}

public entry fun transfer_admin(admin: AdminCap, to: address) {
    transfer::transfer(admin, to);
}
```

### Q4: Hot Potato 如何防止绕过？

**A:** Hot Potato 没有 `drop`、`copy`、`store` 能力，因此：
- ❌ 不能忽略（编译错误）
- ❌ 不能复制（编译错误）
- ❌ 不能存储（编译错误）
- ✅ 必须被显式解构

这是编译时保证，无法绕过。

### Q5: TransferPolicy 是强制的吗？

**A:** 是的，使用 Kiosk 交易的 NFT 必须符合 TransferPolicy：

```move
// 购买时必须验证策略
let (nft, request) = kiosk::purchase(...);
transfer_policy::confirm_request(policy, request);  // 必须
```

这确保了版税和其他规则的强制执行。

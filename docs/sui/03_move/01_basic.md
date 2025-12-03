# 语言基础

> Move 的基础语法、类型系统和模块结构

> [!IMPORTANT] 本节重点
> 1. Move 的基本语法和数据类型有哪些？
> 2. 如何定义模块、结构体和函数？
> 3. 能力系统（Abilities）如何工作？
> 4. Move 的所有权和借用规则是什么？
> 5. 如何编写测试和调试代码？

## Move 语言概述

**Move** 是一种专为资源编程设计的静态类型语言，具有以下特点：

- 🔒 **资源安全** - 资源不能被复制或丢弃
- 📝 **静态类型** - 编译时类型检查
- 🎯 **模块化** - 清晰的模块和包结构
- ⚡ **高性能** - 编译为字节码执行
- 🛡️ **形式化验证** - 支持 Move Prover 验证

### Move vs Rust vs Solidity

| 特性 | Move | Rust | Solidity |
|------|------|------|----------|
| **类型系统** | 静态 + 线性类型 | 静态 + 所有权 | 静态 |
| **资源安全** | ✅ 编译时保证 | ✅ 编译时保证 | ❌ 运行时检查 |
| **内存管理** | 自动 | 手动（所有权） | 自动（GC） |
| **泛型** | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| **并发** | ❌ 不支持 | ✅ 支持 | ❌ 不支持 |

> [!IMPORTANT] Move 和 Rust 为什么高度相似？
> Move 的设计者就是 Rust 的忠实拥趸，所以 Move 采用了类似 Rust 的：
> - 花括号结构 `{}`
> - 所有权和借用类似
> - trait-like 的能力（abilities）
> - 类型写法类似：`vector<T>`
> - 模块系统类似：`use ...;`

## 基本语法

### 注释

```move
// 单行注释

/*
 * 多行注释
 * 第二行
 */

/// 文档注释（用于生成文档）
/// 描述函数功能
public fun example() {}
```

### 模块定义

```move
module my_package::my_module {
    // 模块内容
}
```

**命名规则：**
- 包名：小写字母和下划线 `my_package`
- 模块名：小写字母和下划线 `my_module`
- 地址：十六进制 `0x1` 或命名地址 `sui`

### 导入

```move
module my_package::example {
    // 导入整个模块
    use sui::object;

    // 导入特定项
    use sui::transfer::transfer;

    // 导入并重命名
    use sui::object::{Self, UID};

    // 导入多个项
    use sui::tx_context::{Self, TxContext};
}
```

## 数据类型

### 基本类型

Move 的基本类型：布尔类型、整数类型（无符号）、地址类型。

```move
module example::types {
    fun primitives() {
        // 布尔类型
        let b: bool = true;
        let b: bool = false;

        // 整数类型
        let num_u8: u8 = 255;        // 0 到 255
        let num_u16: u16 = 65535;    // 0 到 65,535
        let num_u32: u32 = 4294967295;
        let num_u64: u64 = 18446744073709551615;
        let num_u128: u128 = 340282366920938463463374607431768211455;
        let num_u256: u256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

        // 地址类型
        let addr: address = @0x1;

        // 没有浮点数！
    }
}
```

> [!WARNING] 为什么 Move 不支持有符号整数？
> Move 的设计目标是 安全、可验证、不允许危险操作。有符号整数会带来很多不可控风险：**溢出边界难以验证**、**负数在区块链世界本身意义不大**、**减少攻击面与 Bug 概率**。

### 类型转换

Move 只允许无符号整数之间明确转换，没有隐式转换：

```move
fun type_casting() {
    let a: u8 = 10;
    let b: u64 = (a as u64);  // 小类型转大类型

    // 注意：大类型转小类型可能溢出
    let c: u64 = 300;
    let d: u8 = (c as u8);    // 300 % 256 = 44
}
```

### 向量（Vector）

```move
module example::vectors {
    use std::vector;

    fun vector_operations() {
        // 创建空向量
        let v = vector::empty<u64>();

        // 添加元素
        vector::push_back(&mut v, 10);
        vector::push_back(&mut v, 20);

        // 访问元素
        let first = vector::borrow(&v, 0);  // &10

        // 修改元素
        let first_mut = vector::borrow_mut(&mut v, 0);
        *first_mut = 100;

        // 长度
        let len = vector::length(&v);  // 2

        // 删除元素
        let last = vector::pop_back(&mut v);  // 移除并返回最后一个元素：20

        // 销毁向量
        vector::destroy_empty(v);
    }

    // 向量字面量
    fun vector_literal() {
        let v = vector[1, 2, 3, 4, 5];
    }

    // 遍历向量
    fun vector_list() {
        let v = vector[1,2,3];
        let len = vector::length(&v);
        let mut i = 0;
        while i < len {
            let val = *vector::borrow(&v, i);
            i += 1;
        }
    }
}
```

## 结构体（Struct）

### 定义结构体

```move
module example::structs {
    use sui::object::UID;

    // 基本结构体
    struct User {
        age: u8,
        name: vector<u8>
    }

    // 带泛型的结构体
    struct Box<T> {
        value: T
    }

    // Sui 对象（需要 UID 字段）
    struct GameItem has key {
        id: UID,
        power: u64,
        defense: u64
    }
}
```

### 能力（Abilities）

Move 使用**能力系统**控制类型的行为：

```move
module example::abilities {
    use sui::object::UID;

    // copy: 可以复制
    struct Copyable has copy, drop {
        value: u64
    }

    // drop: 可以丢弃
    struct Droppable has drop {
        data: vector<u8>
    }

    // store: 可以存储在其他结构体中
    struct Storable has store {
        count: u64
    }

    // key: 可以作为全局存储的键（Sui 对象）
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

**Move 的能力共有 4 种（Sui/Move 2024）：**

| 能力 | 说明 | 示例 |
|------|------|------|
| `copy` | 可以复制 | 基本类型、配置数据 |
| `drop` | 可以丢弃 | 临时计算结果 |
| `store` | 可以存储在结构体或全局存储中 | 嵌套对象 |
| `key` | 可以作为全局存储的键 | 顶层 Sui 对象 |

> 结构体如果没有显式声明能力，默认是不可复制、可丢弃（只拥有 drop）, 对于链上对象类型，一般至少需要 `key + store`

### 创建和使用结构体

```move
module example::user {
    struct User has drop {
        age: u8,
        name: vector<u8>
    }

    // 创建结构体
    public fun create_user(age: u8, name: vector<u8>): User {
        User { age, name }
    }

    // 解构结构体
    public fun get_age(user: User): u8 {
        let User { age, name: _ } = user;
        age
    }

    // 访问字段（需要借用）
    public fun read_age(user: &User): u8 {
        user.age
    }

    // 修改字段（需要可变借用）
    public fun update_age(user: &mut User, new_age: u8) {
        user.age = new_age;
    }
}
```

## 函数

### 函数定义

```move
module example::functions {
    // 私有函数（模块内可见）
    fun private_function() {
        // ...
    }

    // 公共函数（模块外可见）
    public fun public_function() {
        // ...
    }

    // 入口函数（可从外部调用）
    public entry fun entry_function() {
        // ...
    }

    // 带参数和返回值
    public fun add(a: u64, b: u64): u64 {
        a + b
    }

    // 多个返回值
    public fun swap(a: u64, b: u64): (u64, u64) {
        (b, a)
    }

    // 泛型函数
    public fun identity<T>(value: T): T {
        value
    }
}
```

### 函数可见性

```move
module example::visibility {
    // 只在模块内可见
    fun module_private() {}

    // 在包内可见（Sui Move 特性）
    public(package) fun package_visible() {}

    // 完全公开
    public fun fully_public() {}

    // 入口函数（可从交易调用）
    public entry fun transaction_entry() {}
}
```

### 交易入口函数

在 Sui Move 中，通过 entry 函数修饰的函数 (交易入口函数)，专门用于在链上发起交易的函数。允许外部用户通过交易调用 Move 模块函数，修改链上对象。

- 必须是 `public entry`
- 可以接收 `signer` 引用，表示调用者
- 可以修改拥有 `key` 能力的对象

```solidity 
module my_module {
    use sui::object::{UID};
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::signer;

    struct MyCoin has key {
        id: UID,
        value: u64,
    }

    // 交易入口函数
    public entry fun mint_coin(owner: &signer, amount: u64, ctx: &mut TxContext) {
        let coin = MyCoin {
            id: object::new(ctx),
            value: amount,
        };
        // 转移给调用者
        transfer::transfer(coin, signer::address(owner));
    }
}
```


## 表达式和控制流

### 变量绑定

```move
fun variables() {
    // let 绑定
    let x = 10;

    // 类型注解
    let y: u64 = 20;

    // 可变绑定
    let mut z = 30;
    z = 40;

    // 解构
    let (a, b) = (1, 2);

    // 忽略值
    let (c, _) = (3, 4);
}
```

### 条件表达式

```move
fun conditionals(x: u64): u64 {
    // if-else 是表达式
    let result = if (x > 10) {
        100
    } else if (x > 5) {
        50
    } else {
        0
    };

    result
}
```

### 循环

```move
fun loops() {
    // while 循环
    let mut i = 0;
    while (i < 10) {
        i = i + 1;
    };

    // loop 无限循环
    let mut count = 0;
    loop {
        count = count + 1;
        if (count > 5) break;
    };
}
```

### 模式匹配（解构）

```move
struct Point has drop {
    x: u64,
    y: u64
}

fun pattern_matching() {
    let p = Point { x: 10, y: 20 };

    // 解构
    let Point { x, y } = p;

    // 部分解构
    let Point { x, y: _ } = p;

    // 在函数参数中解构
    fun get_x(Point { x, y: _ }: Point): u64 {
        x
    }
}
```

## 所有权和借用

在 Move 中，变量拥有对象，非 `copy` 类型赋值或传参会移动所有权，而通过 `&` 和 `&mut` 可以创建不可变或可变借用而不转移所有权。

> Move 的基本类型都是 `copy` 类型，所以它们赋值或传参不会移动所有权。

### 所有权规则

```move
module example::ownership {
    struct Resource has drop {
        value: u64
    }

    fun ownership_example() {
        let r = Resource { value: 100 };

        // 转移所有权
        let r2 = r;
        // r 不再可用！

        // ❌ 编译错误
        // let x = r.value;
    }
}
```

### 引用和借用

```move
module example::borrowing {
    struct Data has drop {
        value: u64
    }

    // 不可变借用
    fun read(data: &Data): u64 {
        data.value
    }

    // 可变借用
    fun write(data: &mut Data, new_value: u64) {
        data.value = new_value;
    }

    fun borrowing_example() {
        let mut d = Data { value: 10 };

        // 不可变借用
        let val = read(&d);

        // 可变借用
        write(&mut d, 20);
    }
}
```

**借用规则：**
1. ✅ 可以有多个不可变借用
2. ✅ 只能有一个可变借用
3. ❌ 不能同时有可变和不可变借用

## Sui 特定概念

### UID 和对象

在 Sui 中，链上资产都以对象（Object）的形式存在，而不是单纯的值。

对象是链上存储的实体，可以被拥有、转移、修改, 具有如下特征：

- 每个对象都有唯一标识符 `UID`
- 对象必须有能力 `has key`，才能在链上被引用或转移
- 对象可以包含数据字段（如 `struct` 字段）

```move
module example::sui_objects {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    // Sui 对象必须有 UID 字段
    struct MyObject has key {
        id: UID,
        value: u64
    }

    // 创建对象
    public entry fun create(value: u64, ctx: &mut TxContext) {
        let obj = MyObject {
            id: object::new(ctx),
            value
        };

        // 转移给调用者
        transfer::transfer(obj, tx_context::sender(ctx));
    }
}
```

### TxContext

`TxContext` 是**每一次交易自动注入**的特殊对象，负责提供交易元数据给你的 Move 合约。

TxContext 的作用（最重要的 4 个）:

- 生成全局唯一的 `UID`
- 获取交易发送者（signer）
- 记录 gas 信息
- 维护本次交易的内部事件和对象变更

```move
module example::tx_context_usage {
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::event;
    use std::string::String;

    /// 自定义事件
    struct MyEvent has copy, drop {
        message: String,
    }

    public entry fun example(ctx: &mut TxContext) {
        // 1. 创建对象 UID（Sui 对象必须有 UID）
        let uid: UID = object::new(ctx);

        // 2. 获取交易发送者（signer）
        let sender = tx_context::sender(ctx);

        // 3. 获取本次交易的 Gas 支付者
        let payer = tx_context::gas_payer(ctx);

        // 4. 获取 epoch（当前 Sui 网络的 epoch 号）
        let epoch = tx_context::epoch(ctx);

        // 5. 获取交易 digest（全局唯一标识交易的哈希）
        let digest = tx_context::digest(ctx);

        // 6. 发送一个事件
        event::emit(ctx, MyEvent {
            message: String::utf8(b"TxContext 示例完成")
        });
    }
}
```

> TxContext 是 Sui 为每笔交易注入的唯一、不可复制的上下文对象，用来生成 UID、获取交易发送者、处理 gas 和记录事件，是所有对象创建与权限验证的核心

## 泛型

### 泛型结构体

```move
module example::generics {
    // 泛型结构体
    struct Box<T> has store, drop {
        value: T
    }

    // 多个类型参数
    struct Pair<T, U> has store, drop {
        first: T,
        second: U
    }

    // 泛型函数
    public fun create_box<T>(value: T): Box<T> {
        Box { value }
    }

    // 类型约束
    public fun create_storable_box<T: store>(value: T): Box<T> {
        Box { value }
    }
}
```

### Phantom 类型参数

> Phantom 是零成本的类型标签，用来在编译期区分资源类型，而不会出现在链上，既安全又省 gas。

在 Sui 中，很多资源的结构体内容是一样的，但它们代表的含义不同，例如：

- SUI 代币
- USDT 代币
- 自己游戏里的 Gold、Gem
- Kiosk 中不同种类商品的 Key

默认情况下，你可能考虑给这个相同的结构体，添加一个 symbol 字段来区分，如

```move
struct Coin {
    id: UID,
    value: u64,
    symbol: String, // "SUI" / "USDT"
}
```

这样会出现问题：链上存储变大、成本变高、易伪造（symbol）、类型不安全。因此 Sui 选择用类型（phantom）代替字段。如下使用示例：

```move
module example::phantom {
    // Phantom 类型参数不影响结构体的能力
    struct Coin<phantom CoinType> has key, store {
        id: UID,
        value: u64
    }

    // 用于类型标记
    struct USD {}
    struct EUR {}

    public fun create_usd_coin(value: u64, ctx: &mut TxContext): Coin<USD> {
        Coin<USD> {
            id: object::new(ctx),
            value
        }
    }
}
```

Phantom 就像你物品上的“标签”，告诉别人这是鞋子、这是衣服；但标签不会跟你一起被装进箱子里。

Phantom 用于区分不同类型资源，只在编译期存在，不参与运行或存储，不额外占字节，不增加 gas 成本。

## 常量

```move
module example::constants {
    // 全局常量（必须是基本类型）
    const MAX_SUPPLY: u64 = 1_000_000;
    const DECIMALS: u8 = 9;
    const ADMIN: address = @0x1;

    // 错误码常量
    const EInsufficientBalance: u64 = 0;
    const EInvalidAmount: u64 = 1;

    public fun check_amount(amount: u64) {
        assert!(amount <= MAX_SUPPLY, EInvalidAmount);
    }
}
```

## 断言和错误处理

```move
module example::errors {
    const EInvalidValue: u64 = 0;
    const EDivisionByZero: u64 = 1;

    public fun divide(a: u64, b: u64): u64 {
        // assert! 宏用于检查条件
        assert!(b != 0, EDivisionByZero);

        a / b
    }

    public fun validate(value: u64) {
        // 条件失败时中止执行
        assert!(value > 0, EInvalidValue);
        assert!(value < 1000, EInvalidValue);
    }
}
```

## 测试

### 单元测试

在 Sui Move / Move 语言里，单元测试有两种写法，都可以，但各有优缺点：

**跟模块文件放在一起:**

- 测试代码紧邻模块，方便修改和维护
- 单元测试可以直接访问模块的私有函数（非 public）
- 编译器自动关联模块与测试

```move
module hello::hello {
    const EInvalidValue: u64 = 0;

    public fun say_hello(): vector<u8> {
        b"Hello, Move!"
    }

    fun validate(value: u64) {
        // 条件失败时中止执行
        assert!(value > 0, EInvalidValue);
        assert!(value < 1000, EInvalidValue);
    }

    #[test]
    fun test_validate() {
        validate(10); // 有效值
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_validate_invalid_low() {
        // 故意写错，预期会失败， abort_code 错误代码值
        validate(0); // 无效值，触发断言失败
    }
}
```

> `#[expected_failure(abort_code = 0)]` 是 Move 测试框架中的一个 测试标注（attribute），用于标记某个测试预期会失败，并且可以指定失败的原因。


**单独放在 tests/ 文件夹：**

- 测试和模块分离，模块代码更干净
- 适合大型项目或多人协作
- 可以模拟不同模块交互的场景

:::code-group

```move [tests/hello_test.move：]
module hello::hello_test {
    use hello::hello;

    #[test]
    fun test_say_hello() {
        let message = hello::say_hello();
        assert!(message == b"Hello, Move!", 1);
    }
}
```



:::

### 运行测试

```bash
# 运行所有测试
sui move test

# 运行特定测试
sui move test test_increment

# 显示详细输出
sui move test --verbose

# 代码覆盖率
sui move test --coverage
```

## 最佳实践

### 1. 命名规范

```move
// ✅ 好的命名
const MAX_SUPPLY: u64 = 1000;
struct UserProfile has key { id: UID }
public fun create_profile() {}

// ❌ 避免
const maxSupply: u64 = 1000;  // 常量用大写
struct userProfile has key { id: UID }  // 类型用大驼峰
public fun CreateProfile() {}  // 函数用蛇形命名
```

### 2. 错误码管理

```move
module example::errors {
    // 使用描述性的错误码名称
    const EInsufficientBalance: u64 = 0;
    const EUnauthorized: u64 = 1;
    const EInvalidAmount: u64 = 2;

    // 在文档中说明每个错误码
    /// 错误：余额不足
    /// 当用户试图花费超过其余额的金额时触发
    public fun transfer(amount: u64, balance: u64) {
        assert!(amount <= balance, EInsufficientBalance);
    }
}
```

### 3. 使用能力约束

```move
// ✅ 明确指定需要的能力
public fun store_value<T: store>(value: T) {
    // T 必须有 store 能力
}

// ✅ 资源类型不要随意添加 copy 或 drop
struct Asset has key {
    id: UID,
    value: u64
}
```

### 4. 文档注释

```move
/// 创建新的用户配置文件
///
/// # 参数
/// * `name` - 用户名称
/// * `age` - 用户年龄
/// * `ctx` - 交易上下文
///
/// # 示例
/// ```
/// create_profile(b"Alice", 25, ctx);
/// ```
public entry fun create_profile(
    name: vector<u8>,
    age: u8,
    ctx: &mut TxContext
) {
    // ...
}
```

## 常见问题

### Q1: Move 和 Solidity 的主要区别？

**A:** 主要区别：

| 特性 | Move | Solidity |
|------|------|----------|
| **资源模型** | 线性类型（不能复制） | 引用模型（可复制） |
| **重入攻击** | 结构上不可能 | 需要手动防护 |
| **泛型** | 支持 | 不支持 |
| **能力系统** | 显式声明 | 无 |

### Q2: 什么时候使用 `&` vs `&mut`？

**A:**
- `&` - 只读访问，可以有多个
- `&mut` - 可写访问，只能有一个

```move
fun read(data: &Data) {}      // 只读
fun write(data: &mut Data) {}  // 可写
```

### Q3: 为什么资源不能复制？

**A:** 这是 Move 的核心安全特性，防止资产被意外复制：

```move
struct Coin has key {  // 没有 copy 能力
    id: UID,
    value: u64
}

// ❌ 编译错误：无法复制 Coin
let coin2 = coin1;  // coin1 被移动，不是复制
```

### Q4: 如何调试 Move 代码？

**A:** 使用测试和调试工具：

```move
#[test]
fun debug_example() {
    use std::debug;

    let value = 42;
    debug::print(&value);  // 打印调试信息
}
```

### Q5: One-Time Witness (OTW) 是什么？

**A:** OTW 是一个特殊的类型，只能在模块初始化时创建一次：

```move
struct MY_MODULE has drop {}

fun init(witness: MY_MODULE, ctx: &mut TxContext) {
    // witness 保证只在 init 时存在
    // 常用于创建唯一的货币类型
}
```

## 参考资源

- [Move 语言书](https://move-book.com/)
- [Sui Move 官方文档](https://docs.sui.io/build/move)
- [Move 标准库](https://github.com/move-language/move/tree/main/language/move-stdlib/docs)
- [Sui Framework](https://github.com/MystenLabs/sui/tree/main/crates/sui-framework/docs)

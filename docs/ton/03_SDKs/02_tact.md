# Tact 语言

> TON 的现代智能合约语言

> [!IMPORTANT] 本节重点
> 1. Tact 的基本语法和数据类型有哪些？
> 2. 如何定义合约、结构体和消息？
> 3. Tact 的消息处理机制如何工作？
> 4. 如何编写测试和调试代码？
> 5. Tact 和 FunC 有什么区别？

## Tact 语言概述

**Tact** 是 TON 生态的高级智能合约语言，旨在提供更友好的开发体验：

- 🎯 **现代语法** - 类 TypeScript 风格，易于学习
- 🔒 **类型安全** - 静态类型检查
- ⚡ **高性能** - 编译为 FunC，再编译为 TVM 字节码
- 🛡️ **安全性** - 内置安全检查和最佳实践
- 📝 **简洁** - 自动生成样板代码

### Tact vs FunC vs Solidity

| 特性 | Tact | FunC | Solidity |
|------|------|------|----------|
| **学习曲线** | 低 | 中 | 低 |
| **语法风格** | TypeScript-like | C-like | JavaScript-like |
| **类型系统** | 静态 | 静态 | 静态 |
| **消息处理** | 自动 | 手动 | 自动 |
| **样板代码** | 少 | 多 | 中 |
| **性能** | 高 | 高 | 中 |

> [!IMPORTANT] 为什么选择 Tact？
> Tact 是为了降低 TON 开发门槛而设计的：
> - 自动处理消息序列化/反序列化
> - 自动生成 getter 函数
> - 内置常用模式（Deployable、Ownable）
> - 更好的错误提示

## 基本语法

### 注释

```tact
// 单行注释

/*
 * 多行注释
 * 第二行
 */

/// 文档注释
/// 描述函数功能
```

### 合约定义

```tact
contract MyContract {
    // 合约内容
}
```

### 导入

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

// 从其他文件导入
import "./helpers";
```

## 数据类型

### 基本类型

```tact
contract Types {
    // 整数类型
    intValue: Int;              // 257 位有符号整数
    int32Value: Int as int32;   // 32 位有符号整数
    uint64Value: Int as uint64; // 64 位无符号整数
    
    // 布尔类型
    boolValue: Bool;
    
    // 地址类型
    addressValue: Address;
    
    // 字符串类型
    stringValue: String;
    
    // Cell 类型
    cellValue: Cell;
    
    // Slice 类型
    sliceValue: Slice;
    
    // Builder 类型
    builderValue: Builder;
    
    init() {
        self.intValue = 0;
        self.boolValue = true;
        self.addressValue = myAddress();
        self.stringValue = "Hello";
        self.cellValue = emptyCell();
        self.sliceValue = emptySlice();
        self.builderValue = beginCell();
    }
}
```

### 整数类型修饰符

```tact
contract IntegerTypes {
    // 有符号整数
    int8: Int as int8;      // -128 到 127
    int16: Int as int16;    // -32,768 到 32,767
    int32: Int as int32;    // -2^31 到 2^31-1
    int64: Int as int64;    // -2^63 到 2^63-1
    int128: Int as int128;
    int256: Int as int256;
    
    // 无符号整数
    uint8: Int as uint8;    // 0 到 255
    uint16: Int as uint16;  // 0 到 65,535
    uint32: Int as uint32;  // 0 到 2^32-1
    uint64: Int as uint64;  // 0 到 2^64-1
    uint128: Int as uint128;
    uint256: Int as uint256;
    
    // Coins 类型（nanotons）
    balance: Int as coins;
    
    init() {
        self.int8 = 0;
        self.uint8 = 0;
        self.balance = ton("1.5");  // 1.5 TON
    }
}
```

### 可选类型

```tact
contract OptionalTypes {
    // 可选类型（可以为 null）
    optionalInt: Int?;
    optionalAddress: Address?;
    optionalString: String?;
    
    init() {
        self.optionalInt = null;
        self.optionalAddress = null;
        self.optionalString = null;
    }
    
    receive("set") {
        self.optionalInt = 42;
        self.optionalAddress = sender();
    }
    
    receive("clear") {
        self.optionalInt = null;
    }
    
    get fun hasValue(): Bool {
        return self.optionalInt != null;
    }
}
```

### Map 类型

```tact
contract MapTypes {
    // Map<Key, Value>
    balances: map<Address, Int>;
    names: map<Address, String>;
    flags: map<Int, Bool>;
    
    init() {
        // Map 自动初始化为空
    }
    
    receive("add") {
        let addr = sender();
        self.balances.set(addr, 100);
        self.names.set(addr, "Alice");
    }
    
    get fun getBalance(addr: Address): Int? {
        return self.balances.get(addr);
    }
}
```

## 结构体和消息

### 定义结构体

```tact
// 基本结构体
struct User {
    address: Address;
    balance: Int as coins;
    name: String;
}

// 嵌套结构体
struct Profile {
    user: User;
    level: Int as uint32;
    active: Bool;
}

// 使用结构体
contract UserManager {
    users: map<Address, User>;
    
    init() {}
    
    receive("register") {
        let user = User{
            address: sender(),
            balance: 0,
            name: "New User"
        };
        self.users.set(sender(), user);
    }
}
```

### 定义消息

```tact
// 简单消息
message Add {
    amount: Int as uint32;
}

// 复杂消息
message Transfer {
    to: Address;
    amount: Int as coins;
    comment: String?;
}

// 使用消息
contract Counter {
    counter: Int as uint32;
    
    init() {
        self.counter = 0;
    }
    
    receive(msg: Add) {
        self.counter += msg.amount;
    }
    
    receive(msg: Transfer) {
        // 处理转账
        require(msg.amount > 0, "Amount must be positive");
        // ...
    }
}
```

## 合约

### 基础合约

```tact
contract Counter {
    // 状态变量
    counter: Int as uint32;
    owner: Address;
    
    // 初始化函数（部署时调用一次）
    init(initialValue: Int) {
        self.counter = initialValue;
        self.owner = sender();
    }
    
    // 接收文本消息
    receive("increment") {
        self.counter += 1;
    }
    
    receive("decrement") {
        require(self.counter > 0, "Counter cannot be negative");
        self.counter -= 1;
    }
    
    // 接收结构化消息
    receive(msg: Add) {
        self.counter += msg.amount;
    }
    
    // Getter 函数
    get fun counter(): Int {
        return self.counter;
    }
    
    get fun owner(): Address {
        return self.owner;
    }
}
```

### 使用 Trait

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

// Deployable trait 提供部署功能
// Ownable trait 提供所有权管理
contract MyContract with Deployable, Ownable {
    owner: Address;
    value: Int as uint32;
    
    init(owner: Address) {
        self.owner = owner;
        self.value = 0;
    }
    
    receive("increment") {
        self.requireOwner();  // 来自 Ownable trait
        self.value += 1;
    }
    
    get fun value(): Int {
        return self.value;
    }
}
```

### 常用 Trait

```tact
// Deployable - 部署功能
trait Deployable {
    receive(msg: Deploy) {
        self.notify("Deployed".asComment());
    }
}

// Ownable - 所有权管理
trait Ownable {
    owner: Address;
    
    fun requireOwner() {
        require(sender() == self.owner, "Not owner");
    }
    
    receive(msg: ChangeOwner) {
        self.requireOwner();
        self.owner = msg.newOwner;
    }
}

// Stoppable - 可暂停
trait Stoppable with Ownable {
    stopped: Bool;
    
    fun requireNotStopped() {
        require(!self.stopped, "Contract is stopped");
    }
    
    receive("stop") {
        self.requireOwner();
        self.stopped = true;
    }
    
    receive("resume") {
        self.requireOwner();
        self.stopped = false;
    }
}
```

## 函数

### 函数类型

```tact
contract Functions {
    value: Int;
    
    init() {
        self.value = 0;
    }
    
    // Getter 函数（只读）
    get fun getValue(): Int {
        return self.value;
    }
    
    // 内部函数（私有）
    fun internalFunction(x: Int): Int {
        return x * 2;
    }
    
    // 接收函数（处理消息）
    receive("update") {
        self.value = self.internalFunction(10);
    }
}
```

### 函数参数和返回值

```tact
contract FunctionExamples {
    // 单个返回值
    fun add(a: Int, b: Int): Int {
        return a + b;
    }
    
    // 多个返回值
    fun divmod(a: Int, b: Int): (Int, Int) {
        return (a / b, a % b);
    }
    
    // 可选返回值
    fun findValue(key: Int): Int? {
        // ...
        return null;
    }
    
    // 使用多返回值
    receive("calculate") {
        let (quotient, remainder) = self.divmod(10, 3);
        // quotient = 3, remainder = 1
    }
}
```

## 消息处理

### 接收消息

```tact
message Add {
    amount: Int as uint32;
}

message Subtract {
    amount: Int as uint32;
}

contract MessageHandler {
    counter: Int as uint32;
    
    init() {
        self.counter = 0;
    }
    
    // 接收文本消息
    receive("reset") {
        self.counter = 0;
    }
    
    // 接收结构化消息
    receive(msg: Add) {
        self.counter += msg.amount;
    }
    
    receive(msg: Subtract) {
        require(self.counter >= msg.amount, "Insufficient value");
        self.counter -= msg.amount;
    }
    
    // 接收空消息（接收 TON）
    receive() {
        // 处理纯 TON 转账
    }
}
```

### 发送消息

```tact
message Notify {
    message: String;
}

contract MessageSender {
    owner: Address;
    
    init(owner: Address) {
        self.owner = owner;
    }
    
    receive("notify") {
        // 发送消息
        send(SendParameters{
            to: self.owner,
            value: ton("0.01"),
            mode: SendIgnoreErrors,
            body: Notify{
                message: "Hello from contract"
            }.toCell()
        });
    }
    
    receive("transfer") {
        // 发送 TON
        send(SendParameters{
            to: self.owner,
            value: ton("1"),
            mode: SendIgnoreErrors,
            body: "Payment".asComment()
        });
    }
}
```

### 发送模式

```tact
contract SendModes {
    receive("examples") {
        // 忽略错误
        send(SendParameters{
            to: sender(),
            value: ton("0.1"),
            mode: SendIgnoreErrors
        });
        
        // 支付转账费用
        send(SendParameters{
            to: sender(),
            value: ton("0.1"),
            mode: SendPayGasSeparately
        });
        
        // 发送剩余余额
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance
        });
        
        // 销毁合约并发送所有余额
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero
        });
    }
}
```

## 控制流

### 条件语句

```tact
contract Conditionals {
    value: Int;
    
    init() {
        self.value = 0;
    }
    
    receive("check") {
        // if-else
        if (self.value > 10) {
            self.value = 10;
        } else if (self.value < 0) {
            self.value = 0;
        } else {
            self.value += 1;
        }
    }
    
    get fun status(): String {
        // 三元运算符
        return self.value > 5 ? "High" : "Low";
    }
}
```

### 循环

```tact
contract Loops {
    sum: Int;
    
    init() {
        self.sum = 0;
    }
    
    receive("calculate") {
        // repeat 循环（固定次数）
        repeat (10) {
            self.sum += 1;
        }
        
        // while 循环
        let mut i = 0;
        while (i < 10) {
            self.sum += i;
            i += 1;
        }
        
        // until 循环
        let mut j = 0;
        do {
            self.sum += j;
            j += 1;
        } until (j >= 10);
    }
}
```

### 断言和错误处理

```tact
contract ErrorHandling {
    balance: Int as coins;
    
    init() {
        self.balance = 0;
    }
    
    receive("withdraw") {
        // require - 条件检查
        require(self.balance > 0, "Insufficient balance");
        
        // 发送余额
        send(SendParameters{
            to: sender(),
            value: self.balance,
            mode: SendIgnoreErrors
        });
        
        self.balance = 0;
    }
    
    receive("deposit") {
        let amount = context().value;
        
        // 多个检查
        require(amount > 0, "Amount must be positive");
        require(amount <= ton("100"), "Amount too large");
        
        self.balance += amount;
    }
}
```

## 内置函数

### 上下文函数

```tact
contract ContextFunctions {
    receive("info") {
        // 获取发送者地址
        let from = sender();
        
        // 获取合约地址
        let me = myAddress();
        
        // 获取余额
        let balance = myBalance();
        
        // 获取消息值
        let value = context().value;
        
        // 获取当前时间
        let now = now();
    }
}
```

### 数学函数

```tact
contract MathFunctions {
    get fun examples(): Int {
        // 最小值/最大值
        let min = min(10, 20);  // 10
        let max = max(10, 20);  // 20
        
        // 绝对值
        let abs = abs(-10);  // 10
        
        // 幂运算
        let pow = pow(2, 10);  // 1024
        
        return min + max + abs + pow;
    }
}
```

### 字符串函数

```tact
contract StringFunctions {
    get fun examples(): String {
        let s1 = "Hello";
        let s2 = "World";
        
        // 字符串拼接
        let s3 = s1 + " " + s2;  // "Hello World"
        
        // 转换为 Comment
        let comment = s3.asComment();
        
        return s3;
    }
}
```

### Cell 操作

```tact
contract CellOperations {
    receive("cell") {
        // 创建 Builder
        let b = beginCell();
        
        // 存储数据
        b = b.storeUint(123, 32);
        b = b.storeAddress(sender());
        b = b.storeCoins(ton("1"));
        
        // 转换为 Cell
        let c = b.endCell();
        
        // 解析 Cell
        let s = c.beginParse();
        let value = s.loadUint(32);
        let addr = s.loadAddress();
        let amount = s.loadCoins();
    }
}
```

## 完整示例

### Jetton 合约

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    to: Address;
    amount: Int as coins;
}

message Transfer {
    to: Address;
    amount: Int as coins;
    forwardPayload: Cell?;
}

message Burn {
    amount: Int as coins;
}

contract JettonMaster with Deployable, Ownable {
    owner: Address;
    totalSupply: Int as coins;
    mintable: Bool;
    
    init(owner: Address) {
        self.owner = owner;
        self.totalSupply = 0;
        self.mintable = true;
    }
    
    receive(msg: Mint) {
        self.requireOwner();
        require(self.mintable, "Minting is disabled");
        
        self.totalSupply += msg.amount;
        
        // 发送到 Jetton Wallet
        let walletInit = initOf JettonWallet(myAddress(), msg.to);
        send(SendParameters{
            to: contractAddress(walletInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: walletInit.code,
            data: walletInit.data,
            body: InternalTransfer{
                amount: msg.amount,
                from: myAddress()
            }.toCell()
        });
    }
    
    receive("stop_mint") {
        self.requireOwner();
        self.mintable = false;
    }
    
    get fun totalSupply(): Int {
        return self.totalSupply;
    }
    
    get fun mintable(): Bool {
        return self.mintable;
    }
}

message InternalTransfer {
    amount: Int as coins;
    from: Address;
}

contract JettonWallet {
    master: Address;
    owner: Address;
    balance: Int as coins;
    
    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.balance = 0;
    }
    
    receive(msg: InternalTransfer) {
        require(sender() == self.master, "Only master can mint");
        self.balance += msg.amount;
    }
    
    receive(msg: Transfer) {
        require(sender() == self.owner, "Only owner can transfer");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance -= msg.amount;
        
        let walletInit = initOf JettonWallet(self.master, msg.to);
        send(SendParameters{
            to: contractAddress(walletInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: walletInit.code,
            data: walletInit.data,
            body: InternalTransfer{
                amount: msg.amount,
                from: self.owner
            }.toCell()
        });
    }
    
    receive(msg: Burn) {
        require(sender() == self.owner, "Only owner can burn");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance -= msg.amount;
        
        send(SendParameters{
            to: self.master,
            value: ton("0.01"),
            mode: SendIgnoreErrors,
            body: BurnNotification{
                amount: msg.amount,
                owner: self.owner
            }.toCell()
        });
    }
    
    get fun balance(): Int {
        return self.balance;
    }
    
    get fun owner(): Address {
        return self.owner;
    }
}

message BurnNotification {
    amount: Int as coins;
    owner: Address;
}
```

### NFT 合约

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    to: Address;
    metadata: Cell;
}

message Transfer {
    newOwner: Address;
}

contract NFTCollection with Deployable, Ownable {
    owner: Address;
    nextItemIndex: Int as uint64;
    collectionContent: Cell;
    
    init(owner: Address, collectionContent: Cell) {
        self.owner = owner;
        self.nextItemIndex = 0;
        self.collectionContent = collectionContent;
    }
    
    receive(msg: Mint) {
        self.requireOwner();
        
        let itemInit = initOf NFTItem(myAddress(), self.nextItemIndex);
        send(SendParameters{
            to: contractAddress(itemInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: itemInit.code,
            data: itemInit.data,
            body: InitNFT{
                owner: msg.to,
                content: msg.metadata
            }.toCell()
        });
        
        self.nextItemIndex += 1;
    }
    
    get fun nextItemIndex(): Int {
        return self.nextItemIndex;
    }
    
    get fun collectionContent(): Cell {
        return self.collectionContent;
    }
}

message InitNFT {
    owner: Address;
    content: Cell;
}

contract NFTItem {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    content: Cell;
    
    init(collection: Address, index: Int) {
        self.collection = collection;
        self.index = index;
        self.owner = collection;  // 临时所有者
        self.content = emptyCell();
    }
    
    receive(msg: InitNFT) {
        require(sender() == self.collection, "Only collection can init");
        self.owner = msg.owner;
        self.content = msg.content;
    }
    
    receive(msg: Transfer) {
        require(sender() == self.owner, "Only owner can transfer");
        self.owner = msg.newOwner;
    }
    
    get fun owner(): Address {
        return self.owner;
    }
    
    get fun content(): Cell {
        return self.content;
    }
}
```

## 测试

### 编写测试

```tact
import "@stdlib/deploy";

contract Counter {
    counter: Int as uint32;
    
    init() {
        self.counter = 0;
    }
    
    receive("increment") {
        self.counter += 1;
    }
    
    get fun counter(): Int {
        return self.counter;
    }
}
```

测试文件 `tests/Counter.spec.ts`：

```typescript
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Counter } from '../wrappers/Counter';
import '@ton/test-utils';

describe('Counter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counter: SandboxContract<Counter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        counter = blockchain.openContract(await Counter.fromInit());

        const deployResult = await counter.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counter.address,
            deploy: true,
            success: true,
        });
    });

    it('should increment', async () => {
        await counter.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            'increment'
        );

        const counterValue = await counter.getCounter();
        expect(counterValue).toEqual(1n);
    });
});
```

## 最佳实践

### 1. 命名规范

```tact
// ✅ 好的命名
const MaxSupply: Int = 1000;
struct UserProfile { address: Address }
message Transfer { to: Address }

// ❌ 避免
const max_supply: Int = 1000;  // 常量用大驼峰
struct userProfile { address: Address }  // 类型用大驼峰
message transfer { to: Address }  // 消息用大驼峰
```

### 2. 错误处理

```tact
contract ErrorHandling {
    receive("withdraw") {
        // 使用描述性错误消息
        require(myBalance() > 0, "Insufficient balance");
        require(sender() == self.owner, "Not authorized");
    }
}
```

### 3. Gas 优化

```tact
contract GasOptimization {
    // ✅ 使用合适的整数类型
    counter: Int as uint32;  // 而不是 Int
    
    // ✅ 避免不必要的存储
    receive("calculate") {
        let temp = self.counter * 2;  // 临时变量
        // 不要存储临时计算结果
    }
}
```

### 4. 安全检查

```tact
contract Security {
    owner: Address;
    
    receive("admin") {
        // 总是检查权限
        require(sender() == self.owner, "Not owner");
        
        // 检查金额
        require(context().value >= ton("0.1"), "Insufficient payment");
    }
}
```

## 常见问题

### Q1: Tact 和 FunC 的主要区别？

**A:** 主要区别：

| 特性 | Tact | FunC |
|------|------|------|
| **语法** | 现代、简洁 | 类 C |
| **学习曲线** | 低 | 中 |
| **样板代码** | 少 | 多 |
| **消息处理** | 自动 | 手动 |
| **性能** | 相同（编译为 FunC） | 高 |

### Q2: 如何在 Tact 中处理大整数？

**A:** Tact 的 Int 类型是 257 位有符号整数，可以处理非常大的数：

```tact
let big = pow(2, 256);  // 支持
```

### Q3: 如何调试 Tact 合约？

**A:** 使用 Sandbox 测试：

```typescript
const result = await contract.send(/* ... */);
console.log(result.transactions);
```

### Q4: Tact 支持继承吗？

**A:** Tact 使用 Trait 而不是继承：

```tact
contract MyContract with Deployable, Ownable {
    // 组合多个 trait
}
```

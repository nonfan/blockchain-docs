# FunC 语言

> TON 的原生智能合约语言

> [!IMPORTANT] 本节重点
> 1. FunC 的基本语法和数据类型有哪些？
> 2. 如何处理 Cell 和 Slice？
> 3. 如何编写消息处理函数？
> 4. FunC 的最佳实践是什么？
> 5. FunC 和 Tact 有什么区别？

## FunC 语言概述

**FunC** 是 TON 区块链的原生智能合约语言，直接编译为 TVM 字节码：

- ⚡ **高性能** - 直接编译为 TVM 字节码
- 🎯 **底层控制** - 完全控制 Cell 操作
- 🔧 **灵活性** - 适合复杂逻辑
- 📝 **类 C 语法** - 熟悉的语法风格
- 🛡️ **成熟稳定** - TON 生态的基础语言

### FunC vs Tact vs Solidity

| 特性 | FunC | Tact | Solidity |
|------|------|------|----------|
| **学习曲线** | 中 | 低 | 低 |
| **语法风格** | C-like | TypeScript-like | JavaScript-like |
| **性能** | 最高 | 高 | 中 |
| **开发速度** | 慢 | 快 | 中 |
| **灵活性** | 最高 | 中 | 中 |
| **适用场景** | 复杂协议 | 快速开发 | 通用 |

> [!IMPORTANT] 为什么学习 FunC？
> - Tact 最终编译为 FunC
> - 理解底层机制有助于优化
> - 某些复杂场景只能用 FunC
> - TON 核心合约都用 FunC 编写

## 基本语法

### 注释

```func
;; 单行注释

{-
  多行注释
  第二行
-}
```

### 函数定义

```func
;; 基本函数
int add(int a, int b) {
    return a + b;
}

;; 内联函数（编译时展开）
int multiply(int a, int b) inline {
    return a * b;
}

;; impure 函数（有副作用，如修改存储）
() save_data(int value) impure {
    set_data(begin_cell().store_uint(value, 32).end_cell());
}

;; method_id 函数（可被外部调用的 getter）
int get_counter() method_id {
    slice ds = get_data().begin_parse();
    return ds~load_uint(32);
}
```

### 变量和类型

```func
() variables() {
    ;; 整数（257 位有符号）
    int a = 10;
    int b = -5;
    
    ;; Cell（不可变数据容器）
    cell c = begin_cell().store_uint(123, 32).end_cell();
    
    ;; Slice（用于读取 Cell）
    slice s = c.begin_parse();
    
    ;; Builder（用于构建 Cell）
    builder b = begin_cell();
    
    ;; 元组
    [int, int] pair = [1, 2];
    (int, int, int) triple = (1, 2, 3);
}
```

## 数据类型

### 整数类型

```func
() integer_types() {
    ;; FunC 只有一种整数类型：257 位有符号整数
    int x = 100;
    int y = -50;
    
    ;; 十六进制
    int hex = 0xFF;
    
    ;; 二进制
    int bin = 0b1010;
    
    ;; 大整数
    int big = 1000000000000000000;
}
```

### Cell 类型

Cell 是 TON 的基础数据结构：

```func
() cell_operations() {
    ;; 创建 Builder
    builder b = begin_cell();
    
    ;; 存储数据
    b = b.store_uint(123, 32);        ;; 存储 32 位无符号整数
    b = b.store_int(-456, 32);        ;; 存储 32 位有符号整数
    b = b.store_coins(1000000000);    ;; 存储金额（nanotons）
    b = b.store_slice(some_slice);    ;; 存储 Slice
    
    ;; 转换为 Cell
    cell c = b.end_cell();
    
    ;; 存储引用（嵌套 Cell）
    cell inner = begin_cell().store_uint(1, 8).end_cell();
    cell outer = begin_cell().store_ref(inner).end_cell();
}
```

### Slice 类型

Slice 用于读取 Cell 中的数据：

```func
() slice_operations() {
    cell c = begin_cell()
        .store_uint(123, 32)
        .store_int(-456, 32)
        .store_coins(1000000000)
        .end_cell();
    
    ;; 创建 Slice
    slice s = c.begin_parse();
    
    ;; 读取数据（使用 ~ 修饰符会修改 slice）
    int value1 = s~load_uint(32);
    int value2 = s~load_int(32);
    int coins = s~load_coins();
    
    ;; 检查是否为空
    if (s.slice_empty?()) {
        ;; Slice 已读完
    }
    
    ;; 读取引用
    cell ref = s~load_ref();
}
```

### 元组类型

```func
() tuple_operations() {
    ;; 创建元组
    [int, int] pair = [1, 2];
    (int, int, int) triple = (1, 2, 3);
    
    ;; 解构元组
    (int a, int b) = pair;
    
    ;; 嵌套元组
    [[int, int], int] nested = [[1, 2], 3];
}
```

## 存储操作

### 加载和保存数据

```func
;; 存储结构：counter:uint32 owner:MsgAddress

;; 加载数据
(int, slice) load_data() inline {
    slice ds = get_data().begin_parse();
    return (
        ds~load_uint(32),      ;; counter
        ds~load_msg_addr()     ;; owner
    );
}

;; 保存数据
() save_data(int counter, slice owner) impure inline {
    set_data(begin_cell()
        .store_uint(counter, 32)
        .store_slice(owner)
        .end_cell()
    );
}
```

### 复杂存储结构

```func
;; 存储结构：
;; total_supply:Coins
;; admin:MsgAddress
;; content:^Cell
;; jetton_wallet_code:^Cell

(int, slice, cell, cell) load_data() inline {
    slice ds = get_data().begin_parse();
    return (
        ds~load_coins(),       ;; total_supply
        ds~load_msg_addr(),    ;; admin
        ds~load_ref(),         ;; content
        ds~load_ref()          ;; jetton_wallet_code
    );
}

() save_data(int total_supply, slice admin, cell content, cell code) impure inline {
    set_data(begin_cell()
        .store_coins(total_supply)
        .store_slice(admin)
        .store_ref(content)
        .store_ref(code)
        .end_cell()
    );
}
```

## 消息处理

### recv_internal 函数

```func
() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    ;; 空消息直接返回
    if (in_msg_body.slice_empty?()) {
        return ();
    }
    
    ;; 解析消息头
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    slice sender_address = cs~load_msg_addr();
    
    ;; 解析操作码
    int op = in_msg_body~load_uint(32);
    int query_id = in_msg_body~load_uint(64);
    
    ;; 加载合约数据
    (int counter, slice owner) = load_data();
    
    ;; 处理不同操作
    if (op == 1) {  ;; increment
        counter += 1;
        save_data(counter, owner);
        return ();
    }
    
    if (op == 2) {  ;; set_counter (only owner)
        throw_unless(401, equal_slices(sender_address, owner));
        int new_counter = in_msg_body~load_uint(32);
        save_data(new_counter, owner);
        return ();
    }
    
    throw(0xffff);  ;; 未知操作
}
```

### recv_external 函数

```func
() recv_external(slice in_msg) impure {
    ;; 处理外部消息（如钱包签名）
    
    ;; 验证签名
    slice signature = in_msg~load_bits(512);
    slice cs = in_msg;
    
    ;; 加载数据
    (int seqno, slice public_key) = load_data();
    
    ;; 验证 seqno
    int msg_seqno = cs~load_uint(32);
    throw_unless(33, msg_seqno == seqno);
    
    ;; 验证签名
    throw_unless(34, check_signature(slice_hash(cs), signature, public_key));
    
    ;; 接受消息
    accept_message();
    
    ;; 更新 seqno
    save_data(seqno + 1, public_key);
    
    ;; 处理消息
    ;; ...
}
```

## 发送消息

### 基础发送

```func
() send_ton(slice to_address, int amount) impure {
    var msg = begin_cell()
        .store_uint(0x18, 6)           ;; flags
        .store_slice(to_address)       ;; 目标地址
        .store_coins(amount)           ;; 金额
        .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)  ;; 默认值
        .end_cell();
    
    send_raw_message(msg, 1);  ;; mode: 1 = 支付转账费用
}
```

### 发送带消息体

```func
() send_message_with_body(slice to_address, int amount, cell body) impure {
    var msg = begin_cell()
        .store_uint(0x18, 6)
        .store_slice(to_address)
        .store_coins(amount)
        .store_uint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)  ;; 有消息体
        .store_ref(body)
        .end_cell();
    
    send_raw_message(msg, 1);
}
```

### 发送模式

```func
() send_modes() impure {
    slice addr = ...;
    int amount = 1000000000;  ;; 1 TON
    
    ;; mode 0: 普通发送
    send_raw_message(msg, 0);
    
    ;; mode 1: 支付转账费用
    send_raw_message(msg, 1);
    
    ;; mode 2: 忽略错误
    send_raw_message(msg, 2);
    
    ;; mode 64: 发送剩余余额
    send_raw_message(msg, 64);
    
    ;; mode 128: 发送所有余额并销毁合约
    send_raw_message(msg, 128);
    
    ;; 组合模式
    send_raw_message(msg, 1 + 2);  ;; 支付费用 + 忽略错误
}
```

## 标准库函数

### 数学函数

```func
() math_functions() {
    ;; 基本运算
    int sum = 10 + 20;
    int diff = 30 - 10;
    int prod = 5 * 6;
    int quot = 20 / 4;
    int rem = 23 % 5;
    
    ;; 位运算
    int and = 0xFF & 0x0F;
    int or = 0xF0 | 0x0F;
    int xor = 0xFF ^ 0x0F;
    int not = ~ 0xFF;
    int lshift = 1 << 8;
    int rshift = 256 >> 4;
    
    ;; 比较
    int eq = (10 == 10);
    int ne = (10 != 20);
    int lt = (10 < 20);
    int le = (10 <= 20);
    int gt = (20 > 10);
    int ge = (20 >= 10);
}
```

### 字符串函数

```func
() string_functions() {
    ;; 字符串字面量（实际是 Slice）
    slice s = "Hello, TON!";
    
    ;; 比较字符串
    if (equal_slices(s1, s2)) {
        ;; 字符串相等
    }
}
```

### 哈希函数

```func
() hash_functions() {
    cell c = begin_cell().store_uint(123, 32).end_cell();
    slice s = c.begin_parse();
    
    ;; Cell 哈希
    int cell_hash_value = cell_hash(c);
    
    ;; Slice 哈希
    int slice_hash_value = slice_hash(s);
    
    ;; 字符串哈希
    int string_hash_value = string_hash("Hello");
}
```

### 签名验证

```func
() signature_verification() {
    slice public_key = ...;
    slice signature = ...;
    slice data = ...;
    
    ;; 验证签名
    int valid = check_signature(slice_hash(data), signature, public_key);
    
    if (valid) {
        ;; 签名有效
    }
}
```

## 控制流

### 条件语句

```func
() conditionals(int x) {
    ;; if-else
    if (x > 10) {
        ;; x > 10
    } elseif (x > 5) {
        ;; 5 < x <= 10
    } else {
        ;; x <= 5
    }
    
    ;; 三元运算符
    int result = x > 0 ? 1 : -1;
}
```

### 循环

```func
() loops() {
    ;; while 循环
    int i = 0;
    while (i < 10) {
        i += 1;
    }
    
    ;; do-while 循环
    int j = 0;
    do {
        j += 1;
    } until (j >= 10);
    
    ;; repeat 循环
    int k = 0;
    repeat (10) {
        k += 1;
    }
}
```

### 断言和错误

```func
() error_handling() {
    ;; throw - 抛出错误
    throw(100);
    
    ;; throw_if - 条件为真时抛出
    throw_if(101, condition);
    
    ;; throw_unless - 条件为假时抛出
    throw_unless(102, condition);
}
```

## 完整示例

### Counter 合约

```func
#include "imports/stdlib.fc";

;; 存储: counter:uint32 owner:MsgAddress

(int, slice) load_data() inline {
    slice ds = get_data().begin_parse();
    return (ds~load_uint(32), ds~load_msg_addr());
}

() save_data(int counter, slice owner) impure inline {
    set_data(begin_cell()
        .store_uint(counter, 32)
        .store_slice(owner)
        .end_cell()
    );
}

() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    if (in_msg_body.slice_empty?()) {
        return ();
    }
    
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    slice sender = cs~load_msg_addr();
    
    int op = in_msg_body~load_uint(32);
    int query_id = in_msg_body~load_uint(64);
    
    (int counter, slice owner) = load_data();
    
    if (op == 1) {  ;; increment
        save_data(counter + 1, owner);
        return ();
    }
    
    if (op == 2) {  ;; decrement
        throw_unless(400, counter > 0);
        save_data(counter - 1, owner);
        return ();
    }
    
    if (op == 3) {  ;; reset (only owner)
        throw_unless(401, equal_slices(sender, owner));
        save_data(0, owner);
        return ();
    }
    
    throw(0xffff);
}

;; Get methods

int get_counter() method_id {
    (int counter, _) = load_data();
    return counter;
}

slice get_owner() method_id {
    (_, slice owner) = load_data();
    return owner;
}
```

### Jetton Wallet 合约

```func
#include "imports/stdlib.fc";
#include "imports/jetton-utils.fc";

;; 存储: balance:Coins owner:MsgAddress jetton_master:MsgAddress

(int, slice, slice) load_data() inline {
    slice ds = get_data().begin_parse();
    return (
        ds~load_coins(),       ;; balance
        ds~load_msg_addr(),    ;; owner
        ds~load_msg_addr()     ;; jetton_master
    );
}

() save_data(int balance, slice owner, slice jetton_master) impure inline {
    set_data(begin_cell()
        .store_coins(balance)
        .store_slice(owner)
        .store_slice(jetton_master)
        .end_cell()
    );
}

() send_tokens(slice to_address, int amount, slice response_address, int forward_ton_amount, slice forward_payload) impure {
    cell state_init = calculate_jetton_wallet_state_init(to_address, jetton_master, jetton_wallet_code);
    slice to_wallet_address = calculate_jetton_wallet_address(state_init);
    
    cell msg_body = begin_cell()
        .store_uint(op::internal_transfer(), 32)
        .store_uint(0, 64)
        .store_coins(amount)
        .store_slice(owner)
        .store_slice(response_address)
        .store_coins(forward_ton_amount)
        .store_slice(forward_payload)
        .end_cell();
    
    var msg = begin_cell()
        .store_uint(0x18, 6)
        .store_slice(to_wallet_address)
        .store_coins(0)
        .store_uint(4 + 2 + 1, 1 + 4 + 4 + 64 + 32 + 1 + 1 + 1)
        .store_ref(state_init)
        .store_ref(msg_body);
    
    send_raw_message(msg.end_cell(), 64);
}

() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    if (in_msg_body.slice_empty?()) {
        return ();
    }
    
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    slice sender_address = cs~load_msg_addr();
    
    int op = in_msg_body~load_uint(32);
    int query_id = in_msg_body~load_uint(64);
    
    (int balance, slice owner, slice jetton_master) = load_data();
    
    if (op == op::transfer()) {
        throw_unless(705, equal_slices(sender_address, owner));
        
        int jetton_amount = in_msg_body~load_coins();
        slice to_address = in_msg_body~load_msg_addr();
        slice response_address = in_msg_body~load_msg_addr();
        int forward_ton_amount = in_msg_body~load_coins();
        slice forward_payload = in_msg_body;
        
        throw_unless(706, balance >= jetton_amount);
        
        balance -= jetton_amount;
        save_data(balance, owner, jetton_master);
        
        send_tokens(to_address, jetton_amount, response_address, forward_ton_amount, forward_payload);
        return ();
    }
    
    if (op == op::internal_transfer()) {
        throw_unless(707, equal_slices(sender_address, jetton_master));
        
        int jetton_amount = in_msg_body~load_coins();
        slice from_address = in_msg_body~load_msg_addr();
        
        balance += jetton_amount;
        save_data(balance, owner, jetton_master);
        return ();
    }
    
    if (op == op::burn()) {
        throw_unless(708, equal_slices(sender_address, owner));
        
        int jetton_amount = in_msg_body~load_coins();
        slice response_address = in_msg_body~load_msg_addr();
        
        throw_unless(709, balance >= jetton_amount);
        
        balance -= jetton_amount;
        save_data(balance, owner, jetton_master);
        
        ;; 通知 master
        var msg_body = begin_cell()
            .store_uint(op::burn_notification(), 32)
            .store_uint(query_id, 64)
            .store_coins(jetton_amount)
            .store_slice(owner)
            .store_slice(response_address)
            .end_cell();
        
        var msg = begin_cell()
            .store_uint(0x18, 6)
            .store_slice(jetton_master)
            .store_coins(0)
            .store_uint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .store_ref(msg_body);
        
        send_raw_message(msg.end_cell(), 64);
        return ();
    }
    
    throw(0xffff);
}

;; Get methods

(int, slice, slice, cell) get_wallet_data() method_id {
    (int balance, slice owner, slice jetton_master) = load_data();
    return (balance, owner, jetton_master, jetton_wallet_code);
}
```

## 最佳实践

### 1. 使用 inline 函数

```func
;; ✅ 使用 inline 减少函数调用开销
(int, slice) load_data() inline {
    slice ds = get_data().begin_parse();
    return (ds~load_uint(32), ds~load_msg_addr());
}
```

### 2. 错误码管理

```func
;; ✅ 使用常量定义错误码
const error::insufficient_balance = 100;
const error::unauthorized = 401;
const error::invalid_op = 0xffff;

() transfer() impure {
    throw_unless(error::unauthorized, equal_slices(sender, owner));
    throw_unless(error::insufficient_balance, balance >= amount);
}
```

### 3. Gas 优化

```func
;; ✅ 避免不必要的 Cell 创建
() bad_example() impure {
    cell c = begin_cell().store_uint(1, 32).end_cell();
    ;; 只用一次就丢弃
}

;; ✅ 直接在需要的地方构建
() good_example() impure {
    set_data(begin_cell().store_uint(1, 32).end_cell());
}
```

### 4. 安全检查

```func
() recv_internal(...) impure {
    ;; ✅ 检查消息值
    throw_unless(100, msg_value >= min_tons_for_storage());
    
    ;; ✅ 检查发送者权限
    throw_unless(401, equal_slices(sender, owner));
    
    ;; ✅ 检查数值范围
    throw_unless(402, amount > 0);
    throw_unless(403, amount <= balance);
}
```

## 常见问题

### Q1: FunC 和 Tact 应该选哪个？

**A:** 选择建议：

- **选 Tact**：快速开发、简单逻辑、学习 TON
- **选 FunC**：复杂协议、性能优化、底层控制

### Q2: 如何调试 FunC 代码？

**A:** 使用 Sandbox 测试：

```typescript
const result = await contract.sendInternalMessage(/* ... */);
console.log(result.transactions);
```

### Q3: ~ 修饰符是什么意思？

**A:** `~` 表示修改参数：

```func
slice s = ...;
int value = s~load_uint(32);  ;; s 被修改
```

### Q4: 如何处理大整数溢出？

**A:** FunC 的整数是 257 位，很少溢出。如需检查：

```func
throw_if(100, value > max_value);
```

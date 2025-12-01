# 合约交互与以太坊调用机制

## 全局变量与区块链上下文

Solidity 提供了一组**全局变量**来访问区块链当前上下文信息：

| 变量                | 类型        | 说明                      |
|-------------------|-----------|-------------------------|
| `msg.sender`      | `address` | 当前调用者（地址）               |
| `msg.value`       | `uint256` | 调用时发送的 ETH 数量（单位：wei）   |
| `tx.origin`       | `address` | 发起交易的原始地址（可能不同于 sender） |
| `block.number`    | `uint`    | 当前区块号                   |
| `block.timestamp` | `uint`    | 当前区块的时间戳（Unix 时间）       |
| `gasleft()`       | `uint256` | 当前剩余 gas 数量             |

- 推荐使用 `msg.sender`，避免 `tx.origin`（易被重入攻击利用）

## 接收 ETH 的方式

在 Solidity 合约中，接收 ETH 有两种专用函数：`receive` 和 `fallback` 函数。

- **`receive()` 函数:** 专门用于接收无 `calldata`（无附加数据）的 ETH 转账。 如果存在该函数且满足条件，它会被自动执行。

```solidity
contract MyWallet {
    event Received(address from, uint amount);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
```

- **`fallback()` 函数:**
    1. 用于附带未知函数签名的调用，附带数据的 ETH 转账。
    2. 合约中没有 `receive()` 时接收 ETH。

```solidity
fallback() external payable {
    // 处理未知函数或错误调用
}
```

> [!info] 总结
> `receive` 是专用通道，`fallback` 是兜底通道。都能收钱，且均要加 `payable`。

**触发逻辑图（优先级）：**

```text
          +--------------------------+
          |      接收到 ETH         |
          +--------------------------+
                      |
        +-----------------------------+
        | 有无 calldata（数据）？     |
        +-----------------------------+
         |                         |
      无数据                    有数据
         |                         |
+----------------+     +-----------------------------+
| 有 receive()？  |     | 有 fallback()？             |
+----------------+     +-----------------------------+
   | 是        否        | 是                     否
   |           |         |                         |
执行 receive()  |     执行 fallback()        调用失败（revert）
```

**实战合约示例：**

```solidity
contract ETHReceiver {
    event Received(string func, address sender, uint amount);

    // 接收无数据的 ETH
    receive() external payable {
        emit Received("receive", msg.sender, msg.value);
    }

    // 接收带数据/错误调用 或 fallback 使用
    fallback() external payable {
        emit Received("fallback", msg.sender, msg.value);
    }
}

```

## 转账方式

Solidity 中发送 ETH 的常用方式有三种：`transfer()`、`send()`、`call()`。

| 方法             | 示例代码                           | Gas 限制 | 是否推荐 | 特点                     |
|----------------|--------------------------------|--------|------|------------------------|
| `transfer()`   | `to.transfer(1 ether);`        | 2300   | ❌    | 安全性高，但容易因目标合约 gas 不足失败 |
| `send()`       | `bool ok = to.send(1 ether);`  | 2300   | ❌    | 同样受限于 gas，且需手动检查返回值    |
| `call{value:}` | `to.call{value: 1 ether}("");` | 可控     | ✅    | 推荐方式，灵活且支持更多用途         |

**推荐使用 `call` 写法：**

```solidity
function safeTransfer(address to, uint amount) external {
    (bool success,) = payable(to).call{value: amount}("");  // 将 to 地址转换为 payable 类型，才能发送 ETH
    require(success, "Transfer failed");
}
```

> [!WARNING] 不推荐
> 从 `Solidity 0.8` 起不再推荐使用 `transfer()` / `send()`，因为 EIP-1884 提高了某些操作的 gas 成本，可能导致失败。


**`call` 的细节问题:** 核心在于最后那个参数是 `calldata`（要传入目标函数的调用数据）。

```text
(bool success, ) = payable(to).call{value: amount}("");
```

这里的 `""` 表示空的 `calldata`，即不调用任何特定函数，只是单纯转账 ETH。 等效于：`payable(to).transfer(amount)` 或
`payable(to).send(amount)`，只是 call 更底层、可控。

**如果传入 `calldata`: ** `(bool success, ) = payable(to).call{value: amount}("abc");`

- `"abc"` 会被当作原始的 `bytes` 数据 传给目标地址。
- 目标合约如果有 `fallback()` 或 `receive()` 函数，会触发它们。
- 但因为 `"abc"` 并非一个有效的函数选择器（没有经过 ABI 编码），目标合约不会调用某个指定函数，而是进入 `fallback()`（如果有
  `payable fallback()` 才能成功接收 ETH，否则交易会 revert）。

| 调用方式                                                                | 行为                             |
|---------------------------------------------------------------------|--------------------------------|
| `call{value: amount}("")`                                           | 仅发送 ETH，不带任何 calldata          |
| `call{value: amount}("abc")`                                        | 发送 ETH，并附带 `"abc"` 作为 calldata |
| `call{value: amount}(abi.encodeWithSignature("foo(uint256)", 123))` | 发送 ETH 并调用 `foo(123)` 函数       |

> [!INFO] 使用建议
> 如果仅仅是转账 ETH，应该使用 `""`，避免不必要的 Gas 消耗和错误。如果要调用目标合约的某个函数，就必须传入正确的 ABI 编码数据。

```solidity
(bool success, ) = payable(to).call{value : 1 ether}("");
require(success, "ETH transfer failed"); // 仅转账

(bool success2,) = to.call(
abi.encodeWithSignature("someFunction(uint256)", 123)
); // 调用 someFunction(123)
```

```solidity
// 推荐直接写法
someFunction(123);

// 等效低级写法（少用）
(bool success,) = address(this).call(
abi.encodeWithSignature("someFunction(uint256)", 123)
);
```

## 调用其他合约

Solidity 支持两种合约间调用方式：**内部调用和接口调用**。

### 内部调用（同一个合约或继承结构中）

```solidity
contract A {
    function internalFunc() internal pure returns (uint) {
        return 42;
    }

    function callInternal() public pure returns (uint) {
        return internalFunc(); // 直接调用
    }
}
```

### 接口调用（外部合约）

```solidity
// 声明目标合约接口
interface ICounter {
    function increment() external;

    function get() external view returns (uint);
}

contract MyContract {
    function callExternal(address counterAddr) public {
        ICounter(counterAddr).increment();
    }
}
```

## 动态调用

Solidity 提供三种底层调用方式：`call`、`delegatecall`、`staticcall`，它们通过底层 EVM 操作实现动态函数执行，可实现合约间的灵活交互。

### call

> 用于调用外部合约函数，可发送 ETH，可修改对方合约状态。

```solidity
(bool success, bytes memory data) = addr.call(
abi.encodeWithSignature("foo(uint256)", 123)
);
require(success, "call failed");
```

### delegatecall

> 在当前合约上下文执行“另一个合约”的代码。常用于 代理模式、模块合约复用。

```solidity
(bool success, ) = implementation.delegatecall(
abi.encodeWithSignature("setVal(uint256)", 42)
);
```

### staticcall

> 只读调用，用于确保不会修改任何状态（适合安全读取第三方合约数据）

```solidity
(bool success, bytes memory result) = addr.staticcall(
abi.encodeWithSignature("getValue()")
);
require(success, "staticcall failed");

uint value = abi.decode(result, (uint));
```

| 特性         | call                                  | delegatecall                         | staticcall                          |
|------------|---------------------------------------|--------------------------------------|-------------------------------------|
| **用途**     | 调用外部合约函数，可发送 ETH，允许修改目标合约状态           | 在调用者上下文执行目标合约代码，修改调用者状态，常用于代理模式      | 只读调用，确保不修改区块链状态，适合安全读取外部合约数据        |
| **上下文**    | 目标合约的存储和上下文（`msg.sender`、`msg.value`） | 调用者的存储和上下文（`msg.sender`、`msg.value`） | 目标合约的上下文，但禁止状态修改                    |
| **返回值**    | `(bool success, bytes memory data)`   | `(bool success, bytes memory data)`  | `(bool success, bytes memory data)` |
| **发送 ETH** | 支持，通过 `.value()` 指定                   | 不支持（除非结合 `call`）                     | 不支持                                 |
| **状态修改**   | 允许修改目标合约状态                            | 允许修改调用者合约状态                          | 禁止修改状态，若尝试修改则调用失败                   |
| **Gas 控制** | 可通过 `.gas()` 指定，默认为全部可用 Gas           | 可通过 `.gas()` 指定，默认为全部可用 Gas          | 可通过 `.gas()` 指定，Gas 消耗通常较低          |
| **典型场景**   | 动态调用未知合约、发送 ETH                       | 代理模式（如 UUPS 代理）、模块化代码复用              | 安全查询外部合约数据（如余额、状态）                  |

## ABI 编解码

Solidity 的 ABI（Application Binary Interface）定义了**合约函数如何被编码、解码、调用**的标准。你可以使用 `abi.encode`
系列函数将数据**打包为字节（bytes）**，并用 `abi.decode` 解析这些字节。

常用于：

- 跨合约动态调用（`delegatecall` / `call`）
- 构建函数调用数据（低级调用）
- 事件日志解析
- 数据打包与解包（如签名、哈希）

### abi.encode

> 编码多个参数为 ABI 格式的字节数据（带长度信息）

```solidity
bytes memory data = abi.encode(uint256(1), "hello");
```

### abi.decode

> 解码 bytes 数据为 Solidity 类型（反向还原）

```solidity
bytes memory raw = abi.encode(uint(42), true);
(uint a, bool b) = abi.decode(raw, (uint, bool));
```

### abi.encodePacked

> 紧凑打包多个参数（无类型边界），常用于生成哈希值（如 Merkle、唯一 ID）

```solidity
bytes memory packed = abi.encodePacked(uint256(1), "hello");
bytes32 hash = keccak256(packed);
// Warning: 拼接类型冲突时容易出错，例如多个 string 或 bytes，不建议用于函数调用
```

### abi.encodeWithSignature

> 编码函数调用数据，附带函数签名（字符串）

```solidity
bytes memory callData = abi.encodeWithSignature("transfer(address,uint256)", to, 100);
// 等价于：
abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, 100);
```

### abi.encodeWithSelector

> 更底层：你手动指定函数选择器（selector）

```solidity
bytes4 selector = bytes4(keccak256("foo(uint256)"));
bytes memory data = abi.encodeWithSelector(selector, 123);
```
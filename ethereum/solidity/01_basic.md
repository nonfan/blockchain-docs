# 基础语法

## 什么是 Solidity？

Solidity 是一种专为以太坊智能合约设计的高级语言，语法类似于 JavaScript 和 C++，主要运行在以太坊虚拟机（EVM）上。

## 文件结构

Solidity 合约文件以 `.sol` 为扩展名，通常在文件首行声明开源许可类型和编译器版本兼容性：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    // ...
}
```

- `SPDX-License-Identifier`：声明代码的开源许可类型，确保合规性。
- `pragma solidity`：指定编译器版本约束，例如 `^0.8.0` 表示兼容 0.8.x 版本。

## 基本数据类型

Solidity 支持以下基本数据类型：

- **`bool`**：布尔类型，仅包含 `true` 和 `false` 两个值。
- **`uint`**：无符号整数，表示非负整数，可指定位数，如 `uint8`（8 位，0 到 255）、`uint256`（256 位，默认大小）。
- **`int`**：有符号整数，可表示正负整数，同样可指定位数，如 `int8`（-128 到 127）、`int256`（默认大小）。
- **`address`**：表示 20 字节的以太坊地址，用于存储账户或合约地址，支持 `.balance` 和 `.transfer()` 等方法。
- **`bytes`**：动态大小字节数组，用于存储任意长度字节数据，如 `bytes memory`。
- **`string`**：动态字符串类型，用于存储 UTF-8 编码的字符串，通常用于文本数据。

## 数据位置关键字

在 Solidity 中，复杂数据类型（如数组、结构体、映射和字符串）在函数中操作时需要明确指定数据位置，以确定数据的存储方式和生命周期。数据位置关键字包括以下三种：

- `storage`: 数据存储在区块链上，持久化保存，类似于合约的状态变量。修改 storage 数据的操作会**永久**更改区块链状态，**消耗较多
  Gas**。常用于合约的全局状态变量。

- `memory`: 数据存储在内存中，仅在函数执行期间存在，函数调用结束后销毁，**消耗较少 Gas**。适用于临时数据处理。

- `calldata`: calldata：只读数据位置，通常用于函数的输入参数，数据存储在交易的调用数据中，无法修改，**Gas 消耗最低**
  。常用于外部函数调用（`external` 函数）。

**示例：**

```solidity
contract DataLocationExample {
    uint256[] public numbers; // storage 数据，持久存储在区块链

    function updateArray(uint256[] memory tempArray) public {
        numbers = tempArray; // 将 memory 数据复制到 storage
    }

    function readInput(string calldata input) external pure returns (string memory) {
        return input; // 从 calldata 读取，输出到 memory
    }
}
```

在函数中，参数和返回值的默认数据位置取决于函数可见性和类型。例如，`external` 函数的参数通常使用 `calldata`，而 `public` 或
`internal` 函数通常使用 `memory`。

> [!TIP] 注意事项
> - 基本数据类型（如 `uint`、`int`、`bool`）不需要显式指定数据位置，因为它们通常存储在栈上或作为状态变量直接存储在 `storage`
    中。
> - 数据位置的选择会影响 Gas 成本和函数行为。例如，错误地将 `memory` 数据传递给需要 `storage` 的函数可能导致逻辑错误。

## 函数定义与可见性

Solidity 中的函数是智能合约的核心组件，用于定义合约的行为和逻辑。函数定义包含**函数名、参数、返回值、可见性修饰符**等。

### 函数定义

```text
function functionName(parameterType param) 
    [visibility] 
    [state mutability] 
    [returns (returnType)] {
    // 函数体
}
```

- `functionName`：函数名称，遵循标识符命名规则。
- `parameterType param`：参数列表，可为空，支持复杂数据类型（如 uint[] memory）。
- `visibility`：指定函数的访问权限（见下文）。
- `state mutability`：声明函数是否修改区块链状态（如 pure、view、payable）。
- `returns (returnType)`：定义返回值类型，可为空。

```solidity
function add(uint a, uint b) public pure returns (uint) {
    return a + b;
}
```

### 可见性修饰符

Solidity 函数支持以下四种可见性修饰符，控制函数的访问权限：

| 修饰符        | 说明                                               |
|------------|--------------------------------------------------|
| `public`   | 函数可**被外部（其他合约、用户）和内部调用**，默认生成 getter 函数（对于状态变量）  |
| `external` | 函数**仅能被外部调用**（通过交易或消息调用），不能被合约内部直接调用，适合优化 Gas 消耗 |
| `internal` | 函数**仅能被合约内部及继承的子合约**调用，默认可见性（状态变量默认 internal）    |
| `private`  | 函数仅能在**当前合约**内调用，子合约无法访问，最高限制级别                  |

### 状态可变性

| 修饰符       | 说明                                      |
|-----------|-----------------------------------------|
| `pure`    | 函数不读取也不修改区块链状态，适合纯计算逻辑（如数学运算）。          |
| `view`    | 函数可读取区块链状态（如状态变量或 block.number），但不修改状态。 |
| `payable` | 函数可接收以太币，需显式声明。                         |
| 无修饰符      | 函数可修改区块链状态。                             |

## 控制流与运算符

Solidity 支持常见的控制流结构和运算符，用于实现逻辑控制和数据操作。

### 控制流

**`if-else`：条件分支，判断表达式必须返回 bool。**

```solidity [if-else]
function checkValue(uint x) public pure returns (string memory) {
    if (x > 100) {
        return "Large";
    } else if (x > 50) {
        return "Medium";
    } else {
        return "Small";
    }
}
```

**`for` 循环：用于迭代，建议谨慎使用以避免 Gas 超限。**

```solidity [for 循环]
function sumArray(uint[] memory arr) public pure returns (uint) {
    uint sum = 0;
    for (uint i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}
```

**`while` 和 `do-while`：循环执行，需确保终止条件以防止无限循环。**

```solidity [while && do-while]
function countDown(uint n) public pure returns (uint) {
    uint count = 0;
    while (n > 0) {
        count++;
        n--;
    }
    return count;
}
```

**`break` 和 `continue`：分别用于跳出循环或跳到下一次迭代。**

### 运算符

| 运算符       | 列表                                                        | 示例                               |
|-----------|-----------------------------------------------------------|----------------------------------|
| **算术运算符** | `+`、`-`、`*`、`/`、`%`（取模）、`**`（幂运算）                         | `uint result = 5 * 3 + 2; // 17` |
| **比较运算符** | `==`、`!=`、`<`、`>`、`<=`、`>=`                               | `if (a >= b) { ... }`            |
| **逻辑运算符** | `&&`（与）、`\|\|`（或）、`!`（非）                                  | `if (a > 0 && b > 0) { ... }`    |
| **位运运算符** | `&`（按位与）、`\|`（按位或）、`^`（按位异或）、`~`（按位取反）、`<<`（左移）、`>>`（右移）。 | `uint c = a & b;`                |
| **赋值运算符** | `=`, `+=`, `-=`, `*=`, `/=`, `%=`。                        | `x += 10; // x = x + 10`         |
| **三元运算符** | 不支持                                                       |                                  |

> [!WARNING] Gas 超限
> 循环需避免过高复杂度，以免 Gas 超限或交易失败。

## 错误处理机制

Solidity 提供了多种错误处理机制，用于捕获和处理异常，确保合约的安全性和可靠性。

### 错误处理方式

**`require`：验证条件，若不满足则回滚交易并抛出错误，附带可选错误信息，适用于输入验证。**

```solidity
function transfer(address recipient, uint amount) public {
    require(recipient != address(0), "Invalid recipient");
    require(amount > 0, "Amount must be positive");
    // 转账逻辑
}
```

**`assert`：检查内部逻辑错误，若失败则回滚交易，通常用于检测代码中的不可恢复错误（如溢出）。**

```solidity
function divide(uint a, uint b) public pure returns (uint) {
    assert(b != 0); // 确保除数不为 0
    return a / b;
}
```

**`revert`：手动抛出错误并回滚交易，适合复杂条件检查。**

```solidity
function checkBalance(uint amount) public view {
    if (amount > address(this).balance) {
        revert("Insufficient balance");
    }
}
```

### try-catch <Badge type="tip" text="Solidity >=0.6.0" />

用于捕获外部调用或合约创建中的错误，适合处理跨合约交互。

```solidity
contract ExternalContract {
    function doSomething() external pure returns (uint) {
        revert("External error");
    }
}

contract MyContract {
    function callExternal(address target) public returns (uint) {
        try ExternalContract(target).doSomething() returns (uint result) {
            return result;
        } catch Error(string memory reason) {
            revert(reason); // 捕获并重新抛出错误信息
        } catch {
            revert("Unknown error");
        }
    }
}
```

**1. `try-catch` 只能用于**：
- 外部合约函数（如 `.call()` / `.delegatecall()` 不适用）
- 合约部署（new）

**2. 不能用于：**
- 内部函数调用（包括 `this.internalFn()`）
- 没有 `external` 可见性的函数

### 自定义错误 <Badge type="tip" text="Solidity >=0.8.4" />

使用 `error` 关键字定义自定义错误，替代字符串错误信息，降低 Gas 消耗。

```solidity
error InsufficientBalance(uint requested, uint available);

function withdraw(uint amount) public {
    if (amount > address(this).balance) {
        revert InsufficientBalance(amount, address(this).balance);
    }
}
```

自定义错误比字符串错误信息更节省 Gas，推荐在 `0.8.4` 及以上版本使用。


> [!INFO] 总结
> `require` 适用于输入验证，`assert` 用于内部不变量检查，`revert` 用于自定义逻辑。
> `assert()` 的目标是：合约在正常运行下永远不会失败的逻辑断言。
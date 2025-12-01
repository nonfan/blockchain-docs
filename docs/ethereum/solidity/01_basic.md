# 基础语法

> 掌握 Solidity 核心语法，为智能合约开发打下坚实基础

## 什么是 Solidity？

Solidity 是一种专为以太坊智能合约设计的高级语言，语法类似于 JavaScript 和 C++，主要运行在以太坊虚拟机（EVM）上。

**核心特点：**
- ✅ **静态类型语言**：编译时检查类型错误
- ✅ **面向合约**：支持继承、库、接口等高级特性
- ✅ **EVM 优化**：专为以太坊虚拟机设计
- ✅ **安全优先**：内置溢出检查（0.8.0+）

## 文件结构

Solidity 合约文件以 `.sol` 为扩展名，通常在文件首行声明开源许可类型和编译器版本兼容性：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    // 合约代码
}
```

- **`SPDX-License-Identifier`**：声明代码的开源许可类型，确保合规性。
- **`pragma solidity`**：指定编译器版本约束，例如 `^0.8.20` 表示兼容 0.8.20 及以上的 0.8.x 版本。

**版本声明方式：**

| 声明方式 | 含义 | 示例 |
|---------|------|------|
| `^0.8.20` | 兼容 0.8.20 到 0.9.0（不含） | `^0.8.20` |
| `>=0.8.0 <0.9.0` | 范围指定 | `>=0.8.0 <0.9.0` |
| `0.8.20` | 精确版本 | `0.8.20` |

## 基本数据类型

Solidity 支持以下基本数据类型：

### 值类型（Value Types）

**`bool`**：布尔类型
```solidity
bool public isActive = true;
bool public hasCompleted = false;

// 逻辑运算
bool result = isActive && !hasCompleted; // true
```

**`uint` / `int`**：整数类型
```solidity
uint8 public smallNumber;    // 0 到 255
uint256 public largeNumber;  // 0 到 2^256 - 1（默认）
uint public defaultUint;     // 等同于 uint256

int8 public temperature;     // -128 到 127
int256 public balance;       // -2^255 到 2^255 - 1
```

| 类型 | 位数 | 范围 | Gas 成本 |
|------|------|------|----------|
| `uint8` / `int8` | 8 | 0-255 / -128 到 127 | 低 |
| `uint256` / `int256` | 256 | 最大范围 | 标准 |

> [!TIP] 最佳实践
> - 优先使用 `uint256` 和 `int256`（EVM 原生支持，Gas 最优）
> - 仅在存储打包（storage packing）时使用小位数类型

**`address`**：地址类型
```solidity
address public owner;                    // 普通地址
address payable public recipient;        // 可接收 ETH 的地址

// 地址属性和方法
uint256 ethBalance = owner.balance;      // 查询地址余额
recipient.transfer(1 ether);             // 转账（失败会回滚）
(bool success, ) = recipient.call{value: 1 ether}(""); // 低级调用
```

| 类型 | 说明 | 可用方法 |
|------|------|----------|
| `address` | 普通地址 | `balance`, `code`, `codehash` |
| `address payable` | 可接收 ETH | `transfer()`, `send()`, `call()` |

**`bytes` 和 `string`**：字节和字符串
```solidity
// 固定大小字节数组
bytes1 public singleByte = 0x12;
bytes32 public hash = keccak256("hello");

// 动态大小字节数组
bytes public data;

// 字符串（UTF-8 编码）
string public name = "Solidity";
```

## 变量声明与修饰符

### 状态变量 vs 局部变量

```solidity
contract VariableExample {
    // 状态变量：存储在区块链上
    uint256 public stateVar = 100;

    function calculate() public view returns (uint256) {
        // 局部变量：仅在函数内存在
        uint256 localVar = 50;
        return stateVar + localVar; // 150
    }
}
```

| 变量类型 | 存储位置 | 生命周期 | Gas 成本 |
|---------|---------|---------|---------|
| **状态变量** | storage（区块链） | 永久 | 高（20,000+ Gas） |
| **局部变量** | memory/stack | 函数执行期间 | 低（3-5 Gas） |

### constant vs immutable

**`constant`**：编译时常量
```solidity
contract Constants {
    // ✅ constant：编译时确定，不占用存储槽
    uint256 public constant MAX_SUPPLY = 1_000_000;
    address public constant ZERO_ADDRESS = address(0);

    // Gas 成本：读取仅需 ~200 Gas（内联到字节码）
    function getMax() public pure returns (uint256) {
        return MAX_SUPPLY;
    }
}
```

**`immutable`**：部署时常量
```solidity
contract Immutables {
    // ✅ immutable：部署时设置，之后不可变
    address public immutable owner;
    uint256 public immutable deployTime;

    constructor() {
        owner = msg.sender;
        deployTime = block.timestamp;
    }

    // Gas 成本：读取仅需 ~200 Gas（内联到字节码）
}
```

**对比表：**

| 特性 | `constant` | `immutable` | 普通状态变量 |
|------|-----------|-------------|-------------|
| **赋值时机** | 编译时 | 部署时（constructor） | 任何时候 |
| **可否修改** | ❌ 否 | ❌ 否 | ✅ 是 |
| **支持类型** | 值类型、字符串 | 值类型 | 所有类型 |
| **存储位置** | 字节码（内联） | 字节码（内联） | storage 槽 |
| **读取 Gas** | ~200 | ~200 | ~2,100 |

**使用场景：**
```solidity
contract TokenConfig {
    // ✅ 编译时已知 → constant
    uint256 public constant DECIMALS = 18;
    string public constant NAME = "MyToken";

    // ✅ 部署时确定 → immutable
    address public immutable factory;
    uint256 public immutable initialSupply;

    // ✅ 运行时可变 → 普通变量
    uint256 public totalSupply;

    constructor(address _factory, uint256 _supply) {
        factory = _factory;
        initialSupply = _supply;
        totalSupply = _supply;
    }
}
```

## 全局变量（内置变量）

Solidity 提供了一系列全局变量，用于访问区块链状态和交易信息。

### msg 家族（交易信息）

```solidity
contract MsgExample {
    // msg.sender：调用者地址（最常用）
    address public caller = msg.sender;

    // msg.value：随交易发送的 ETH（单位：wei）
    function deposit() public payable {
        require(msg.value > 0, "No ETH sent");
        // 处理存款逻辑
    }

    // msg.data：完整的 calldata（字节数组）
    function logCalldata() public view returns (bytes memory) {
        return msg.data;
    }

    // msg.sig：函数选择器（前 4 字节）
    function getSelector() public view returns (bytes4) {
        return msg.sig; // 0x4f0e0ef3
    }
}
```

| 变量 | 类型 | 说明 | 使用场景 |
|------|------|------|----------|
| `msg.sender` | `address` | 调用者地址 | 权限控制、转账 |
| `msg.value` | `uint256` | 发送的 ETH（wei） | 支付功能 |
| `msg.data` | `bytes` | 完整调用数据 | 代理合约、底层调用 |
| `msg.sig` | `bytes4` | 函数选择器 | 函数识别、路由 |

### block 家族（区块信息）

```solidity
contract BlockExample {
    // block.timestamp：当前区块时间戳（秒）
    uint256 public deployTime = block.timestamp;

    // block.number：当前区块号
    uint256 public deployBlock = block.number;

    // block.coinbase：当前区块矿工地址
    address public miner = block.coinbase;

    // block.difficulty：当前区块难度（PoW）
    uint256 public difficulty = block.prevrandao; // PoS 后改为 prevrandao

    // block.gaslimit：当前区块 Gas 上限
    uint256 public gasLimit = block.gaslimit;

    function isExpired(uint256 deadline) public view returns (bool) {
        return block.timestamp > deadline;
    }
}
```

| 变量 | 类型 | 说明 | 注意事项 |
|------|------|------|----------|
| `block.timestamp` | `uint256` | 区块时间戳（秒） | ⚠️ 矿工可操控 ±15 秒 |
| `block.number` | `uint256` | 区块号 | ✅ 可靠的递增标识 |
| `block.coinbase` | `address payable` | 矿工地址 | 区块生产者 |
| `block.gaslimit` | `uint256` | 区块 Gas 上限 | 网络参数 |

> [!WARNING] 安全警告
> - `block.timestamp` 可被矿工操控 ±15 秒，不要用于关键随机数生成
> - `block.number` 更适合作为时间锁条件

### tx 家族（交易信息）

```solidity
contract TxExample {
    // tx.origin：交易发起者（最初调用者）
    address public txOrigin = tx.origin;

    // tx.gasprice：交易 Gas 价格（wei）
    uint256 public gasPrice = tx.gasprice;

    // ⚠️ 安全陷阱：不要用 tx.origin 做权限检查！
    function badAccessControl() public {
        require(tx.origin == owner); // ❌ 易受钓鱼攻击
    }

    function goodAccessControl() public {
        require(msg.sender == owner); // ✅ 正确做法
    }
}
```

| 变量 | 类型 | 说明 | 安全性 |
|------|------|------|--------|
| `tx.origin` | `address` | 交易发起者（EOA） | ⚠️ 不要用于权限控制 |
| `tx.gasprice` | `uint256` | Gas 价格（wei） | ✅ 可用于动态定价 |

> [!DANGER] tx.origin 安全陷阱
> ```solidity
> // ❌ 易受钓鱼攻击
> contract Vulnerable {
>     address owner;
>
>     function withdraw() public {
>         require(tx.origin == owner); // 恶意合约可以利用这个
>         // ...
>     }
> }
>
> // ✅ 正确做法
> contract Secure {
>     address owner;
>
>     function withdraw() public {
>         require(msg.sender == owner); // 只检查直接调用者
>         // ...
>     }
> }
> ```

### 其他全局变量

```solidity
// gasleft()：剩余 Gas
uint256 remaining = gasleft();

// blockhash(blockNumber)：指定区块哈希（仅最近 256 个区块）
bytes32 hash = blockhash(block.number - 1);
```

## 数据位置关键字

在 Solidity 中，**复杂数据类型（如数组、结构体、映射和字符串）** 在函数中操作时需要明确指定数据位置，以确定数据的存储方式和生命周期。

### 三种数据位置

**`storage`**：持久化存储
```solidity
contract StorageExample {
    uint256[] public numbers; // 状态变量默认 storage

    function modifyStorage() public {
        uint256[] storage ref = numbers; // storage 引用
        ref.push(10); // 修改原始数据
    }
}
```

**`memory`**：临时内存
```solidity
function processData(uint256[] memory arr) public pure returns (uint256) {
    // memory 数据：函数结束后销毁
    uint256[] memory temp = new uint256[](3);
    temp[0] = 100;
    return temp[0];
}
```

**`calldata`**：只读外部数据
```solidity
function readInput(string calldata input) external pure returns (string memory) {
    // calldata 只读，Gas 最低
    return input; // 需要复制到 memory 返回
}
```

### 数据位置对比

| 位置 | 存储位置 | 生命周期 | 可修改 | Gas 成本 | 适用场景 |
|------|---------|---------|--------|---------|----------|
| `storage` | 区块链 | 永久 | ✅ 是 | 高（20,000+） | 状态变量、持久数据 |
| `memory` | 内存 | 函数执行期间 | ✅ 是 | 中（3-96） | 临时计算、函数参数 |
| `calldata` | 调用数据 | 函数执行期间 | ❌ 只读 | 低（3） | external 函数参数 |

### 数据位置规则

```solidity
contract DataLocationRules {
    uint256[] public stateArray; // 状态变量：默认 storage

    // ✅ 正确：external 函数用 calldata
    function processExternal(uint256[] calldata arr) external pure returns (uint256) {
        return arr[0];
    }

    // ✅ 正确：public 函数用 memory
    function processPublic(uint256[] memory arr) public pure returns (uint256) {
        return arr[0];
    }

    // ✅ 正确：返回值用 memory
    function createArray() public pure returns (uint256[] memory) {
        uint256[] memory result = new uint256[](3);
        return result;
    }

    // ❌ 错误：不能返回 storage 引用（dangling reference）
    // function badReturn() public view returns (uint256[] storage) {
    //     uint256[] storage ref = stateArray;
    //     return ref; // 编译错误
    // }
}
```

> [!TIP] 最佳实践
> - `external` 函数参数优先用 `calldata`（节省 Gas）
> - `public` / `internal` 函数参数用 `memory`
> - 基本类型（`uint`、`bool`）不需要指定位置

## 数组（Arrays）

### 固定长度 vs 动态数组

```solidity
contract ArrayExample {
    // 固定长度数组
    uint256[5] public fixedArray;    // 固定 5 个元素

    // 动态数组
    uint256[] public dynamicArray;   // 可变长度

    // 初始化
    constructor() {
        fixedArray = [1, 2, 3, 4, 5];
    }
}
```

| 类型 | 声明 | 长度 | 可变性 | Gas 成本 |
|------|------|------|--------|---------|
| **固定数组** | `uint[5]` | 固定 | ❌ 不可变 | 低（预分配） |
| **动态数组** | `uint[]` | 动态 | ✅ 可变 | 高（动态增长） |

### 数组操作

```solidity
contract ArrayOperations {
    uint256[] public numbers;

    // push：添加元素到末尾
    function addNumber(uint256 num) public {
        numbers.push(num); // Gas: ~43,000（首次）
    }

    // pop：移除末尾元素
    function removeLastNumber() public {
        require(numbers.length > 0, "Array is empty");
        numbers.pop(); // Gas: ~5,000 + 退还存储费用
    }

    // length：获取数组长度
    function getLength() public view returns (uint256) {
        return numbers.length;
    }

    // 访问元素
    function getElement(uint256 index) public view returns (uint256) {
        require(index < numbers.length, "Index out of bounds");
        return numbers[index];
    }

    // delete：重置元素为默认值（不改变长度）
    function resetElement(uint256 index) public {
        delete numbers[index]; // 重置为 0，但数组长度不变
    }

    // 遍历数组（⚠️ 注意 Gas 限制）
    function sumArray() public view returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < numbers.length; i++) {
            sum += numbers[i];
        }
        return sum;
    }
}
```

| 操作 | 函数 | 说明 | Gas 成本 |
|------|------|------|----------|
| **添加** | `arr.push(x)` | 末尾添加元素 | 高（首次 ~43k） |
| **删除末尾** | `arr.pop()` | 移除末尾元素并退还 Gas | 中（~5k + 退款） |
| **长度** | `arr.length` | 获取数组长度 | 低（~2.1k） |
| **重置** | `delete arr[i]` | 重置为默认值（长度不变） | 低 |

### memory vs storage 数组

```solidity
function memoryArrayExample() public pure returns (uint256[] memory) {
    // memory 数组：必须指定长度
    uint256[] memory temp = new uint256[](3);
    temp[0] = 10;
    temp[1] = 20;
    temp[2] = 30;

    // ❌ memory 数组不支持 push/pop
    // temp.push(40); // 编译错误

    return temp;
}

function storageArrayExample() public {
    // storage 数组：可动态增长
    uint256[] storage ref = numbers;
    ref.push(100); // ✅ 支持 push
}
```

### 多维数组

```solidity
contract MultiDimensionalArrays {
    // 二维数组
    uint256[][] public matrix;

    function createMatrix() public {
        matrix.push([1, 2, 3]);
        matrix.push([4, 5, 6]);

        // 访问：matrix[行][列]
        uint256 value = matrix[0][1]; // 2
    }

    // 固定大小二维数组
    uint256[2][3] public fixedMatrix; // 3 行 2 列
}
```

> [!WARNING] Gas 陷阱
> - 循环遍历大数组可能耗尽 Gas
> - 建议：数组长度 < 100，或使用映射（mapping）
> - 批量操作时考虑分页处理

## 映射（Mapping）

映射（`mapping`）是 Solidity 中最常用的数据结构，类似于哈希表或字典。

### 基础映射

```solidity
contract MappingExample {
    // 声明映射：mapping(键类型 => 值类型) 可见性 名称
    mapping(address => uint256) public balances;

    // 设置值
    function setBalance(uint256 amount) public {
        balances[msg.sender] = amount;
    }

    // 读取值（不存在的键返回默认值）
    function getBalance(address user) public view returns (uint256) {
        return balances[user]; // 未设置则返回 0
    }

    // 删除值（重置为默认值）
    function resetBalance() public {
        delete balances[msg.sender]; // 重置为 0
    }
}
```

### 嵌套映射

```solidity
contract NestedMapping {
    // 嵌套映射：ERC20 授权额度
    // 所有者 => 授权者 => 额度
    mapping(address => mapping(address => uint256)) public allowances;

    function approve(address spender, uint256 amount) public {
        allowances[msg.sender][spender] = amount;
    }

    function getAllowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
}
```

### 映射 vs 数组

| 特性 | Mapping | Array |
|------|---------|-------|
| **查询** | O(1) 常数时间 | O(n) 线性时间 |
| **遍历** | ❌ 不支持 | ✅ 支持 |
| **删除** | ✅ Gas 高效（重置） | ⚠️ Gas 昂贵（需移动元素） |
| **长度** | ❌ 无法获取 | ✅ `.length` |
| **键存在性** | ❌ 无法检测（返回默认值） | ✅ 索引范围检查 |
| **Gas 成本** | ✅ 低（固定） | ⚠️ 高（遍历） |

### 映射的限制

```solidity
contract MappingLimitations {
    mapping(address => uint256) public data;

    // ❌ 无法遍历
    // function getAllKeys() public view returns (address[] memory) {
    //     // 不可能实现：映射不存储键列表
    // }

    // ❌ 无法获取长度
    // function getSize() public view returns (uint256) {
    //     return data.length; // 编译错误
    // }

    // ✅ 解决方案：手动维护键列表
    address[] public userList;

    function addUser(uint256 amount) public {
        if (data[msg.sender] == 0) {
            userList.push(msg.sender); // 首次添加时记录
        }
        data[msg.sender] = amount;
    }
}
```

### 映射使用场景

```solidity
// ✅ 场景 1：余额账本（快速查询）
mapping(address => uint256) public balances;

// ✅ 场景 2：白名单（快速检查）
mapping(address => bool) public whitelist;

// ✅ 场景 3：授权管理（嵌套映射）
mapping(address => mapping(address => uint256)) public allowances;

// ✅ 场景 4：存在性检查
mapping(bytes32 => bool) public usedNonces;

// ❌ 不适合：需要遍历的场景
// mapping(address => User) public users; // 无法获取所有用户
```

> [!TIP] 最佳实践
> - 需要快速查询 → 使用 `mapping`
> - 需要遍历 → 使用 `array`
> - 两者结合：`mapping` 存数据 + `array` 存键

## 类型转换

Solidity 支持显式和隐式类型转换，但有严格的规则。

### 整数类型转换

```solidity
contract TypeConversion {
    // 隐式转换（小范围 → 大范围）
    function implicitConversion() public pure returns (uint256) {
        uint8 small = 100;
        uint256 large = small; // ✅ 自动转换
        return large; // 100
    }

    // 显式转换（大范围 → 小范围）
    function explicitConversion() public pure returns (uint8) {
        uint256 large = 300;
        uint8 small = uint8(large); // ⚠️ 截断为 44（300 % 256）
        return small;
    }

    // 有符号 <-> 无符号
    function signedConversion() public pure returns (int256) {
        uint256 unsigned = 100;
        int256 signed = int256(unsigned); // ✅ 100
        return signed;
    }
}
```

### 地址类型转换

```solidity
contract AddressConversion {
    // uint160 <-> address
    function uintToAddress(uint160 num) public pure returns (address) {
        return address(num);
    }

    function addressToUint(address addr) public pure returns (uint160) {
        return uint160(addr);
    }

    // address -> address payable
    function makePayable(address addr) public pure returns (address payable) {
        return payable(addr);
    }

    // 合约地址转换
    function contractToAddress(MyContract c) public pure returns (address) {
        return address(c);
    }
}
```

### bytes 类型转换

```solidity
contract BytesConversion {
    // bytes32 -> bytes
    function bytes32ToBytes(bytes32 data) public pure returns (bytes memory) {
        bytes memory result = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            result[i] = data[i];
        }
        return result;
    }

    // string -> bytes
    function stringToBytes(string memory str) public pure returns (bytes memory) {
        return bytes(str);
    }

    // bytes -> bytes32（截断或填充）
    function bytesToBytes32(bytes memory data) public pure returns (bytes32) {
        bytes32 result;
        assembly {
            result := mload(add(data, 32))
        }
        return result;
    }
}
```

| 转换类型 | 示例 | 安全性 |
|---------|------|--------|
| `uint8` → `uint256` | `uint256(x)` | ✅ 安全 |
| `uint256` → `uint8` | `uint8(x)` | ⚠️ 可能截断 |
| `address` → `uint160` | `uint160(addr)` | ✅ 安全 |
| `address` → `address payable` | `payable(addr)` | ✅ 安全 |

## 字节操作详解

### bytes vs bytes32

```solidity
contract BytesOperations {
    // bytes32：固定 32 字节，存储在栈上
    bytes32 public fixedBytes = "Hello";

    // bytes：动态字节数组，存储在 storage
    bytes public dynamicBytes;

    // 比较
    function compare() public view returns (bool) {
        // bytes32 可直接比较
        return fixedBytes == "Hello"; // ✅ 可用

        // bytes 需要 keccak256 比较
        // return dynamicBytes == "Hello"; // ❌ 不支持
        return keccak256(dynamicBytes) == keccak256("Hello");
    }
}
```

| 类型 | 大小 | Gas 成本 | 可变性 | 比较 |
|------|------|---------|--------|------|
| `bytes32` | 固定 32 字节 | 低 | ❌ 不可变 | ✅ 直接 `==` |
| `bytes` | 动态 | 高 | ✅ 可变 | ⚠️ 需 `keccak256` |

### bytes 操作

```solidity
contract BytesManipulation {
    bytes public data;

    // 添加字节
    function appendByte(bytes1 b) public {
        data.push(b);
    }

    // 拼接（使用 abi.encodePacked）
    function concatenate(bytes memory a, bytes memory b) public pure returns (bytes memory) {
        return abi.encodePacked(a, b);
    }

    // 切片（需手动实现）
    function slice(bytes memory data, uint start, uint len) public pure returns (bytes memory) {
        bytes memory result = new bytes(len);
        for (uint i = 0; i < len; i++) {
            result[i] = data[start + i];
        }
        return result;
    }
}
```

### abi.encode vs abi.encodePacked

```solidity
contract EncodingComparison {
    // abi.encode：标准 ABI 编码（带填充）
    function standardEncode() public pure returns (bytes memory) {
        return abi.encode(uint256(1), uint256(2));
        // 输出：64 字节（每个 uint256 占 32 字节）
    }

    // abi.encodePacked：紧凑编码（无填充）
    function packedEncode() public pure returns (bytes memory) {
        return abi.encodePacked(uint8(1), uint8(2));
        // 输出：2 字节
    }

    // 用途对比
    function useCases() public pure {
        // ✅ abi.encode：函数调用、合约交互
        bytes memory callData = abi.encodeWithSignature("transfer(address,uint256)", msg.sender, 100);

        // ✅ abi.encodePacked：哈希计算、签名
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, block.timestamp));
    }
}
```

## 函数定义与可见性

### 函数定义语法

```solidity
function functionName(parameterType param)
    [visibility]
    [state mutability]
    [modifiers]
    [returns (returnType)]
{
    // 函数体
}
```

**示例：**
```solidity
function transfer(address to, uint256 amount)
    public
    payable
    returns (bool)
{
    // 实现逻辑
    return true;
}
```

### 可见性修饰符

```solidity
contract VisibilityExample {
    uint256 private privateVar = 1;
    uint256 internal internalVar = 2;
    uint256 public publicVar = 3; // 自动生成 getter

    // public：内外部都可调用
    function publicFunc() public pure returns (string memory) {
        return "Anyone can call";
    }

    // external：仅外部可调用（Gas 更低）
    function externalFunc() external pure returns (string memory) {
        return "Only external";
    }

    // internal：仅当前合约和子合约
    function internalFunc() internal pure returns (string memory) {
        return "Current and child contracts";
    }

    // private：仅当前合约
    function privateFunc() private pure returns (string memory) {
        return "Current contract only";
    }

    // 调用示例
    function testCalls() public view {
        publicFunc();      // ✅ 可调用
        // externalFunc(); // ❌ 不能内部调用
        this.externalFunc(); // ✅ 通过 this 调用（外部调用）
        internalFunc();    // ✅ 可调用
        privateFunc();     // ✅ 可调用
    }
}
```

| 修饰符 | 内部调用 | 外部调用 | 子合约 | Gas 成本 |
|--------|---------|---------|--------|----------|
| `public` | ✅ | ✅ | ✅ | 标准 |
| `external` | ❌ | ✅ | ❌ | 低（calldata） |
| `internal` | ✅ | ❌ | ✅ | 标准 |
| `private` | ✅ | ❌ | ❌ | 标准 |

### 状态可变性

```solidity
contract StateMutability {
    uint256 public value = 100;

    // pure：不读不写状态
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    // view：只读状态
    function getValue() public view returns (uint256) {
        return value;
    }

    // payable：可接收 ETH
    function deposit() public payable {
        // 可访问 msg.value
    }

    // 无修饰符：可修改状态
    function setValue(uint256 newValue) public {
        value = newValue;
    }
}
```

| 修饰符 | 读状态 | 写状态 | 接收 ETH | Gas（调用） |
|--------|--------|--------|----------|------------|
| `pure` | ❌ | ❌ | ❌ | 0（view call） |
| `view` | ✅ | ❌ | ❌ | 0（view call） |
| `payable` | ✅ | ✅ | ✅ | 标准 |
| 无修饰符 | ✅ | ✅ | ❌ | 标准 |

## 控制流与运算符

### 条件语句

```solidity
contract ControlFlow {
    // if-else
    function checkAge(uint256 age) public pure returns (string memory) {
        if (age >= 18) {
            return "Adult";
        } else if (age >= 13) {
            return "Teenager";
        } else {
            return "Child";
        }
    }

    // 三元运算符（✅ Solidity 支持！）
    function max(uint256 a, uint256 b) public pure returns (uint256) {
        return a > b ? a : b;
    }
}
```

### 循环

```solidity
contract Loops {
    // for 循环
    function sumRange(uint256 n) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 1; i <= n; i++) {
            sum += i;
        }
        return sum;
    }

    // while 循环
    function countdown(uint256 n) public pure returns (uint256) {
        uint256 count = 0;
        while (n > 0) {
            count++;
            n--;
        }
        return count;
    }

    // do-while 循环
    function doWhileExample(uint256 n) public pure returns (uint256) {
        uint256 count = 0;
        do {
            count++;
            n--;
        } while (n > 0);
        return count;
    }

    // break 和 continue
    function findFirst(uint256[] memory arr, uint256 target) public pure returns (int256) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == target) {
                return int256(i); // 找到后跳出
            }
        }
        return -1; // 未找到
    }
}
```

> [!WARNING] Gas 限制
> - 循环次数过多会导致 Gas 耗尽
> - 建议：循环次数 < 100，或分批处理

### 运算符

```solidity
contract Operators {
    // 算术运算符
    function arithmetic() public pure returns (uint256) {
        uint256 a = 10;
        uint256 b = 3;

        uint256 sum = a + b;        // 13
        uint256 diff = a - b;       // 7
        uint256 product = a * b;    // 30
        uint256 quotient = a / b;   // 3（整数除法）
        uint256 remainder = a % b;  // 1
        uint256 power = a ** 2;     // 100

        return sum;
    }

    // 比较运算符
    function comparison(uint256 a, uint256 b) public pure returns (bool) {
        return a == b || a != b || a > b || a < b || a >= b || a <= b;
    }

    // 逻辑运算符
    function logic(bool a, bool b) public pure returns (bool) {
        return (a && b) || (!a) || (a || b);
    }

    // 位运算符
    function bitwise() public pure returns (uint256) {
        uint256 a = 12; // 1100
        uint256 b = 10; // 1010

        uint256 and = a & b;   // 1000 = 8
        uint256 or = a | b;    // 1110 = 14
        uint256 xor = a ^ b;   // 0110 = 6
        uint256 not = ~a;      // 反转所有位
        uint256 left = a << 1; // 11000 = 24
        uint256 right = a >> 1;// 110 = 6

        return and;
    }

    // 赋值运算符
    function assignment() public pure returns (uint256) {
        uint256 x = 10;
        x += 5;  // x = x + 5
        x -= 3;  // x = x - 3
        x *= 2;  // x = x * 2
        x /= 4;  // x = x / 4
        x %= 3;  // x = x % 3
        return x;
    }
}
```

## 错误处理机制

### require vs assert vs revert

```solidity
contract ErrorHandling {
    uint256 public value;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ✅ require：输入验证和条件检查
    function setValue(uint256 newValue) public {
        require(msg.sender == owner, "Not owner");
        require(newValue > 0, "Value must be positive");
        require(newValue <= 1000, "Value too large");

        value = newValue;
    }

    // ✅ assert：检查不变量（内部错误）
    function divide(uint256 a, uint256 b) public pure returns (uint256) {
        assert(b != 0); // 应该永远不会发生
        return a / b;
    }

    // ✅ revert：复杂条件检查
    function complexCheck(uint256 amount) public view {
        if (amount > value) {
            revert("Insufficient value");
        }

        if (msg.sender == address(0)) {
            revert("Invalid sender");
        }

        // 复杂逻辑...
    }
}
```

| 方式 | 用途 | Gas 退还 | 使用场景 |
|------|------|---------|----------|
| `require` | 输入验证 | ✅ 是 | 参数检查、权限验证 |
| `assert` | 内部不变量 | ❌ 否 | 不应该发生的错误 |
| `revert` | 自定义逻辑 | ✅ 是 | 复杂条件、自定义错误 |

### try-catch

```solidity
interface IExternal {
    function riskyOperation() external returns (uint256);
}

contract TryCatchExample {
    event OperationFailed(string reason);

    function safeCall(address target) public returns (bool success, uint256 result) {
        try IExternal(target).riskyOperation() returns (uint256 value) {
            // 成功
            return (true, value);
        } catch Error(string memory reason) {
            // require/revert 错误
            emit OperationFailed(reason);
            return (false, 0);
        } catch Panic(uint256 errorCode) {
            // assert 错误或算术溢出
            emit OperationFailed(string(abi.encodePacked("Panic: ", errorCode)));
            return (false, 0);
        } catch (bytes memory lowLevelData) {
            // 其他低级错误
            emit OperationFailed("Low-level error");
            return (false, 0);
        }
    }
}
```

### 自定义错误

```solidity
// 定义自定义错误
error InsufficientBalance(uint256 requested, uint256 available);
error Unauthorized(address caller);

contract CustomErrors {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw(uint256 amount) public {
        uint256 balance = balances[msg.sender];

        // ✅ 使用自定义错误（Gas 更低）
        if (amount > balance) {
            revert InsufficientBalance(amount, balance);
        }

        balances[msg.sender] -= amount;
    }

    function adminFunction() public {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        // 管理员操作...
    }
}
```

**自定义错误 vs 字符串错误：**

| 特性 | 自定义错误 | 字符串错误 |
|------|-----------|-----------|
| **Gas 成本** | ✅ 低（~1,000） | ❌ 高（~10,000+） |
| **参数支持** | ✅ 支持 | ❌ 不支持 |
| **可读性** | ✅ 强类型 | ⚠️ 弱类型 |
| **版本要求** | ≥ 0.8.4 | 所有版本 |

## 完整综合示例

下面是一个综合使用本章所有知识点的完整合约：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TokenVault
 * @dev 综合示例：代币金库合约
 *
 * 功能：
 * - 用户可以存入 ETH
 * - 记录每个用户的余额和存款时间
 * - 支持提款和紧急暂停
 * - 演示所有基础语法知识点
 */
contract TokenVault {
    // ==================== 状态变量 ====================

    // constant：编译时常量
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_DEPOSIT = 100 ether;

    // immutable：部署时常量
    address public immutable owner;
    uint256 public immutable deployTime;

    // 普通状态变量
    bool public paused;
    uint256 public totalDeposits;

    // 映射：用户余额
    mapping(address => uint256) public balances;

    // 映射：存款时间
    mapping(address => uint256) public depositTimes;

    // 数组：用户列表
    address[] public userList;

    // 结构体：存款记录
    struct DepositRecord {
        uint256 amount;
        uint256 timestamp;
        bool withdrawn;
    }

    // 映射：用户 => 存款记录数组
    mapping(address => DepositRecord[]) public depositHistory;

    // ==================== 事件 ====================

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ==================== 自定义错误 ====================

    error ContractPaused();
    error InsufficientBalance(uint256 requested, uint256 available);
    error InvalidAmount(uint256 amount);
    error Unauthorized(address caller);
    error WithdrawalTooEarly(uint256 timeLeft);

    // ==================== 修饰符 ====================

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    modifier whenNotPaused() {
        if (paused) {
            revert ContractPaused();
        }
        _;
    }

    // ==================== 构造函数 ====================

    constructor() {
        owner = msg.sender;
        deployTime = block.timestamp;
        paused = false;
    }

    // ==================== 核心功能 ====================

    /**
     * @dev 存款函数
     * 演示：payable、require、映射、数组、结构体、事件
     */
    function deposit() external payable whenNotPaused {
        // 输入验证（require）
        require(msg.value >= MIN_DEPOSIT, "Amount too small");
        require(msg.value <= MAX_DEPOSIT, "Amount too large");

        // 首次存款：添加到用户列表
        if (balances[msg.sender] == 0) {
            userList.push(msg.sender);
        }

        // 更新余额（映射）
        balances[msg.sender] += msg.value;
        depositTimes[msg.sender] = block.timestamp;
        totalDeposits += msg.value;

        // 记录历史（结构体 + 数组）
        depositHistory[msg.sender].push(DepositRecord({
            amount: msg.value,
            timestamp: block.timestamp,
            withdrawn: false
        }));

        // 触发事件
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev 提款函数
     * 演示：自定义错误、控制流、类型转换
     */
    function withdraw(uint256 amount) external whenNotPaused {
        uint256 balance = balances[msg.sender];
        uint256 depositTime = depositTimes[msg.sender];

        // 自定义错误
        if (amount > balance) {
            revert InsufficientBalance(amount, balance);
        }

        // 时间锁：存款后 1 天才能提款
        if (block.timestamp < depositTime + 1 days) {
            uint256 timeLeft = (depositTime + 1 days) - block.timestamp;
            revert WithdrawalTooEarly(timeLeft);
        }

        // 更新状态（CEI 模式）
        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        // 转账（类型转换：address -> address payable）
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev 批量查询余额
     * 演示：循环、数组、view 函数
     */
    function getBatchBalances(address[] memory users)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory results = new uint256[](users.length);

        for (uint256 i = 0; i < users.length; i++) {
            results[i] = balances[users[i]];
        }

        return results;
    }

    /**
     * @dev 获取用户存款历史
     * 演示：结构体数组、memory 返回值
     */
    function getDepositHistory(address user)
        external
        view
        returns (DepositRecord[] memory)
    {
        return depositHistory[user];
    }

    /**
     * @dev 计算总余额
     * 演示：循环、数组遍历、pure vs view
     */
    function calculateTotalBalance() external view returns (uint256) {
        uint256 total = 0;

        // 遍历用户列表
        for (uint256 i = 0; i < userList.length; i++) {
            total += balances[userList[i]];
        }

        return total;
    }

    /**
     * @dev 获取用户数量
     * 演示：数组长度、pure 函数
     */
    function getUserCount() external view returns (uint256) {
        return userList.length;
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 暂停合约
     * 演示：onlyOwner 修饰符、状态修改
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ==================== 工具函数 ====================

    /**
     * @dev 三元运算符示例
     * 演示：条件表达式
     */
    function max(uint256 a, uint256 b) public pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @dev 类型转换示例
     */
    function addressToUint(address addr) public pure returns (uint160) {
        return uint160(addr);
    }

    /**
     * @dev 字节操作示例
     */
    function computeHash(string memory input) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(input));
    }

    // ==================== 查询函数 ====================

    /**
     * @dev 获取合约信息
     * 演示：多返回值、全局变量
     */
    function getContractInfo() external view returns (
        address _owner,
        uint256 _deployTime,
        uint256 _totalDeposits,
        uint256 _userCount,
        bool _paused,
        uint256 _contractBalance
    ) {
        return (
            owner,
            deployTime,
            totalDeposits,
            userList.length,
            paused,
            address(this).balance
        );
    }

    /**
     * @dev 检查地址类型
     * 演示：address.code.length
     */
    function isContract(address addr) public view returns (bool) {
        return addr.code.length > 0;
    }
}
```


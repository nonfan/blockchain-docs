# 合约结构与核心组成

Solidity 智能合约是一个部署在以太坊区块链上的程序，由**状态变量、函数和其他结构**
组成，运行于以太坊虚拟机（EVM）。合约的基本结构包括许可声明、编译器版本、状态变量、构造函数、函数等。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    // 状态变量
    uint256 public value;

    // 构造函数
    constructor(uint256 _value) {
        value = _value;
    }

    // 函数
    function setValue(uint256 _v) public {
        value = _v;
    }
}
```

## 生命周期

**生命周期概览：**

| 阶段   | 说明                       |
|------|--------------------------|
| 构造部署 | 部署时运行 constructor        |
| 运行期  | 用户调用、状态改变等               |
| 销毁阶段 | 可选，`selfdestruct()` 删除合约 |

## 状态变量与作用域

**状态变量：** 定义在函数外、合约内部。如： `uint public count = 0;`

**作用域类型：**

| 类型   | 示例                                | 可访问范围         |
|------|-----------------------------------|---------------|
| 状态变量 | `uint256 x;`                      | 整个合约          |
| 局部变量 | `function f() {}`                 | 仅在函数内有效       |
| 全局变量 | `msg.sender`, `block.timestamp` 等 | EVM 提供的内建只读信息 |

## 构造函数

构造函数 `constructor` 只在合约部署时执行一次，可用于初始化状态变量、设置合约所有者等。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MyContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}
```

## 枚举与结构体

**枚举 `enum`: 用于定义有限状态集**，如状态机：

```solidity
enum Status {Pending, Approved, Rejected}
Status public status;
```

**结构体 `struct` 打包多个变量为自定义类型：**

```solidity
struct Task {
    string content;
    bool done;
}

Task[] public tasks;
```

## 数组与映射

:::code-group

```solidity [数组 array]
uint[] public numbers;

function push(uint num) public {
numbers.push(num);
}

```

```solidity [映射 mapping]
mapping(address => uint256) public balances;

function setBalance(uint256 amount) public {
balances[msg.sender] = amount;
}
```

:::

## 事件

### 事件声明与使用

事件用于记录链上日志，便于前端监听与索引。

```solidity
event Transferred(address indexed from, address indexed to, uint256 amount);

    function transfer(address to, uint256 amount) public {
        emit Transferred(msg.sender, to, amount);
    }
```

- `indexed`：允许按地址筛选事件（最多 3 个）
- 非 `indexed` 参数：存入 data 区域

### 事件日志解析与 ABI 编码

Solidity 事件（`event`）是合约发出的日志，存储在以太坊交易的 `receipt.logs` 中，可用于 **前端监听、状态追踪、异步通知等场景**。

#### 编码结构分析（ABI 层面）

一个事件日志在链上结构大致如下：

| 字段             | 说明                         |
| -------------- | -------------------------- |
| `address`      | 触发事件的合约地址                  |
| `topics[0]`    | 事件签名的 keccak256 哈希值（唯一 ID） |
| `topics[1..n]` | `indexed` 参数（按声明顺序编码）      |
| `data`         | 其他非 indexed 参数（ABI 编码）     |


#### 事件编码过程分析

```solidity
event LogExample(address indexed from, uint256 value);

function emitLog() public {
    emit LogExample(msg.sender, 123);
}
```

- 事件签名哈希（`topics[0]`）：



```text
keccak256("LogExample(address,uint256)")  
= 0xd8cdb5c66d1b4817e92d82f5ed87170df89eb0cfb703bdf6d979abf176f2e7ef
```

- `topics[1] = msg.sender` 的地址（left-padded to 32 bytes）

- `data = abi.encode(123)` → 编码为 32 字节整数


#### 解析事件日志

通过 `ethers.js` 解析 Solidity 事件日志（适用于前端或脚本），从交易收据中提取事件数据。以下是详细步骤和示例：

**1. 定义 ABI 与合约实例:**

```ts
const abi = [
  "event LogExample(address indexed from, uint256 value)"
];

const iface = new ethers.utils.Interface(abi);
```

**获取交易 receipt 并解析 logs:**

```ts
const receipt = await provider.getTransactionReceipt(txHash);

for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog(log);
    console.log("from:", parsed.args.from);
    console.log("value:", parsed.args.value.toString());
  } catch (err) {
    // 如果不是匹配的事件会报错，跳过即可
  }
}
```

#### 使用 abi.encode 手动构造日志筛选器 <Badge type="tip" text="ether v6"/>

如果你想离线构造事件 topic 筛选器（如用 Web3 RPC 过滤器）：

```ts
import { id, hexZeroPad } from "ethers"; // v6 顶级导出
import { JsonRpcProvider } from "ethers";

const topic0 = id("LogExample(address,uint256)");
const topic1 = hexZeroPad(someAddress, 32);
const provider = new JsonRpcProvider(RPC_URL);
const logs = await provider.getLogs({ address, topics });
```



## 函数修饰符

函数修饰符 `modifier` 用于复用验证逻辑，比如权限控制：

```solidity
modifier onlyOwner() {
require(msg.sender == owner, "Not owner");
_;
}

function withdraw() public onlyOwner {
// ...
}
```

- `_` 表示函数主体将在此处插入

## 合约继承、重写与多态性

**继承：使用 `is`**

```solidity
contract Parent {
    function hello() public virtual returns (string memory) {
        return "Parent";
    }
}

contract Child is Parent {
    function hello() public override returns (string memory) {
        return "Child";
    }
}
```

| 关键词        | 用途          |
|------------|-------------|
| `is`       | 表示继承父合约     |
| `virtual`  | 允许被子类重写     |
| `override` | 重写父类函数时必须标注 |

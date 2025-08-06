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

## 事件声明与使用

事件用于记录链上日志，便于前端监听与索引。

```solidity
event Transferred(address indexed from, address indexed to, uint256 amount);

    function transfer(address to, uint256 amount) public {
        emit Transferred(msg.sender, to, amount);
    }
```

- `indexed`：允许按地址筛选事件（最多 3 个）

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

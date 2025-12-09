# 模块化设计

## 合约接口

> 合约接口（interface） 只**定义函数签名**，不包含函数实现、**不能定义状态变量和构造函数**、用于不同合约之间的通信，告诉调用方目标合约的对外可调用函数有哪些、函数的参数和返回值类型。接口就像是一种“协议”，保证调用方知道合约应该实现哪些外部函数。

**接口的特点:**

- 只能声明 `external` 函数（不能是 `public`、`internal`、`private`）。
- 函数体必须为空，没有实现代码。
- 不能定义任何状态变量。
- 不能定义构造函数。
- 可以继承其他接口。

:::code-group

```solidity [ERC20 接口的简化写法]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    // 代币转账函数，只定义签名，没有实现
    function transfer(address to, uint256 amount) external returns (bool);

    // 查询账户余额
    function balanceOf(address account) external view returns (uint256);

    // 事件可以定义在接口中
    event Transfer(address indexed from, address indexed to, uint256 value);
}
```

```solidity [使用 ERC20 接口]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    // 代币转账函数，只定义签名，没有实现
    function transfer(address to, uint256 amount) external returns (bool);

    // 查询账户余额
    function balanceOf(address account) external view returns (uint256);

    // 事件可以定义在接口中
    event Transfer(address indexed from, address indexed to, uint256 value);
}

contract MyContract { // [!code ++:5]
    function sendTokens(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }
}
```

:::

## 抽象合约

> `abstract contract` 概念抽象合约是 Solidity 中一种特殊的合约类型。

- 可以包含已实现的函数和状态变量。 
- 可以包含未实现的函数（抽象函数），即只声明函数签名，没有函数体。 
- 不能被直接部署或实例化，只能被其他合约继承。 
- 继承抽象合约的子合约必须实现所有抽象函数，否则它也必须声明为抽象合约。

```solidity [抽象合约示例]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract BaseContract {
    // 已实现的函数
    function sayHello() public pure returns (string memory) {
        return "Hello from BaseContract";
    }

    // 抽象函数，只声明不实现
    function mustImplement(uint256 value) public virtual returns (uint256);
}

contract ChildContract is BaseContract {
    // 必须实现抽象函数
    function mustImplement(uint256 value) public override returns (uint256) {
        return value * 2;
    }
}
```

> [!INFO] 关键点
> `abstract` 关键字标记合约为抽象合约。抽象函数不写函数体，通常加 `virtual` 方便子合约覆盖。继承抽象合约的子合约要实现所有抽象函数，才能编译通过。

## 合约解耦与模块划分实践

> 合约解耦和模块划分是区块链项目工程化的关键，合理设计模块不仅提升代码质量和安全性，还方便团队开发和后期升级维护。

## 多合约项目规范

### 项目结构设计

> 按功能模块划分合约目录，保持代码清晰有序，方便维护。

```text
contracts/
├── token/
│   ├── ERC20.sol
│   └── ERC721.sol
├── voting/
│   ├── Voting.sol
│   └── Governance.sol
└── library/
    ├── SafeMath.sol
    └── Utils.sol
```

统一 Solidity 版本管理，通过配置文件（如 `hardhat.config.js` 或 `truffle-config.js`）指定，避免版本兼容问题。

### 编译

- 使用主流工具进行统一编译： [Hardhat](https://hardhat.org/hardhat-runner/docs/getting-started)、`Truffle`、`Foundry` 都支持多合约编译。

- 编译产出：

  - ABI（Application Binary Interface，合约接口描述文件）：供前端和其他合约调用。 
  - Bytecode（字节码）：供部署到链上。

- 编译命令示例（Hardhat）：

```bash
npx hardhat compile
```

- 多合约编译会一次性输出所有合约的 ABI 和 Bytecode。


## 最小代理合约（Minimal Proxy）

> 最小代理合约是一种轻量级的合约代理模式，也称为 EIP-1167 代理合约。

它通过一个极简的代理合约来转发调用到一个逻辑合约（实现合约），从而：

- 节省部署成本（节省Gas）
- 实现合约复用和升级
- 减少链上存储空间

### Clone 工厂模式

> Clone 工厂模式是基于 最小代理合约（Minimal Proxy） 的一种设计模式。

它通过工厂合约批量创建“克隆合约”（即最小代理合约），这些克隆合约指向同一个实现合约逻辑，从而：

- 大幅降低合约部署成本 
- 支持快速、大规模部署合约实例 
- 方便管理和升级合约逻辑

**Clone 工厂模式结构组成:**

| 角色       | 说明                        |
| -------- | ------------------------- |
| **逻辑合约** | 实现具体业务逻辑的主合约，只部署一次        |
| **克隆合约** | Minimal Proxy 代理合约，指向逻辑合约 |
| **工厂合约** | 负责批量创建克隆合约的合约             |

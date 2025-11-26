# Utils

> 基础工具，所有合约都在用

## Context

OpenZeppelin 为了兼容 meta-transaction（元交易），因此包装 `msg.sender` 和 `msg.data`。

> 用户并不直接发送交易, 而是签名 → 由“中继者 relayer”帮他发 msg.sender = relayer，不是用户,但你希望“业务逻辑中的 sender == 用户本人”

因此 meta-tx 环境中，上层合约会 override msgSender：

```solidity
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}
```

```solidity
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

contract Utils is Context {
    function getSender() public view returns (address) {
        return _msgSender();
    }
}
```

## Strings

`using Strings for uint256;` 的作用是让 uint256 类型可以直接调用 Strings 库的函数，比如 `value.toString()`。

```solidity
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
// 或者 import "@openzeppelin/contracts/utils/Strings.sol";

contract Utils {
    using Strings for uint256;
}
```

| 模块          | 方法                               | 功能                     | 输入           | 输出    | 注意 / 示例                       |
| ------------- | ---------------------------------- | ------------------------ | -------------- | ------- | --------------------------------- |
| 数值 ↔ 字符串 | `toString(uint256)`                | uint → 十进制字符串      | uint256        | string  | `Strings.toString(123)` → `"123"` |
|               | `toStringSigned(int256)`           | int → 十进制字符串       | int256         | string  | 支持负数                          |
|               | `toHexString(uint256)`             | uint → 十六进制          | uint256        | string  | 自动长度                          |
| 地址 ↔ 字符串 | `toHexString(address)`             | 地址 → 不校验十六进制    | address        | string  | "0x..."                           |
|               | `toChecksumHexString(address)`     | 地址 → EIP-55 校验地址   | address        | string  | `"0xAbC123..."`                   |
| 字符串解析    | `parseUint` / `tryParseUint`       | 字符串 → uint256         | string         | uint256 | 非法字符会 revert / 返回 false    |
|               | `parseInt` / `tryParseInt`         | 字符串 → int256          | string         | int256  | 支持符号                          |
|               | `parseHexUint` / `tryParseHexUint` | 十六进制字符串 → uint256 | string         | uint256 | 支持 "0x"                         |
|               | `parseAddress` / `tryParseAddress` | 字符串 → address         | string         | address | 支持 "0x"                         |
| JSON 转义     | `escapeJSON`                       | 转义特殊字符             | string         | string  | 用于 NFT metadata                 |
| 工具 / 内部   | `_tryParseChr`                     | ASCII → 数值             | bytes1         | uint8   | 内部方法                          |
|               | `_unsafeReadBytesOffset`           | 读取 bytes32             | bytes, uint256 | bytes32 | 内部方法                          |

## Math

OpenZeppelin 的 `Math.sol` 是以太坊上最强、最底层的数学工具库。

| 功能                              | 用途                                         |
| --------------------------------- | -------------------------------------------- |
| 512 位加法、乘法                  | 解决 uint256 无法存储超大值的问题            |
| 安全数学运算（tryAdd、tryMul 等） | 不 revert，返回是否成功                      |
| 饱和运算（saturatingAdd 等）      | 溢出时返回最大值                             |
| 进位无分支函数（ternary）         | 节约 gas                                     |
| 全精度除法（mulDiv）              | 防止溢出、用于精确计算，如 Uniswap、流动性池 |
| 左右移乘法（mulShr）              | 位运算场景                                   |
| 模逆 invMod                       | 求 modular inverse（加密学常用）             |
| 模幂 modExp                       | 调用 EIP-198 预编译合约                      |

:::code-group

```solidity [add512]
pragma solidity ^0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract Utils {
    /**
     * @dev 计算两个 uint256 无符号整数 a 和 b 的和，并返回 512 位结果的高低位。
     *
     * 这个函数使用 OpenZeppelin 的 Math.add512 实现，可以检测溢出：
     * - `low` 代表结果的低 256 位（即普通加法结果的低位，如果溢出会回绕）。
     * - `high` 代表结果的高 256 位（如果发生溢出，则 high = 1，否则 high = 0）。
     *
     * 示例：
     * a = 2**256 - 1, b = 1
     * sum(a, b) => high = 1, low = 0
     *
     * @param a 第一个加数
     * @param b 第二个加数
     * @return high 高位（如果溢出为 1，否则为 0）
     * @return low 低位（加法结果的低 256 位）
     */
    function sum(uint256 a, uint256 b) public pure returns (uint256 high, uint256 low) {
        return Math.add512(a, b);
    }
}
```

:::

## SafeCast

SafeCast 是一个用于 安全类型转换（type casting） 的工具库，保证从大整数向小整数类型转换时不会 silently truncate（静默截断）。

**SafeCast 常用函数：**

| 函数                             | 作用                                    |
| ------------------------------ | ------------------------------------- |
| `toUint248/240/.../8(uint256)` | 把 uint256 安全转换成更小的 uint 类型            |
| `toInt128/64/32/... (int256)`  | 把 int256 转小 int                       |
| `toUint256(int256)`            | 安全转换 int → uint（负数会 revert）           |
| `toInt256(uint256)`            | 安全转换 uint → int（超过 int256 范围会 revert） |


## Address

Address 是 Solidity 开发中最常用的工具库之一，用来安全地处理地址（address）相关的所有操作。

**Address 库提供的核心功能:**

| 功能                          | 方法                                     | 简约解释                                    |
| --------------------------- | -------------------------------------- | --------------------------------------- |
| 判断一个地址是否为合约                 | `isContract(address)`                  | 判断地址是否有代码（合约地址返回 true，普通钱包返回 false）     |
| 安全向地址发送 ETH                 | `sendValue(address payable, uint256)`  | 比 `transfer` 更安全，不受 2300 gas 限制，可防止发送失败 |
| 安全调用合约（call / staticcall 等） | `functionCall`、`functionCallWithValue` | 安全封装 `call`，自动检查返回是否成功并处理错误原因           |
| 异常处理（bubble revert reason）  | 内部辅助函数                                 | 调用失败时，把目标合约的 revert 信息原样向上抛出，便于调试       |



## Pausable

Pausable 是一个 可暂停合约的工具模块，允许你在合约中临时停用某些敏感操作，例如交易、转账或其他关键函数。

这种机制通常用于：

- 紧急情况（Emergency）处理：发现漏洞或异常行为时，可以暂停合约操作。
- 安全控制：防止在升级或维护时发生不必要的操作。

它本质上是一个 状态管理工具，提供了 paused 状态，以及对应的函数修饰符（modifier）。

**Pausable 提供以下核心功能：**

| 功能              | 说明                    |
| --------------- | --------------------- |
| `_pause()`      | 内部函数，将合约状态设置为“暂停”     |
| `_unpause()`    | 内部函数，将合约状态恢复为“正常”     |
| `paused()`      | 查看合约当前是否处于暂停状态        |
| `whenNotPaused` | 修饰符，用于限定函数仅在合约未暂停时可调用 |
| `whenPaused`    | 修饰符，用于限定函数仅在合约暂停时可调用  |

:::code-group

```solidity [继承 Pausable]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";

contract GameContract is Pausable {
    uint256 public score;

    // 设置分数，只有未暂停时可以调用
    function setScore(uint256 _score) external whenNotPaused {
        score = _score;
    }

    // 紧急暂停合约
    function pauseGame() external {
        _pause();
    }

    // 恢复合约
    function resumeGame() external {
        _unpause();
    }

    // 只有暂停状态下可执行的操作
    function emergencyReset() external whenPaused {
        score = 0;
    }
}
```

```solidity [Pausable 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

import {Context} from "../utils/Context.sol";

/**
 * @dev 可暂停合约模块，允许子合约实现紧急停止（Emergency Stop）机制。
 * 可以由授权账户触发暂停或恢复。
 *
 * 通过继承使用该模块。会提供两个函数修饰符：
 * - `whenNotPaused`：函数只能在合约未暂停时执行
 * - `whenPaused`：函数只能在合约暂停时执行
 *
 * 注意：仅继承该模块不会自动暂停合约，必须在函数上使用这些修饰符。
 */
abstract contract Pausable is Context {
    // 合约是否处于暂停状态
    bool private _paused;

    /**
     * @dev 当合约被暂停时触发，记录触发暂停的账户
     */
    event Paused(address account);

    /**
     * @dev 当合约恢复运行时触发，记录恢复的账户
     */
    event Unpaused(address account);

    /**
     * @dev 合约操作失败，原因：合约处于暂停状态
     */
    error EnforcedPause();

    /**
     * @dev 合约操作失败，原因：合约未处于暂停状态
     */
    error ExpectedPause();

    /**
     * @dev 修饰符：函数仅在合约未暂停时可调用
     *
     * 要求：
     * - 合约必须未暂停
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev 修饰符：函数仅在合约暂停时可调用
     *
     * 要求：
     * - 合约必须处于暂停状态
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev 返回合约当前是否暂停
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev 如果合约处于暂停状态则抛出异常
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev 如果合约未处于暂停状态则抛出异常
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev 内部函数：触发合约暂停状态
     *
     * 要求：
     * - 合约必须未暂停
     *
     * 触发 Paused 事件
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev 内部函数：取消合约暂停，恢复正常状态
     *
     * 要求：
     * - 合约必须处于暂停状态
     *
     * 触发 Unpaused 事件
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}
```

:::

## ReentrancyGuard

> [!DANGER] 什么是重入攻击
> 重入攻击指的是攻击者在合约调用外部合约（比如 call 或 transfer）时，在外部合约回调中再次调用原合约，导致合约状态不一致，从而重复提取资产。
> ```solidity
>function withdraw(uint256 amount) public {
>    require(balances[msg.sender] >= amount);
>    (bool success,) = msg.sender.call{value: amount}(""); // 外部调用
>    require(success);
>    balances[msg.sender] -= amount; // 状态修改在后面，容易被重入
>}
>```

ReentrancyGuard 提供了一个状态锁，确保同一个函数在执行时不能被再次调用，从而防止重入攻击。

**核心机制:**

- 合约有一个 _status 状态：`NOT_ENTERED = 1` 和 `ENTERED = 2`
- 使用 `nonReentrant` 修饰符：调用函数时先检查 _status 是否为 `ENTERED`，如果是，则 revert; 函数执行完毕后重置 _status。

:::code-group

```solidity [继承 ReentrancyGuard]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleBank
 * @dev 一个简单的银行合约，用户可以存款和取款
 * 演示 ReentrancyGuard 的使用，防止重入攻击
 */
contract SimpleBank is ReentrancyGuard {
    mapping(address => uint256) private balances;

    // 存款
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
    }

    // 取款，使用 nonReentrant 防止重入攻击
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // 先修改状态
        balances[msg.sender] -= amount;

        // 再转账，防止重入攻击
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // 查询余额
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}
```

```solidity [ReentrancyGuard 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

import {StorageSlot} from "./StorageSlot.sol";

/**
 * @dev 可防止重入攻击的合约模块。
 *
 * 继承自 `ReentrancyGuard` 后，会提供 `nonReentrant` 修饰符，
 * 可以用于函数，确保函数在调用期间不会被嵌套（重入）调用。
 *
 * 注意：
 * - 因为只有一个重入保护，如果一个函数标记为 `nonReentrant`，不能直接调用另一个
 *   `nonReentrant` 函数。可通过将内部逻辑函数设为 `private`，再加外部 `nonReentrant` 
 *   入口函数解决。
 *
 * 提示：
 * - 如果链支持 EIP-1153（临时存储），建议使用 `ReentrancyGuardTransient`。
 *
 * 重要：
 * - 该基于存储的重入保护在 v6.0 中将被废弃，由 `ReentrancyGuardTransient` 替代。
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // 存储槽常量，用于存储重入状态
    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    /**
     * 布尔型比 uint256 或完整字更贵，因为每次写入都需要先读取 SLOAD，
     * 替换位后再写回，目的是防止升级合约出现指针混淆。
     * 这里使用 uint256 更节省 gas。
     */

    // 非进入状态
    uint256 private constant NOT_ENTERED = 1;
    // 已进入状态
    uint256 private constant ENTERED = 2;

    /**
     * @dev 重入调用错误
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        // 部署时初始化为未进入状态
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev 修饰符：防止函数被重入调用
     *
     * 注意：`nonReentrant` 函数不能调用另一个 `nonReentrant` 函数
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev view 版本的重入保护。阻止 view 函数在调用时读取到不一致状态
     *
     * 注意：仅适用于 view 函数，不修改重入状态
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    /**
     * @dev 内部函数，检查是否重入，仅限 view 使用
     */
    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    /**
     * @dev 内部函数，重入前检查并标记状态为 ENTERED
     */
    function _nonReentrantBefore() private {
        // 首次调用 nonReentrant 时，状态为 NOT_ENTERED
        _nonReentrantBeforeView();

        // 标记为已进入，后续重入调用将失败
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    /**
     * @dev 内部函数，重入调用后恢复状态为 NOT_ENTERED
     */
    function _nonReentrantAfter() private {
        // 将状态恢复为 NOT_ENTERED，可以触发 gas refund
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev 返回当前是否处于 "entered" 状态
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    /**
     * @dev 返回重入保护存储槽
     */
    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}
```
:::
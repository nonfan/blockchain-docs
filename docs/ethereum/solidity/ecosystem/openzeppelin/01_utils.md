# Utils

> 基础工具库：让 Solidity 开发更高效

> [!IMPORTANT] 本节重点
> 1. 如何进行安全的类型转换？
> 2. 字符串处理的最佳实践是什么？
> 3. 数学运算如何防止溢出？
> 4. 数据结构（Set、Map）如何使用？
> 5. 如何优化 Gas 消耗？

## Context

**Context** 是所有 OpenZeppelin 合约的基础抽象，提供了对 `msg.sender` 和 `msg.data` 的封装。

### 为什么需要 Context？

在普通合约中直接使用 `msg.sender` 是安全的，但在**元交易（Meta-Transaction）**场景下，实际用户和交易发送者不同：

```mermaid
sequenceDiagram
    participant 用户
    participant Relayer 中继者
    participant 合约

    用户->>Relayer: 签名消息（不发送交易）
    Relayer->>合约: 发送交易（msg.sender = Relayer）
    Note over 合约: 需要从 msg.data 中提取真实用户地址

    style Relayer fill:#FFD700
    style 合约 fill:#87CEEB
```

### 实现原理

:::code-group

```solidity [Context 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev 提供 msg.sender 和 msg.data 的抽象
 * 支持元交易场景下的真实调用者识别
 */
abstract contract Context {
    /**
     * @dev 返回调用者地址
     * 元交易合约可以重写此函数提取真实用户
     */
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    /**
     * @dev 返回调用数据
     */
    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    /**
     * @dev 返回上下文后缀长度（元交易使用）
     */
    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}
```

```solidity [元交易示例：提取真实调用者]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev 支持元交易的合约
 * 调用数据格式：[原始数据] + [真实用户地址(20 bytes)]
 */
contract MetaTxContract is Context {
    mapping(address => uint256) public balances;

    /**
     * @dev 重写 _msgSender，从 msg.data 末尾提取真实用户
     */
    function _msgSender() internal view override returns (address) {
        if (msg.data.length >= 20) {
            // 提取最后 20 字节作为真实用户地址
            return address(uint160(bytes20(msg.data[msg.data.length - 20:])));
        }
        return msg.sender;
    }

    function _contextSuffixLength() internal pure override returns (uint256) {
        return 20; // 地址长度
    }

    /**
     * @dev 存款函数（使用 _msgSender()）
     */
    function deposit() external payable {
        address user = _msgSender(); // 获取真实用户
        balances[user] += msg.value;
    }
}
```

:::

**最佳实践**：
- ✅ 所有 OpenZeppelin 合约都继承 Context
- ✅ 使用 `_msgSender()` 代替 `msg.sender`
- ✅ 使用 `_msgData()` 代替 `msg.data`

## Strings

**Strings** 库提供了强大的字符串操作功能，特别适用于 NFT metadata、链上数据展示等场景。

### 核心功能总览

| 分类        | 函数                           | 功能                    | 示例                                     |
| --------- | ---------------------------- | --------------------- | -------------------------------------- |
| 数值转字符串    | `toString(uint256)`          | uint → 十进制字符串         | `Strings.toString(123)` → `"123"`      |
|           | `toStringSigned(int256)`     | int → 十进制字符串（支持负数）    | `toStringSigned(-42)` → `"-42"`        |
|           | `toHexString(uint256)`       | uint → 十六进制字符串        | `toHexString(255)` → `"0xff"`          |
|           | `toHexString(uint256, uint)` | 固定长度十六进制             | `toHexString(15, 4)` → `"0x000f"`      |
| 地址转字符串    | `toHexString(address)`       | 地址 → 十六进制字符串         | `toHexString(addr)` → `"0x123..."`     |
|           | `toChecksumHexString(addr)`  | 地址 → EIP-55 校验和格式     | `"0xAbC123..."` (大小写混合)               |
| 字符串转数值    | `parseUint(string)`          | 字符串 → uint256         | `parseUint("123")` → `123`             |
|           | `parseInt(string)`           | 字符串 → int256          | `parseInt("-42")` → `-42`              |
|           | `parseHexUint(string)`       | 十六进制字符串 → uint        | `parseHexUint("0xff")` → `255`         |
|           | `parseAddress(string)`       | 字符串 → address         | `parseAddress("0x123...")` → `address` |
| 安全解析      | `tryParseUint(string)`       | 安全解析 uint（不会 revert） | 返回 `(bool success, uint value)`        |
| JSON 转义   | `escapeJSON(string)`         | 转义 JSON 特殊字符          | `"\"Hello\\nWorld\""` → `"\"Hello\\\\nWorld\""` |
| 比较        | `equal(string, string)`      | 字符串相等比较               | `equal("a", "a")` → `true`             |

### 实战示例

:::code-group

```solidity [NFT Metadata 生成]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @dev 链上 NFT metadata 生成
 */
contract OnChainNFT {
    using Strings for uint256;
    using Strings for address;

    struct Attributes {
        string name;
        uint256 level;
        uint256 power;
    }

    mapping(uint256 => Attributes) public tokenAttributes;

    /**
     * @dev 生成完整的 NFT metadata JSON
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        Attributes memory attr = tokenAttributes[tokenId];

        // 构建 JSON
        string memory json = string(abi.encodePacked(
            '{"name":"',
            attr.name,
            '","tokenId":',
            tokenId.toString(),
            ',"attributes":[',
            '{"trait_type":"Level","value":',
            attr.level.toString(),
            '},',
            '{"trait_type":"Power","value":',
            attr.power.toString(),
            '}]}'
        ));

        // Base64 编码
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    /**
     * @dev 生成 SVG 图像
     */
    function generateSVG(uint256 tokenId) external view returns (string memory) {
        Attributes memory attr = tokenAttributes[tokenId];

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">',
            '<text x="10" y="30">',
            attr.name,
            '</text>',
            '<text x="10" y="60">Level: ',
            attr.level.toString(),
            '</text>',
            '<text x="10" y="90">Power: ',
            attr.power.toString(),
            '</text>',
            '</svg>'
        ));

        return string(abi.encodePacked(
            "data:image/svg+xml;base64,",
            Base64.encode(bytes(svg))
        ));
    }
}
```

```solidity [地址格式化和验证]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract AddressFormatter {
    using Strings for address;

    /**
     * @dev 返回 EIP-55 校验和地址
     */
    function getChecksumAddress(address addr) external pure returns (string memory) {
        return addr.toChecksumHexString();
    }

    /**
     * @dev 从字符串解析地址（带错误处理）
     */
    function parseAddressSafe(string memory addressStr)
        external
        pure
        returns (bool success, address addr)
    {
        return Strings.tryParseAddress(addressStr);
    }

    /**
     * @dev 验证地址字符串格式
     */
    function isValidAddress(string memory addressStr)
        external
        pure
        returns (bool)
    {
        (bool success, ) = Strings.tryParseAddress(addressStr);
        return success;
    }
}
```

```solidity [安全的数值解析]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev 从链下数据安全解析数值
 */
contract SafeParser {
    event ParseResult(bool success, uint256 value);

    /**
     * @dev 安全解析用户输入（不会 revert）
     */
    function parseUserInput(string memory input) external returns (uint256) {
        (bool success, uint256 value) = Strings.tryParseUint(input);

        emit ParseResult(success, value);

        if (!success) {
            return 0; // 解析失败返回默认值
        }

        return value;
    }

    /**
     * @dev 解析十六进制输入
     */
    function parseHexInput(string memory hexStr) external returns (uint256) {
        (bool success, uint256 value) = Strings.tryParseHexUint(hexStr);

        if (!success) {
            revert("Invalid hex string");
        }

        return value;
    }
}
```

:::

## Math

**Math** 库提供了完整的数学运算功能，是 DeFi 协议的必备工具。

### 核心功能

| 分类       | 函数                      | 功能                       | 应用场景               |
| -------- | ----------------------- | ------------------------ | ------------------ |
| 基础运算     | `max(a, b)` / `min(a, b)` | 最大/最小值                   | 价格比较、阈值判断          |
|          | `average(a, b)`         | 平均值（防溢出）                 | 价格平均、份额计算          |
|          | `ceilDiv(a, b)`         | 向上取整除法                   | 分配代币、计算手续费         |
|          | `mulDiv(a, b, c)`       | `(a * b) / c`（全精度）      | Uniswap 价格计算       |
| 512 位运算 | `add512(a, b)`          | 512 位加法                  | 超大数值计算             |
|          | `mul512(a, b)`          | 512 位乘法                  | 高精度流动性计算           |
| 安全运算     | `tryAdd(a, b)`          | 安全加法（返回 bool）            | 检查溢出而不 revert      |
|          | `tryMul(a, b)`          | 安全乘法                     | 同上                 |
| 饱和运算     | `saturatingAdd(a, b)`   | 饱和加法（溢出返回 max）           | 积分系统、奖励累积          |
|          | `saturatingMul(a, b)`   | 饱和乘法                     | 同上                 |
| 平方根      | `sqrt(a)`               | 平方根（向下取整）                | AMM 价格计算、几何平均      |
|          | `sqrtRatio(a, b)`       | `sqrt(a / b)`（高精度）      | Uniswap V3 价格计算   |
| 对数       | `log2(a)` / `log10(a)`  | 对数计算                     | 幂次计算、难度调整          |
|          | `log256(a)`             | 以 256 为底的对数              | 编码优化               |
| 模运算      | `invMod(a, p)`          | 模逆运算                     | 密码学、椭圆曲线           |
|          | `modExp(b, e, m)`       | 模幂运算 `b^e mod m`         | RSA、零知识证明          |

### 实战示例

:::code-group

```solidity [DeFi 价格计算]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @dev AMM 价格计算（类似 Uniswap）
 */
contract AMMPool {
    using Math for uint256;

    uint256 public reserveA; // 代币 A 储备
    uint256 public reserveB; // 代币 B 储备

    uint256 constant FEE = 30; // 0.3% 手续费

    /**
     * @dev 计算输出数量（恒定乘积公式）
     * amountOut = (reserveB * amountIn * 997) / (reserveA * 1000 + amountIn * 997)
     */
    function getAmountOut(uint256 amountIn, bool isAtoB)
        external
        view
        returns (uint256)
    {
        uint256 reserveIn = isAtoB ? reserveA : reserveB;
        uint256 reserveOut = isAtoB ? reserveB : reserveA;

        // 使用 mulDiv 防止中间值溢出
        uint256 amountInWithFee = amountIn * (1000 - FEE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;

        return Math.mulDiv(numerator, 1, denominator);
    }

    /**
     * @dev 计算流动性份额（几何平均）
     */
    function calculateLiquidity(uint256 amountA, uint256 amountB)
        external
        pure
        returns (uint256)
    {
        // liquidity = sqrt(amountA * amountB)
        return Math.sqrt(amountA * amountB);
    }

    /**
     * @dev 安全的手续费计算（向上取整）
     */
    function calculateFee(uint256 amount) external pure returns (uint256) {
        // fee = ceil(amount * 0.3%)
        return Math.ceilDiv(amount * FEE, 10000);
    }
}
```

```solidity [奖励分配系统]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @dev 质押奖励分配
 */
contract StakingRewards {
    using Math for uint256;

    mapping(address => uint256) public stakes;
    uint256 public totalStaked;
    uint256 public rewardPool;

    /**
     * @dev 计算用户奖励份额（防溢出）
     * reward = (userStake * rewardPool) / totalStaked
     */
    function calculateReward(address user) external view returns (uint256) {
        if (totalStaked == 0) return 0;

        // 使用 mulDiv 保证精度和防溢出
        return Math.mulDiv(stakes[user], rewardPool, totalStaked);
    }

    /**
     * @dev 计算平均质押量
     */
    function getAverageStake(address[] memory users)
        external
        view
        returns (uint256)
    {
        if (users.length == 0) return 0;

        uint256 sum = 0;
        for (uint256 i = 0; i < users.length; i++) {
            // 使用饱和加法防止溢出
            sum = Math.saturatingAdd(sum, stakes[users[i]]);
        }

        return sum / users.length;
    }
}
```

```solidity [512 位高精度计算]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @dev 超大数值计算
 */
contract HighPrecisionMath {
    /**
     * @dev 检查两个 uint256 相加是否溢出
     */
    function checkAddOverflow(uint256 a, uint256 b)
        external
        pure
        returns (bool overflow, uint256 high, uint256 low)
    {
        (high, low) = Math.add512(a, b);
        overflow = (high != 0);
    }

    /**
     * @dev 计算 a * b 的完整结果（512 位）
     */
    function fullMul(uint256 a, uint256 b)
        external
        pure
        returns (uint256 high, uint256 low)
    {
        return Math.mul512(a, b);
    }
}
```

:::

## SafeCast

**SafeCast** 确保类型转换安全，防止数据截断。

### 常见转换场景

:::code-group

```solidity [安全的类型转换]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/**
 * @dev 时间戳和区块高度处理
 */
contract TimestampManager {
    using SafeCast for uint256;

    // 存储为 uint48（节省存储）
    mapping(uint256 => uint48) public timestamps;

    /**
     * @dev 记录时间戳（安全转换）
     */
    function recordTimestamp(uint256 id) external {
        // block.timestamp 是 uint256，安全转换为 uint48
        timestamps[id] = block.timestamp.toUint48();
    }

    /**
     * @dev 计算时间差（扩展为 uint256）
     */
    function getTimeSince(uint256 id) external view returns (uint256) {
        uint48 recordedTime = timestamps[id];
        // uint48 自动转换为 uint256（安全）
        return block.timestamp - uint256(recordedTime);
    }

    /**
     * @dev 批量转换
     */
    function convertToUint8(uint256[] memory values)
        external
        pure
        returns (uint8[] memory)
    {
        uint8[] memory result = new uint8[](values.length);
        for (uint256 i = 0; i < values.length; i++) {
            result[i] = values[i].toUint8(); // 超过 255 会 revert
        }
        return result;
    }
}
```

```solidity [有符号和无符号转换]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract SignedMath {
    using SafeCast for uint256;
    using SafeCast for int256;

    /**
     * @dev 价格变动计算（可能为负）
     */
    function calculatePriceChange(uint256 oldPrice, uint256 newPrice)
        external
        pure
        returns (int256)
    {
        // 安全转换为 int256 进行计算
        int256 change = newPrice.toInt256() - oldPrice.toInt256();
        return change;
    }

    /**
     * @dev 应用价格变动（处理负值）
     */
    function applyPriceChange(uint256 basePrice, int256 change)
        external
        pure
        returns (uint256)
    {
        if (change >= 0) {
            return basePrice + change.toUint256();
        } else {
            uint256 decrease = (-change).toUint256();
            require(basePrice >= decrease, "Price cannot be negative");
            return basePrice - decrease;
        }
    }
}
```

:::

## Arrays

**Arrays** 库提供数组操作工具。

:::code-group

```solidity [数组工具函数]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Arrays} from "@openzeppelin/contracts/utils/Arrays.sol";

/**
 * @dev 投票快照系统
 */
contract VotingSnapshot {
    using Arrays for uint256[];

    // 区块号 => 投票权重
    uint256[] public snapshotBlocks;
    mapping(uint256 => uint256) public votingPower;

    /**
     * @dev 记录快照
     */
    function takeSnapshot() external {
        snapshotBlocks.push(block.number);
        votingPower[block.number] = msg.sender.balance; // 示例
    }

    /**
     * @dev 查找最近的快照（二分查找）
     */
    function findNearestSnapshot(uint256 blockNumber)
        external
        view
        returns (uint256)
    {
        // upperLookup: 找到第一个 >= blockNumber 的位置
        uint256 index = snapshotBlocks.upperLookup(blockNumber);

        if (index == 0) {
            return 0; // 没有快照
        }

        return snapshotBlocks[index - 1];
    }

    /**
     * @dev 获取某个区块的投票权（基于快照）
     */
    function getVotingPowerAt(uint256 blockNumber)
        external
        view
        returns (uint256)
    {
        uint256 snapshotBlock = this.findNearestSnapshot(blockNumber);
        return votingPower[snapshotBlock];
    }
}
```

:::

## 数据结构

### EnumerableSet

**EnumerableSet** 提供可迭代的 Set 数据结构。

:::code-group

```solidity [EnumerableSet 使用]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @dev 白名单管理
 */
contract WhitelistManager {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private whitelist;

    /**
     * @dev 添加地址到白名单
     */
    function addToWhitelist(address account) external {
        require(whitelist.add(account), "Already whitelisted");
    }

    /**
     * @dev 移除白名单地址
     */
    function removeFromWhitelist(address account) external {
        require(whitelist.remove(account), "Not whitelisted");
    }

    /**
     * @dev 检查是否在白名单
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist.contains(account);
    }

    /**
     * @dev 获取白名单大小
     */
    function whitelistLength() external view returns (uint256) {
        return whitelist.length();
    }

    /**
     * @dev 获取指定索引的地址
     */
    function whitelistAt(uint256 index) external view returns (address) {
        return whitelist.at(index);
    }

    /**
     * @dev 获取所有白名单地址（Gas 密集！）
     */
    function getAllWhitelisted() external view returns (address[] memory) {
        return whitelist.values();
    }
}
```

```solidity [多类型 Set]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract MultiTypeSet {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Token ID 集合
    EnumerableSet.UintSet private ownedTokens;

    // 权限角色集合
    EnumerableSet.Bytes32Set private roles;

    /**
     * @dev 添加 Token
     */
    function addToken(uint256 tokenId) external {
        ownedTokens.add(tokenId);
    }

    /**
     * @dev 批量添加
     */
    function addTokens(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            ownedTokens.add(tokenIds[i]);
        }
    }

    /**
     * @dev 获取所有 Token
     */
    function getOwnedTokens() external view returns (uint256[] memory) {
        return ownedTokens.values();
    }
}
```

:::

### EnumerableMap

**EnumerableMap** 提供可迭代的 Map 数据结构。

:::code-group

```solidity [EnumerableMap 使用]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/**
 * @dev 用户积分系统
 */
contract PointsSystem {
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    EnumerableMap.AddressToUintMap private userPoints;

    /**
     * @dev 设置用户积分
     */
    function setPoints(address user, uint256 points) external {
        userPoints.set(user, points);
    }

    /**
     * @dev 获取用户积分
     */
    function getPoints(address user) external view returns (uint256) {
        return userPoints.get(user);
    }

    /**
     * @dev 尝试获取积分（不会 revert）
     */
    function tryGetPoints(address user)
        external
        view
        returns (bool exists, uint256 points)
    {
        return userPoints.tryGet(user);
    }

    /**
     * @dev 移除用户
     */
    function removeUser(address user) external {
        userPoints.remove(user);
    }

    /**
     * @dev 获取用户数量
     */
    function userCount() external view returns (uint256) {
        return userPoints.length();
    }

    /**
     * @dev 获取第 N 个用户
     */
    function getUserAt(uint256 index)
        external
        view
        returns (address user, uint256 points)
    {
        return userPoints.at(index);
    }

    /**
     * @dev 获取前 N 名用户
     */
    function getTopUsers(uint256 n)
        external
        view
        returns (address[] memory users, uint256[] memory points)
    {
        uint256 length = userPoints.length();
        uint256 count = n > length ? length : n;

        users = new address[](count);
        points = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            (users[i], points[i]) = userPoints.at(i);
        }
    }
}
```

:::

## Counters

**Counters** 提供安全的递增/递减计数器（已废弃，建议直接使用 `++` / `--`）。

:::code-group

```solidity [现代写法（推荐）]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Solidity 0.8+ 内置溢出检查
 */
contract ModernCounter {
    uint256 private _tokenIdCounter;

    /**
     * @dev 生成新的 Token ID
     */
    function mint() external returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++; // 安全，内置溢出检查
        return tokenId;
    }

    /**
     * @dev 当前计数
     */
    function currentCount() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
```

:::

## Multicall

**Multicall** 允许在单个交易中执行多个函数调用，节省 Gas。

:::code-group

```solidity [Multicall 实现]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";

/**
 * @dev 支持批量操作的代币合约
 */
contract BatchToken is Multicall {
    mapping(address => uint256) public balances;

    /**
     * @dev 转账
     */
    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    /**
     * @dev 授权
     */
    function approve(address spender, uint256 amount) external {
        // 授权逻辑
    }

    /**
     * @dev 使用示例（前端调用）：
     *
     * const calls = [
     *   contract.interface.encodeFunctionData("transfer", [addr1, 100]),
     *   contract.interface.encodeFunctionData("transfer", [addr2, 200]),
     *   contract.interface.encodeFunctionData("approve", [spender, 1000])
     * ];
     *
     * await contract.multicall(calls); // 一次交易完成所有操作
     */
}
```

:::

## 最佳实践

### 1. 选择合适的工具

```solidity
// ❌ 手动实现字符串转换
function uintToString(uint256 value) public pure returns (string memory) {
    // 100 行代码...
}

// ✅ 使用 Strings 库
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

function uintToString(uint256 value) public pure returns (string memory) {
    return Strings.toString(value);
}
```

### 2. 防止溢出

```solidity
// ✅ Solidity 0.8+ 自动检查
uint256 a = type(uint256).max;
// a + 1; // 会 revert

// ✅ 使用 Math.tryAdd 不 revert
(bool success, uint256 result) = Math.tryAdd(a, 1);
if (!success) {
    // 处理溢出
}

// ✅ 使用饱和运算
uint256 safe = Math.saturatingAdd(a, 1); // 返回 type(uint256).max
```

### 3. Gas 优化

```solidity
// ❌ 遍历数组查找
function contains(uint256[] memory arr, uint256 value) public pure returns (bool) {
    for (uint256 i = 0; i < arr.length; i++) {
        if (arr[i] == value) return true;
    }
    return false;
} // O(n)

// ✅ 使用 EnumerableSet
EnumerableSet.UintSet private values;

function contains(uint256 value) public view returns (bool) {
    return values.contains(value);
} // O(1)
```

### 4. 类型安全

```solidity
// ❌ 不安全的转换
uint256 bigNumber = 1000;
uint8 smallNumber = uint8(bigNumber); // 截断为 232，无警告！

// ✅ 使用 SafeCast
uint8 smallNumber = SafeCast.toUint8(bigNumber); // revert
```

## 常见问题 FAQ

### Q1: 何时使用 Math.mulDiv vs 直接乘除？

**A:**
```solidity
// 直接计算可能溢出
uint256 result = (a * b) / c; // a * b 可能 > uint256.max

// mulDiv 保证不溢出
uint256 result = Math.mulDiv(a, b, c); // 使用 512 位中间值
```

### Q2: EnumerableSet 和普通 mapping 如何选择？

**A:**

| 需求          | 使用             | 原因                |
| ----------- | -------------- | ----------------- |
| 仅需检查是否存在    | `mapping`      | 更便宜（O(1)）         |
| 需要遍历所有元素    | `EnumerableSet` | 支持迭代              |
| 需要获取集合大小    | `EnumerableSet` | 内置 `length()`     |
| 需要批量返回所有元素  | `EnumerableSet` | 内置 `values()`     |
| 只在链下查看      | `mapping`      | 可通过事件+链下索引实现     |

### Q3: 如何选择字符串编码方式？

```solidity
// UTF-8 字符串（普通）
string memory text = "Hello";

// Base64 编码（NFT metadata）
string memory base64 = Base64.encode(bytes(text));

// JSON 转义（特殊字符）
string memory json = Strings.escapeJSON('He said "Hi"');
```

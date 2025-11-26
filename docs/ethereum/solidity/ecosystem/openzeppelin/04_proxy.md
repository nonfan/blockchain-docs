# Proxy

可升级合约（Upgradeable Contracts）允许在不改变合约地址、不迁移数据的情况下升级逻辑。这是 DeFi、GameFi、DAO、NFT 系统开发者必须掌握的核心技能。

**OZ 支持三种可升级模式:**
- `UUPS`（推荐）
- `Transparent Proxy`
- `Beacon Proxy`

如果你要使用可升级合约（Upgradeable）模块，必须安装：

```bash
npm install @openzeppelin/contracts-upgradeable
# yarn
yarn add @openzeppelin/contracts-upgradeable
```

> [!TIP] 
> OpenZeppelin 为了避免逻辑混乱，将可升级与非可升级模块拆成两个库：`@openzeppelin/contracts` 和 `@openzeppelin/contracts-upgradeable`

## UUPS

UUPS 为现代主流方案，其 Proxy 轻量，升级逻辑由“逻辑合约自身”提供，且未来维护成本最低。

OpenZeppelin 官方主推荐所有新项目使用。


:::code-group

```solidity [继承 UUPSUpgradeable]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// ----------- OpenZeppelin 可升级模块 -----------
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // -------------------------
    // 1. 状态变量（必须保持布局不变）
    // -------------------------
    uint256 public value;
    string private message;

    // 保留空间，确保以后加入变量不会覆盖现有布局
    uint256[45] private __gap;

    // -------------------------
    // 2. initialize 取代 constructor
    // -------------------------
    function initialize(uint256 _value, string memory _msg) public initializer {
        // 初始化 Ownable
        __Ownable_init(msg.sender);

        // 设置初始值
        value = _value;
        message = _msg;
    }

    // -------------------------
    // 3. 普通函数
    // -------------------------
    function setValue(uint256 newValue) external onlyOwner {
        value = newValue;
    }

    function getMessage() external view returns (string memory) {
        return message;
    }

    // -------------------------
    // 4. UUPS 授权函数（必须实现）
    // -------------------------
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

}
```

```solidity [UUPSUpgradeable 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (proxy/utils/UUPSUpgradeable.sol)

pragma solidity ^0.8.22;

import {IERC1822Proxiable} from "../../interfaces/draft-IERC1822.sol";
import {ERC1967Utils} from "../ERC1967/ERC1967Utils.sol";

/**
 * @dev UUPS 升级机制（proxy 是 minimal 的，升级逻辑放在 implementation 内）
 *
 * 当一个合约作为 UUPS 代理的逻辑合约时，本合约提供「升级实现的函数」。
 *
 * 安全机制：升级时会检查升级后的实现是否仍然支持 UUPS（即 proxiableUUID 一致）。
 * 如果升级后开发者删除了 UUPSUpgradeable，则会失去此安全检查。
 *
 * _authorizeUpgrade 必须由子合约实现（例如 onlyOwner）。
 *
 * @custom:stateless 说明本合约不存储状态，安全。
 */
abstract contract UUPSUpgradeable is IERC1822Proxiable {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    /// 保存当前实现合约自己的地址，用来判断是不是 delegatecall 进来的。
    address private immutable __self = address(this);

    /**
     * @dev UUPS 接口版本。若使用 "5.0.0"，则仅存在 upgradeToAndCall，且空 data 表示无回调。
     */
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    /// @dev 未授权的调用来源
    error UUPSUnauthorizedCallContext();

    /// @dev 新实现返回了非法的 UUID
    error UUPSUnsupportedProxiableUUID(bytes32 slot);

    /**
     * @dev modifier onlyProxy
     * 要求：
     * 1. 必须通过 delegatecall 调用（即通过 proxy 调用）
     * 2. 当前 proxy 的 implementation 必须指向本合约
     */
    modifier onlyProxy() {
        _checkProxy();
        _;
    }

    /**
     * @dev modifier notDelegated
     * 要求：
     * 不能通过 delegatecall 调用，只能直接在实现合约上调用。
     * 用于阻止 proxy 调用某些函数（例如 proxiableUUID）。
     */
    modifier notDelegated() {
        _checkNotDelegated();
        _;
    }

    /**
     * @dev ERC1822 标准要求的函数，返回实现存储槽 UUID。
     * 必须阻止 proxy 调用，否则会存在「proxy delegating into itself」导致死循环。
     */
    function proxiableUUID() external view notDelegated returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    /**
     * @dev UUPS 升级主函数：
     * 1. 调用授权逻辑：_authorizeUpgrade
     * 2. 执行升级：_upgradeToAndCallUUPS
     */
    function upgradeToAndCall(address newImplementation, bytes memory data)
        public payable virtual onlyProxy
    {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data);
    }

    /**
     * @dev 执行：
     * 1. 必须是 delegatecall（proxy 调用实现）
     * 2. proxy 的实现必须是当前合约
     */
    function _checkProxy() internal view virtual {
        if (
            address(this) == __self ||        // 说明不是 delegatecall
            ERC1967Utils.getImplementation() != __self   // proxy 没有指向当前实现
        ) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev 保证该函数不是 delegatecall 调用（即不是 proxy 调的）
     */
    function _checkNotDelegated() internal view virtual {
        if (address(this) != __self) { // delegatecall 发生时 address(this) != __self
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev 必须由子合约实现来限制权限：
     *
     * 例如：
     * function _authorizeUpgrade(address) internal override onlyOwner {}
     */
    function _authorizeUpgrade(address newImplementation) internal virtual;

    /**
     * @dev 执行带安全检查的 UUPS 实现升级：
     * 1. 调用 newImplementation.proxiableUUID() 检查是否兼容 UUPS
     * 2. 检查 UUID 是否等于 ERC1967 的 IMPLEMENTATION_SLOT
     * 3. 执行升级并可选 call
     */
    function _upgradeToAndCallUUPS(address newImplementation, bytes memory data)
        private
    {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
            // UUID 必须正确
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            // 执行升级
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {
            // 新实现不支持 UUPS
            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}
```

:::


**Proxy 的本质**： 可升级合约的核心不是 Proxy，而是 `delegatecall`。

学习 `delegatecall` 工作内容：

| 项          | 解释                   |
| ---------- | -------------------- |
| 执行代码位置     | 逻辑合约（Implementation） |
| 状态存储位置     | Proxy                |
| msg.sender | 来自外部调用者（EOA/其他合约）    |
| 地址         | 永远是 Proxy 地址         |


**UUPS 可升级合约必须包含：**

| 模块                 | 作用                  |
| ------------------ | ------------------- |
| `Initializable`      | 代替 constructor      |
| `UUPSUpgradeable`    | 实现 upgradeToAndCall |
| `OwnableUpgradeable` | 控制升级权限              |

推荐顺序：

```txt
Initializable → UUPSUpgradeable → OwnableUpgradeable
```

> [!IMPORTANT] Initializable 一定要放前面
>因为它的 initializer modifier 会标记初次调用状态，必须最先执行 init 函数。

> [!IMPORTANT] UUPSUpgradeable 依赖 Ownable 的权限控制
> `_authorizeUpgrade()` 内需要调用 onlyOwner，所以 OwnableUpgradeable 必须继承。


**预留 `__gap` ?**

UUPS 升级必须保持变量布局一致, 未来如果需要加入变量, 则通过插槽来保持布局不变。

:::code-group
```solidity [原始版本]
uint256 public value;
string private message;

// 预留 45 个槽
uint256[45] private __gap;
```

```solidity [新版本]
uint256 newValue;
string newField;
mapping(address => uint256) data;

// 插槽减少 3 个
uint256[42] private __gap; // ⚠ 注意：45-3=42
```
:::

**为什么 constructor 不能用？**

可升级合约由 逻辑合约 和 Proxy 合约 组成：

- 逻辑合约只存放函数代码，不存储状态变量。
- Proxy 合约（如 ERC1967Proxy / Transparent / UUPS）负责存储所有状态变量（owner、value 等）。
- 所有对合约的调用都先进入 Proxy，再通过 delegatecall 调用逻辑合约的函数。
- 逻辑合约的代码在 Proxy 的存储上执行，Proxy 的 storage 与逻辑合约共享逻辑合约的代码执行结果。

因此，在可升级合约中，逻辑合约不需要 constructor，状态初始化必须通过 `initialize()` 在 Proxy 上完成。

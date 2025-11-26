# Access

> 权限控制, 最常用也最重要

> [!IMPORTANT] 本节重点
> 1. 如何添加管理员权限？
> 2. 如何扩展多角色管理？
> 3. 如何在 DApp 中检查权限？
> 4. 哪些函数应该 onlyOwner，哪些应该 onlyRole？

## Ownable

Ownable 是 OpenZeppelin 提供的一个合约模块，用于管理 单一所有者（Owner） 权限。

控制某些函数只能被合约的 Owner 调用，常用于控制关键操作，如资金管理、参数修改、升级权限等。

:::code-group

```solidity [继承 Ownable]
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Access is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}
    /**
     * 如果你希望使用部署人的地址作为Owner，如下
     * constructor() Ownable(msg.sender) {}
     * 
    **/
}
```

```solidity [Ownable 源码]
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Context} from "../utils/Context.sol";

/**
 * @dev 基础权限控制合约，提供单一 owner 权限管理。
 * 继承后可使用 onlyOwner 修饰符限制函数访问。
 */
abstract contract Ownable is Context {
    // 当前合约所有者
    address private _owner;

    // 自定义错误
    error OwnableUnauthorizedAccount(address account); // 非 owner 调用
    error OwnableInvalidOwner(address owner);         // 无效 owner 地址

    // 所有权转移事件
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev 构造函数，部署者为初始 owner
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(initialOwner);
    }

    /**
     * @dev 限制函数只能被 owner 调用
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev 返回当前 owner
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev 校验调用者是否为 owner
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }

    /**
     * @dev 放弃所有权，owner 变为 0
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev 转移所有权给 newOwner
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }

    /**
     * @dev 内部函数，更新 owner 并触发事件
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
```
:::


## AccessControl

AccessControl 是 OpenZeppelin 的 角色权限控制系统。

它比 Ownable 强大得多，允许你：

1. 创建多个不同的角色
2. 为每个角色授予或撤销权限
3. 设置角色的管理员
4. 使用 onlyRole 修饰器保护函数

**角色定义是 bytes32 常量：**

```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
// 默认AccessControl声明了默认超级管理员
bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
```

> [!IMPORTANT] 超重要
> `DEFAULT_ADMIN_ROLE` 才能管理所有角色
>| 规则          | 解释                           |
>| ----------- | ---------------------------- |
>| 是所有角色的默认管理员 | 可以授予/撤销任意角色                  |
>| 也可以管理自己     | 它还能授予/撤销 DEFAULT_ADMIN_ROLE！ |
>| 权限非常大       | 必须保护好这个角色                    |


**底层数据结构:**


```solidity
struct RoleData {
    mapping(address => bool) hasRole;
    bytes32 adminRole; // adminRole 默认未赋值，即0x00,也就是DEFAULT_ADMIN_ROLE
}
```

| 方法 / 常量                                | 用途说明（极简版）                        |
| -------------------------------------- | -------------------------------- |
| `DEFAULT_ADMIN_ROLE`                 | 所有角色的初始管理员（0x00），拥有最高权限，可管理所有角色。 |
| `grantRole(role, account)`           | 赋予某账号一个角色（需要该角色的管理员权限）。          |
| `revokeRole(role, account)`          | 从某账号移除角色（需要该角色的管理员权限）。           |
| `renounceRole(role, account)`        | 账号自己放弃自己角色，用于账号被盗等情况。            |
| `hasRole(role, account)`             | 检查某账号是否有某角色。                     |
| `onlyRole(role)`                     | 限制函数必须由某角色调用。                    |
| `getRoleAdmin(role)`                 | 查询某角色的管理员角色是谁。                   |
| `_grantRole / _revokeRole（internal）` | 内部函数，用于构造函数中初始化角色。               |
| `_setRoleAdmin(role, newAdmin)`      | 修改某角色的管理员（高级用法）。                 |


:::code-group

```solidity [继承 AccessControl]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyAccess is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint() external onlyRole(MINTER_ROLE) {
        // mint logic
    }
}
```

```solidity [AccessControl 源码]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAccessControl} from "./IAccessControl.sol";
import {Context} from "../utils/Context.sol";
import {IERC165, ERC165} from "../utils/introspection/ERC165.sol";

/**
 * @dev AccessControl 提供角色权限管理。
 *
 * - 每个角色用 bytes32 表示。
 * - 某个地址是否拥有某角色 = hasRole(role, account)
 * - 授权/撤销角色 = grantRole / revokeRole
 * - 每个角色有一个“管理员角色”（adminRole）
 * - 只有拥有“管理员角色”的账户才能授予/撤销对应角色
 *
 * - 默认情况下，所有角色的管理员角色是 DEFAULT_ADMIN_ROLE(0x00)
 * - DEFAULT_ADMIN_ROLE 也管理它自己（最高权限）
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    
    /**
     * @dev 每个角色的数据结构
     *
     * hasRole[address] = true/false  表示该地址是否拥有角色
     * adminRole = 管理该角色的角色 ID
     */
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    /// @dev role => RoleData
    mapping(bytes32 role => RoleData) private _roles;

    /// @dev 默认管理员角色（ID = 0x00）
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev onlyRole 修饰符：要求调用者必须具备某个角色
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @dev ERC165：接口支持声明
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return interfaceId == type(IAccessControl).interfaceId
            || super.supportsInterface(interfaceId);
    }

    /**
     * @dev 查询某地址是否拥有某个角色
     */
    function hasRole(bytes32 role, address account)
        public
        view
        virtual
        returns (bool)
    {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev 检查 msg.sender 是否具备指定角色
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev 检查任意账户是否具备角色，不具备则 revert
     */
    function _checkRole(bytes32 role, address account)
        internal
        view
        virtual
    {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev 获取“某角色”的管理员角色
     *
     * 默认：返回 0x00（DEFAULT_ADMIN_ROLE）
     */
    function getRoleAdmin(bytes32 role)
        public
        view
        virtual
        returns (bytes32)
    {
        return _roles[role].adminRole;
    }

    /**
     * @dev 授予角色
     *
     * 要求：调用者必须拥有“该角色的管理员角色”
     */
    function grantRole(bytes32 role, address account)
        public
        virtual
        onlyRole(getRoleAdmin(role))
    {
        _grantRole(role, account);
    }

    /**
     * @dev 撤销角色
     *
     * 要求：调用者必须拥有该角色的管理员角色
     */
    function revokeRole(bytes32 role, address account)
        public
        virtual
        onlyRole(getRoleAdmin(role))
    {
        _revokeRole(role, account);
    }

    /**
     * @dev 自己放弃自己的某个角色
     *
     * 用于账户被盗、设备丢失等场景
     */
    function renounceRole(bytes32 role, address callerConfirmation)
        public
        virtual
    {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev 修改某角色的管理员角色
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole)
        internal
        virtual
    {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev 内部函数：授予角色（不做权限检查）
     */
    function _grantRole(bytes32 role, address account)
        internal
        virtual
        returns (bool)
    {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev 内部函数：撤销角色（不做权限检查）
     */
    function _revokeRole(bytes32 role, address account)
        internal
        virtual
        returns (bool)
    {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}
```

:::

## AccessControlEnumerable

AccessControlEnumerable 是 AccessControl 的增强版本，增加了**链上角色成员枚举能力**，方便开发者在合约里直接查询某个角色的所有成员。

:::code-group

```solidity [继承 AccessControlEnumerable]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

contract MyAccess is AccessControlEnumerable {
    // 定义一个自定义角色
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor(address admin) {
        // 默认管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        // 授予管理员角色 MANAGER_ROLE
        _grantRole(MANAGER_ROLE, admin);
    }

    // 仅 MANAGER_ROLE 可以调用
    function restrictedFunction() public onlyRole(MANAGER_ROLE) {
        // 权限功能逻辑
    }

    // 获取某个角色的成员数量
    function getManagersCount() public view returns (uint256) {
        return getRoleMemberCount(MANAGER_ROLE);
    }

    // 获取某个角色的成员地址
    function getManager(uint256 index) public view returns (address) {
        return getRoleMember(MANAGER_ROLE, index);
    }

    // 获取某个角色的所有成员
    function getAllManagers() public view returns (address[] memory) {
        return getRoleMembers(MANAGER_ROLE);
    }
}
```

```solidity [AccessControlEnumerable 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (access/extensions/AccessControlEnumerable.sol)

pragma solidity ^0.8.24;

import {IAccessControlEnumerable} from "./IAccessControlEnumerable.sol";
import {AccessControl} from "../AccessControl.sol";
import {EnumerableSet} from "../../utils/structs/EnumerableSet.sol";
import {IERC165} from "../../utils/introspection/ERC165.sol";

/**
 * @dev AccessControl 的扩展，支持角色成员的枚举。
 */
abstract contract AccessControlEnumerable is IAccessControlEnumerable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    // 每个角色对应的成员集合
    mapping(bytes32 role => EnumerableSet.AddressSet) private _roleMembers;

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControlEnumerable).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev 返回角色 role 的第 index 个成员
     * index 范围：[0, getRoleMemberCount(role))
     * 成员顺序无固定规律，可能随时变化
     */
    function getRoleMember(bytes32 role, uint256 index) public view virtual returns (address) {
        return _roleMembers[role].at(index);
    }

    /**
     * @dev 返回角色 role 的成员数量
     * 可与 getRoleMember 一起使用来遍历角色所有成员
     */
    function getRoleMemberCount(bytes32 role) public view virtual returns (uint256) {
        return _roleMembers[role].length();
    }

    /**
     * @dev 返回角色 role 的所有成员（数组）
     * 注意：复制整个集合到内存，可能消耗大量 gas，不适合在交易中调用
     */
    function getRoleMembers(bytes32 role) public view virtual returns (address[] memory) {
        return _roleMembers[role].values();
    }

    /**
     * @dev 重写 _grantRole，在授予角色时记录到可枚举集合
     */
    function _grantRole(bytes32 role, address account) internal virtual override returns (bool) {
        bool granted = super._grantRole(role, account); // 调用父合约逻辑
        if (granted) {
            _roleMembers[role].add(account); // 加入可枚举集合
        }
        return granted;
    }

    /**
     * @dev 重写 _revokeRole，在撤销角色时从可枚举集合移除
     */
    function _revokeRole(bytes32 role, address account) internal virtual override returns (bool) {
        bool revoked = super._revokeRole(role, account); // 调用父合约逻辑
        if (revoked) {
            _roleMembers[role].remove(account); // 从可枚举集合移除
        }
        return revoked;
    }
}
```
:::
# Token 系列

OpenZeppelin 里 Token 系列合约，主要分为 ERC 标准代币、NFT、以及多代币。

## ERC20

**ERC 标准代币（ERC20 系列）:**

| 合约 / 功能         | 说明                             | 常用方法                                            |
| --------------- | ------------------------------ | ----------------------------------------------- |
| `ERC20`         | 标准可替代代币                        | `balanceOf`、`transfer`、`approve`、`transferFrom` |
| `ERC20Burnable` | 可销毁代币                          | `burn`、`burnFrom`                               |
| `ERC20Capped`   | 有总量上限的 ERC20                   | 在 `mint` 时自动检查总量                                |
| `ERC20Pausable` | 可暂停转账                          | `pause`、`unpause`，转账受阻时 revert                  |
| `ERC20Snapshot` | 可做快照                           | `snapshot`、`balanceOfAt`、`totalSupplyAt`        |
| `ERC20Permit`   | EIP-2612 支持，允许 gasless approve | `permit`（通过签名授权）                                |


:::code-group

```solidity [继承 ERC20]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev 简单 ERC20 示例，带铸币权限控制
 */
contract MyToken is ERC20, Ownable {
    
    // 构造函数：设置代币名和符号，并初始铸币
    constructor() ERC20("MyToken", "MTK") {
        // 初始发行 1000 个代币给合约部署者
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

    /**
     * @dev 只有合约拥有者可以铸币
     * @param to 接收铸币的地址
     * @param amount 铸币数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 允许销毁自己持有的代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

```solidity [ERC20 源码]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";
import {IERC20Metadata} from "./extensions/IERC20Metadata.sol";
import {Context} from "../../utils/Context.sol";
import {IERC20Errors} from "../../interfaces/draft-IERC6093.sol";

/**
 * @dev ERC20 标准实现
 * 1. 不自带铸币机制，需在子合约里调用 _mint 实现
 * 2. 默认 decimals 为 18
 * 3. 函数失败会 revert，不返回 false
 */
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {

    mapping(address => uint256) private _balances; // 账户余额
    mapping(address => mapping(address => uint256)) private _allowances; // 授权额度
    uint256 private _totalSupply; // 总供应量
    string private _name; // 代币名
    string private _symbol; // 代币符号

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    // 代币名
    function name() public view virtual returns (string memory) {
        return _name;
    }

    // 代币符号
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    // 小数位数，默认 18
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    // 总供应量
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    // 查询余额
    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    // 转账
    function transfer(address to, uint256 value) public virtual returns (bool) {
        _transfer(_msgSender(), to, value);
        return true;
    }

    // 查询授权额度
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    // 授权
    function approve(address spender, uint256 value) public virtual returns (bool) {
        _approve(_msgSender(), spender, value);
        return true;
    }

    // 授权转账
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        _spendAllowance(from, _msgSender(), value); // 扣减额度
        _transfer(from, to, value); // 执行转账
        return true;
    }

    // 内部转账
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert ERC20InvalidSender(address(0));
        if (to == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(from, to, value);
    }

    // 核心更新逻辑：支持转账、铸币(_mint)、销毁(_burn)
    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) { // 铸币
            _totalSupply += value;
        } else { // 扣余额
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) revert ERC20InsufficientBalance(from, fromBalance, value);
            unchecked { _balances[from] = fromBalance - value; }
        }

        if (to == address(0)) { // 销毁
            unchecked { _totalSupply -= value; }
        } else { // 增余额
            unchecked { _balances[to] += value; }
        }

        emit Transfer(from, to, value);
    }

    // 内部铸币
    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(address(0), account, value);
    }

    // 内部销毁
    function _burn(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidSender(address(0));
        _update(account, address(0), value);
    }

    // 内部授权
    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    // 可选择是否发 Approval 事件的内部授权
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));
        _allowances[owner][spender] = value;
        if (emitEvent) emit Approval(owner, spender, value);
    }

    // 扣减 allowance，transferFrom 调用
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            unchecked { _approve(owner, spender, currentAllowance - value, false); }
        }
    }
}
```
:::

## ERC721

ERC721 是 不可分割、独一无二的代币标准，主要用来表示：NFT、游戏道具等等，且每一个 Token ID 独一无二。

**ERC721 常用扩展：**

| 扩展                   | 含义                              | 场景         |
| -------------------- | ------------------------------- | ---------- |
| `ERC721URIStorage` | 每个 tokenId 可以存储独立的 metadata URI | 常用于头像类 NFT |
| `ERC721Enumerable` | 可以枚举所有 tokenId                  | 列表、分页 NFT  |
| `ERC721Votes`      | NFT 用于治理投票                      | DAO 投票     |
| `ERC721Burnable`   | 支持烧毁 NFT                        | 可销毁 NFT    |
| `ERC721Pausable`   | 暂停转账功能                          | 安全控制       |
| `ERC721Royalty`    | NFT 版税（支持 EIP-2981）             | 二级市场分成     |

:::code-group
```solidity [继承 ERC721]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 public nextTokenId = 1;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function mint() external {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }
}
```


```solidity [ERC721 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin ERC721 (v5.5.0)

pragma solidity ^0.8.24;

import {IERC721} from "./IERC721.sol";
import {IERC721Metadata} from "./extensions/IERC721Metadata.sol";
import {ERC721Utils} from "./utils/ERC721Utils.sol";
import {Context} from "../../utils/Context.sol";
import {Strings} from "../../utils/Strings.sol";
import {IERC165, ERC165} from "../../utils/introspection/ERC165.sol";
import {IERC721Errors} from "../../interfaces/draft-IERC6093.sol";

/**
 * @dev ERC721 NFT 标准（含 Metadata），但不包含 Enumerable。
 */
abstract contract ERC721 is Context, ERC165, IERC721, IERC721Metadata, IERC721Errors {
    using Strings for uint256;

    // NFT 名称
    string private _name;

    // NFT 符号
    string private _symbol;

    // tokenId => 所有者地址
    mapping(uint256 tokenId => address) private _owners;

    // address => 持有 NFT 数量
    mapping(address owner => uint256) private _balances;

    // tokenId => 被授权的单个地址
    mapping(uint256 tokenId => address) private _tokenApprovals;

    // owner => operator => 是否授权全部 NFT
    mapping(address owner => mapping(address operator => bool)) private _operatorApprovals;


    /**
     * @dev 构造函数，设置 name 和 symbol
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }


    /** ------------------------------------------
     *  基础查询函数
     *  ------------------------------------------
     */

    /// 判断是否支持某个接口（ERC165）
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC165, IERC165) returns (bool)
    {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// 查询某地址持有多少 NFT
    function balanceOf(address owner) public view virtual returns (uint256) {
        if (owner == address(0)) revert ERC721InvalidOwner(address(0));
        return _balances[owner];
    }

    /// 查询 tokenId 的持有者
    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        return _requireOwned(tokenId);
    }

    /// NFT 名称
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /// NFT 符号
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /// tokenURI（需要子类实现 _baseURI）
    function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
        _requireOwned(tokenId);
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string.concat(baseURI, tokenId.toString())
            : "";
    }

    /// baseURI 可被子类重写
    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }


    /** ------------------------------------------
     *  授权相关
     *  ------------------------------------------
     */

    /// 授权某地址可操作 tokenId
    function approve(address to, uint256 tokenId) public virtual {
        _approve(to, tokenId, _msgSender());
    }

    /// 查询 tokenId 的授权地址
    function getApproved(uint256 tokenId) public view virtual returns (address) {
        _requireOwned(tokenId);
        return _getApproved(tokenId);
    }

    /// operator 获得 owner 所有 NFT 的操作权
    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// 查询 operator 是否拥有 owner 全部 NFT 的授权
    function isApprovedForAll(address owner, address operator)
        public view virtual returns (bool)
    {
        return _operatorApprovals[owner][operator];
    }


    /** ------------------------------------------
     *  转账函数（对外接口）
     *  ------------------------------------------
     */

    /// 普通转账
    function transferFrom(address from, address to, uint256 tokenId) public virtual {
        if (to == address(0)) revert ERC721InvalidReceiver(address(0));

        // _update 内部检查是否被授权
        address previousOwner = _update(to, tokenId, _msgSender());

        // 确保 from 是真正的 owner
        if (previousOwner != from) {
            revert ERC721IncorrectOwner(from, tokenId, previousOwner);
        }
    }

    /// 安全转账（若接收方是合约必须实现 onERC721Received）
    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public virtual
    {
        transferFrom(from, to, tokenId);
        ERC721Utils.checkOnERC721Received(_msgSender(), from, to, tokenId, data);
    }


    /** ------------------------------------------
     *  核心内部逻辑（Mint / Burn / Transfer）
     *  ------------------------------------------
     */

    /// 读取 owner（不 revert）
    function _ownerOf(uint256 tokenId) internal view virtual returns (address) {
        return _owners[tokenId];
    }

    function _getApproved(uint256 tokenId) internal view virtual returns (address) {
        return _tokenApprovals[tokenId];
    }

    /// 核心授权检查：owner / operator / tokenApproval
    function _isAuthorized(address owner, address spender, uint256 tokenId)
        internal view virtual returns (bool)
    {
        return spender != address(0) &&
            (spender == owner ||
             isApprovedForAll(owner, spender) ||
             _getApproved(tokenId) == spender);
    }

    /// 若无权限，抛出异常
    function _checkAuthorized(address owner, address spender, uint256 tokenId)
        internal view virtual
    {
        if (!_isAuthorized(owner, spender, tokenId)) {
            if (owner == address(0)) revert ERC721NonexistentToken(tokenId);
            revert ERC721InsufficientApproval(spender, tokenId);
        }
    }


    /** ------------------------------------------
     *  Mint / Burn / Transfer 核心更新函数
     *  ------------------------------------------
     */

    /**
     * @dev 更新 NFT 所有者（同时负责 mint / burn / transfer）
     *
     * 参数：
     * - to = 新 owner（0 = burn）
     * - tokenId
     * - auth != 0 时检查权限
     *
     * 返回：操作前的 owner
     */
    function _update(address to, uint256 tokenId, address auth)
        internal virtual returns (address)
    {
        address from = _ownerOf(tokenId);

        // 权限检查（auth=0 时不检查）
        if (auth != address(0)) _checkAuthorized(from, auth, tokenId);

        // 如果 token 已存在，则减少旧 owner 的余额
        if (from != address(0)) {
            _approve(address(0), tokenId, address(0), false); // 清除授权
            _balances[from] -= 1;
        }

        // 新 owner 非零则增加余额
        if (to != address(0)) {
            _balances[to] += 1;
        }

        // 写入新 owner
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        return from;
    }

    /// mint
    function _mint(address to, uint256 tokenId) internal {
        if (to == address(0)) revert ERC721InvalidReceiver(address(0));

        address prev = _update(to, tokenId, address(0));
        if (prev != address(0)) revert ERC721InvalidSender(address(0));
    }

    /// safeMint
    function _safeMint(address to, uint256 tokenId) internal {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(address to, uint256 tokenId, bytes memory data)
        internal virtual
    {
        _mint(to, tokenId);
        ERC721Utils.checkOnERC721Received(_msgSender(), address(0), to, tokenId, data);
    }

    /// burn
    function _burn(uint256 tokenId) internal {
        address prev = _update(address(0), tokenId, address(0));
        if (prev == address(0)) revert ERC721NonexistentToken(tokenId);
    }

    /// 内部转账（无授权检查）
    function _transfer(address from, address to, uint256 tokenId) internal {
        if (to == address(0)) revert ERC721InvalidReceiver(address(0));

        address prev = _update(to, tokenId, address(0));

        if (prev == address(0)) revert ERC721NonexistentToken(tokenId);
        if (prev != from) revert ERC721IncorrectOwner(from, tokenId, prev);
    }


    /** ------------------------------------------
     *  内部授权函数
     *  ------------------------------------------
     */

    /// 授权 tokenId 给 to
    function _approve(address to, uint256 tokenId, address auth) internal {
        _approve(to, tokenId, auth, true);
    }

    function _approve(address to, uint256 tokenId, address auth, bool emitEvent)
        internal virtual
    {
        if (emitEvent || auth != address(0)) {
            address owner = _requireOwned(tokenId);

            if (auth != address(0) &&
                owner != auth &&
                !isApprovedForAll(owner, auth))
            {
                revert ERC721InvalidApprover(auth);
            }

            if (emitEvent) emit Approval(owner, to, tokenId);
        }

        _tokenApprovals[tokenId] = to;
    }

    /// 授权 operator 操作 owner 所有 NFT
    function _setApprovalForAll(address owner, address operator, bool approved)
        internal virtual
    {
        if (operator == address(0)) revert ERC721InvalidOperator(operator);

        _operatorApprovals[owner][operator] = approved;

        emit ApprovalForAll(owner, operator, approved);
    }

    /// tokenId 必须存在，否则 revert
    function _requireOwned(uint256 tokenId) internal view returns (address) {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert ERC721NonexistentToken(tokenId);
        return owner;
    }
}
```

```solidity [ERC721URIStorage 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0)

pragma solidity ^0.8.24;

import {ERC721} from "../ERC721.sol";
import {IERC721Metadata} from "./IERC721Metadata.sol";
import {IERC4906} from "../../../interfaces/IERC4906.sol";
import {IERC165} from "../../../interfaces/IERC165.sol";

/**
 * @dev 扩展版 ERC721，支持对每个 token 储存独立的 tokenURI。
 * 适用于每个 NFT 有不同 metadata 的场景。
 */
abstract contract ERC721URIStorage is IERC4906, ERC721 {

    // ERC-4906 的接口 ID（仅事件，无函数）
    bytes4 private constant ERC4906_INTERFACE_ID = bytes4(0x49064906);

    // tokenId => tokenURI 映射表
    mapping(uint256 tokenId => string) private _tokenURIs;

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        // 支持 ERC4906 + 父类支持的接口
        return interfaceId == ERC4906_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IERC721Metadata
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        // 确保 token 已存在
        _requireOwned(tokenId);

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // baseURI 未设置 => 直接返回 tokenURI
        if (bytes(base).length == 0) {
            return _tokenURI;
        }

        // baseURI 和 tokenURI 都有 => baseURI + tokenURI
        if (bytes(_tokenURI).length > 0) {
            return string.concat(base, _tokenURI);
        }

        // 否则使用 ERC721 默认的 tokenURI（一般是 baseURI + tokenId）
        return super.tokenURI(tokenId);
    }

    /**
     * @dev 内部方法：设置 tokenId 对应的 tokenURI。
     *
     * 会触发 ERC-4906 的 MetadataUpdate 事件，用于通知前端 metadata 已更新。
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        _tokenURIs[tokenId] = _tokenURI;

        // ERC-4906 标准事件，提醒前端刷新 metadata
        emit MetadataUpdate(tokenId);
    }
}
```

```solidity [ERC721Votes 源码]
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) 

pragma solidity ^0.8.24;

import {ERC721} from "../ERC721.sol";
import {Votes} from "../../../governance/utils/Votes.sol";

/**
 * @dev 这是 ERC721 的扩展，让 NFT 支持投票能力（基于 Votes 模块）。
 *
 * 每一个 NFT = 1 票（投票单位）。
 *
 * 注意：NFT 拥有者 **默认没有票权**，必须先执行 delegate（授权）给某人。
 * 原因：Votes 要记录 voting checkpoints，每次修改权益都会有 gas 成本。
 *
 * 用户可以：
 * - delegate 给别人（让代表帮你投票）
 * - delegate 给自己（自投）
 */
abstract contract ERC721Votes is ERC721, Votes {
    /**
     * @dev 重写 ERC721 的 _update，用于在转账过程中同步投票数。
     *
     * 每次 NFT 发生转移时：
     * - 给接收者增加 1 个投票单位
     * - 从发送者减少 1 个投票单位
     *
     * 同时触发 {IVotes-DelegateVotesChanged} 事件。
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address)
    {
        // 执行真正的 ERC721 逻辑（完成 NFT 交换）
        address previousOwner = super._update(to, tokenId, auth);

        // 同步投票单位（1 个 NFT = 1 voting unit）
        _transferVotingUnits(previousOwner, to, 1);

        return previousOwner;
    }

    /**
     * @dev 返回用户拥有的投票单位数量。
     *
     * 对于 NFT，就是 balanceOf(account)（拥有几个 NFT = 有几个投票单位）
     *
     * ⚠ 注意：不要重写此函数，否则会破坏投票系统。
     */
    function _getVotingUnits(address account)
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return balanceOf(account);
    }

    /**
     * @dev 重写 ERC721 的 _increaseBalance，主要用于批量 mint。
     *
     * 每次 mint 某个用户 amount 个 NFT（可能是批量 mint），
     * 就需要更新对应的投票单位。
     */
    function _increaseBalance(address account, uint128 amount)
        internal
        virtual
        override
    {
        super._increaseBalance(account, amount);

        // mint 的时候，把投票单位从 address(0) 转移给用户
        _transferVotingUnits(address(0), account, amount);
    }
}
```
:::

`ERC721URIStorage` 是对 `ERC721` 的扩展，实现可变的 Token URI 存储。

允许你给每个 token 设置独立的 URI，并且可以随时修改。

默认 `ERC721` 不存储 tokenURI，只使用 `baseURI + tokenId` 的方式生成。这是最简单、最高效、最轻量的 ERC721 设计。

> [!IMPORTANT] 为什么很多 NFT 需要 ERC721URIStorage？
> 允许你给每个 token 设置独立的 URI，并且可以随时修改。，如 `tokenURI(1) = ipfs://xxxA，tokenURI(2) = ipfs://xxxB`

## ERC1155

ERC1155 是一种 多代币标准，允许一个合约同时发行：
- 多个 同质化 代币（像 ERC20）
- 多个 非同质化 代币（像 ERC721）
- 半同质化代币（游戏道具类）

> 可以把 ERC1155 理解为：一个合约里存储多个 tokenId 类型，每个 tokenId 可以有自己的数量（像 ERC20）或只铸造 1 个（像 NFT）。

:::code-group
```solidity [继承 ERC1155]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MyERC1155Token is ERC1155 {
    // 构造函数：设置全局 URI 模板
    constructor() ERC1155("https://mytoken.com/metadata/{id}.json") {}

    // 简单 mint 函数：给指定地址 mint 指定数量的某个 tokenId
    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    // 简单批量 mint 函数
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
        _mintBatch(to, ids, amounts, "");
    }
}
```

```solidity [ERC1155 源码]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1155} from "./IERC1155.sol";
import {IERC1155MetadataURI} from "./extensions/IERC1155MetadataURI.sol";
import {ERC1155Utils} from "./utils/ERC1155Utils.sol";
import {Context} from "../../utils/Context.sol";
import {IERC165, ERC165} from "../../utils/introspection/ERC165.sol";
import {Arrays} from "../../utils/Arrays.sol";
import {IERC1155Errors} from "../../interfaces/draft-IERC6093.sol";

/**
 * @dev ERC1155 多代币标准实现。
 * 特点：
 * - 一个合约管理多个 Token ID
 * - 每个地址对不同 ID 有独立余额
 * - 支持批量转账、批量 Mint、批量 Burn
 * - 支持 URI 模版替换 {id}
 */
abstract contract ERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI, IERC1155Errors {
    using Arrays for uint256[];
    using Arrays for address[];

    // 记录：每种 tokenId 的每个账户拥有多少数量
    mapping(uint256 id => mapping(address account => uint256)) private _balances;

    // 记录：owner 授权 operator 可管理所有的 token
    mapping(address account => mapping(address operator => bool)) private _operatorApprovals;

    // 所有 Token 共用一个 URI 模版（包含 {id}）
    string private _uri;

    constructor(string memory uri_) {
        _setURI(uri_);
    }

    /// @dev 支持 ERC165、ERC1155、ERC1155MetadataURI
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC1155).interfaceId
            || interfaceId == type(IERC1155MetadataURI).interfaceId
            || super.supportsInterface(interfaceId);
    }

    /**
     * @dev 返回 URI 模版，例如：
     * https://xxx.com/{id}.json
     *
     * 前端需将 "{id}" 替换为实际 tokenId 的十六进制 64 个字符版本
     */
    function uri(uint256 /* id */) public view virtual returns (string memory) {
        return _uri;
    }

    /// @dev 返回某账户持有某 Token ID 的余额
    function balanceOf(address account, uint256 id) public view virtual returns (uint256) {
        return _balances[id][account];
    }

    /**
     * @dev 批量查询多个账户多个 tokenId 的余额
     * - accounts 和 ids 长度必须一致
     */
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        public
        view
        virtual
        returns (uint256[] memory)
    {
        if (accounts.length != ids.length) {
            revert ERC1155InvalidArrayLength(ids.length, accounts.length);
        }

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    /// @dev 设置 operator 是否可管理当前用户的所有 Token
    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @dev 查询某 operator 是否已被授权管理某 account 的所有 Token
    function isApprovedForAll(address account, address operator)
        public
        view
        virtual
        returns (bool)
    {
        return _operatorApprovals[account][operator];
    }

    /**
     * @dev 单 tokenId 安全转账
     * - 需要 from == msg.sender 或被授权
     * - 内部调用 _safeTransferFrom
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data)
        public
        virtual
    {
        address sender = _msgSender();
        if (from != sender && !isApprovedForAll(from, sender)) {
            revert ERC1155MissingApprovalForAll(sender, from);
        }
        _safeTransferFrom(from, to, id, value, data);
    }

    /**
     * @dev 批量安全转账
     */
    function safeBatchTransferFrom(
        address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data
    ) public virtual {
        address sender = _msgSender();
        if (from != sender && !isApprovedForAll(from, sender)) {
            revert ERC1155MissingApprovalForAll(sender, from);
        }
        _safeBatchTransferFrom(from, to, ids, values, data);
    }

    /**
     * @dev 最核心：修改余额（不做接收检查）
     *
     * - 如果 from = 0，则视为 mint
     * - 如果 to = 0，则视为 burn
     * - 如果 id/value 数组长度 >1，则发 batch 事件
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        virtual
    {
        if (ids.length != values.length) {
            revert ERC1155InvalidArrayLength(ids.length, values.length);
        }

        address operator = _msgSender();

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 value = values[i];

            // 扣减 from 的余额
            if (from != address(0)) {
                uint256 fromBalance = _balances[id][from];
                if (fromBalance < value) {
                    revert ERC1155InsufficientBalance(from, fromBalance, value, id);
                }
                unchecked {
                    _balances[id][from] = fromBalance - value;
                }
            }

            // 增加 to 的余额
            if (to != address(0)) {
                _balances[id][to] += value;
            }
        }

        // 事件：单个 or 批量
        if (ids.length == 1) {
            emit TransferSingle(operator, from, to, ids[0], values[0]);
        } else {
            emit TransferBatch(operator, from, to, ids, values);
        }
    }

    /**
     * @dev 带 ERC1155 接收合约检查版本
     */
    function _updateWithAcceptanceCheck(
        address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data
    ) internal virtual {
        _update(from, to, ids, values);
        if (to != address(0)) {
            address operator = _msgSender();

            if (ids.length == 1) {
                ERC1155Utils.checkOnERC1155Received(
                    operator, from, to, ids[0], values[0], data
                );
            } else {
                ERC1155Utils.checkOnERC1155BatchReceived(
                    operator, from, to, ids, values, data
                );
            }
        }
    }

    /**
     * @dev 单个安全转账
     */
    function _safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data)
        internal
    {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        if (from == address(0)) revert ERC1155InvalidSender(address(0));

        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(from, to, ids, values, data);
    }

    /**
     * @dev 批量安全转账
     */
    function _safeBatchTransferFrom(
        address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data
    ) internal {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        if (from == address(0)) revert ERC1155InvalidSender(address(0));

        _updateWithAcceptanceCheck(from, to, ids, values, data);
    }

    /// @dev 设置全局 URI 模版（包含 {id}）
    function _setURI(string memory newuri) internal virtual {
        _uri = newuri;
    }

    /// @dev Mint 单种 Token
    function _mint(address to, uint256 id, uint256 value, bytes memory data) internal {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(address(0), to, ids, values, data);
    }

    /// @dev 批量 mint
    function _mintBatch(address to, uint256[] memory ids, uint256[] memory values, bytes memory data)
        internal
    {
        if (to == address(0)) revert ERC1155InvalidReceiver(address(0));
        _updateWithAcceptanceCheck(address(0), to, ids, values, data);
    }

    /// @dev burn 单种 Token
    function _burn(address from, uint256 id, uint256 value) internal {
        if (from == address(0)) revert ERC1155InvalidSender(address(0));
        (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
        _updateWithAcceptanceCheck(from, address(0), ids, values, "");
    }

    /// @dev 批量 burn
    function _burnBatch(address from, uint256[] memory ids, uint256[] memory values) internal {
        if (from == address(0)) revert ERC1155InvalidSender(address(0));
        _updateWithAcceptanceCheck(from, address(0), ids, values, "");
    }

    /// @dev 设置 operator 为 owner 的全局授权者
    function _setApprovalForAll(address owner, address operator, bool approved) internal virtual {
        if (operator == address(0)) revert ERC1155InvalidOperator(address(0));
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    /**
     * @dev 工具函数：把两个数字包装成两个长度为 1 的数组
     * 用于 mint/transfer/burn 时复用批量逻辑
     */
    function _asSingletonArrays(uint256 element1, uint256 element2)
        private
        pure
        returns (uint256[] memory array1, uint256[] memory array2)
    {
        assembly {
            array1 := mload(0x40)
            mstore(array1, 1)
            mstore(add(array1, 0x20), element1)

            array2 := add(array1, 0x40)
            mstore(array2, 1)
            mstore(add(array2, 0x20), element2)

            mstore(0x40, add(array2, 0x40))
        }
    }
}
```
:::
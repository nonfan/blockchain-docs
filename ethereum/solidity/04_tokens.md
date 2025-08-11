# 代币标准与常见合约

## ERC20

ERC20 是以太坊上最常见的代币标准，它定义了一套统一的接口，使钱包、交易所和其他应用能够与代币合约进行交互。主要功能包括：

- 代币转账 `transfer`
- 授权转账 `approve` 和 `transferFrom`
- 查询余额 `balanceOf`
- 查询总供应量 `totalSupply`

:::code-group

```solidity [ERC20 示例]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleERC20 {
    // 代币基础信息
    string public name = "Simple Token"; // 名称
    string public symbol = "STK";        // 符号
    uint8 public decimals = 18;          // 小数位
    uint256 public totalSupply;          // 总发行量（按最小单位）

    mapping(address => uint256) public balanceOf; // 余额映射
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _totalSupply) {
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool)  {
        require(balanceOf[msg.sender] >= amount, "Not enough balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Not enough balance");
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
```

```solidity [使用 OpenZeppelin 的 ERC20]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleERC20 is ERC20, Ownable {
    constructor(uint256 _totalSupply) ERC20("Simple Token", "STK") {
        _mint(msg.sender, _totalSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

:::

**`transfer` 和 `transferFrom` 对比:**

| 方法             | 谁发起的？      | 谁的钱？     | 是否需要授权 | 常用场景      |
|----------------|------------|----------|--------|-----------|
| `transfer`     | 自己         | 自己的钱     | 否      | 普通转账      |
| `transferFrom` | 第三方（合约/用户） | 别人授权给你的钱 | 是      | 交易所、市场、代扣 |

**实现可铸造与可销毁的 ERC20 合约：**

- **可铸造（Mintable）**：合约允许授权地址创建（铸造）新的代币，增加 `totalSupply` 并分配到某个账户。常用于发行阶段、奖励、空投流程。
- **可销毁（Burnable）**：持币者可以销毁自己（或被授权人）的代币，减少 `totalSupply`。常用于回收、销毁机制或通缩设计。

:::code-group

```solidity [可铸造]
    // 铸造：任何人都可以在此示例里铸造（仅学习）
    function mint(address to, uint256 amount) public {
        require(to != address(0), "Invalid address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }


```

```solidity [可销毁]
    // 销毁：销毁自己的代币
    function burn(uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }
```

```solidity [使用 OpenZeppelin]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*
- ERC20Burnable 提供 burn 和 burnFrom（被授权销毁）的方法。
- Ownable 限制 mint 只能由合约 owner 调用。
*/
contract SimpleToken is ERC20, ERC20Burnable, Ownable {
    constructor(uint256 _totalSupply) ERC20("Simple Token", "STK") {
        _mint(msg.sender, _totalSupply);
    }

    // 只有 owner 可以铸造
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

```

:::

## ERC721

ERC721 是一种以太坊区块链上的非同质化代币（NFT, Non-Fungible Token）的标准。 与 ERC20（同质化代币）不同，ERC721
的每个代币都有唯一的标识（tokenId），不能相互替代。适合数字艺术品、收藏品、游戏道具等。

**ERC721 标准通过智能合约实现了一系列功能，主要包括代币的创建、转移、查询等。以下是核心接口的介绍：**

- `balanceOf(address owner)`: 拥有者账户余额（NFT数量）
- `ownerOf(uint256 tokenId)`: 获取 NFT 拥有者
- `safeTransferFrom(from, to, tokenId)`: 安全转移 NFT（会检测接收者合约是否支持NFT）
- `transferFrom(from, to, tokenId)`: 直接转移 NFT
- `approve(to, tokenId)`: 授权别人操作你的NFT
- `setApprovalForAll(operator, approved)`: 授权别人操作你的所有NFT
- `getApproved(tokenId)`: 查看NFT被授权给谁
- `isApprovedForAll(owner, operator)`: 查看是否授权操作所有NFT

**ERC721 标准还定义了一些事件，用于通知代币的转移和授权状态变化：**

- `Transfer(address from, address to, uint256 tokenId)`： 当代币从一个地址转移到另一个地址时触发。
- `Approval(address owner, address approved, uint256 tokenId)`： 当某个代币被授权给某个地址时触发。
- `ApprovalForAll(address owner, address operator, bool approved)`： 当某个地址被授权或取消授权管理所有代币时触发。

:::code-group

```solidity [ERC721示例]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
    external returns (bytes4);
}

contract SimpleERC721 {
    // 存储
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    // 基础信息
    string public name = "Simple NFT";
    string public symbol = "SFT";
    uint256 public nextTokenId;

    // 事件
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ======== ERC721 基础查询 ========
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Invalid address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    // ======== 授权逻辑 ========
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(to != owner, "Cannot approve owner");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "Not authorized");
        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // ======== 转账逻辑 ========
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        require(ownerOf(tokenId) == from, "Not owner");
        require(to != address(0), "Invalid recipient");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Receiver not implemented");
    }

    // ======== 铸造逻辑 ========
    function mint(string memory tokenURI_) public {
        require(msg.sender != address(0), "Invalid recipient");
        uint256 tokenId = nextTokenId;
        require(!_exists(tokenId), "Token exists");

        _balances[msg.sender] += 1;
        _owners[tokenId] = msg.sender;
        _tokenURIs[tokenId] = tokenURI_;
        nextTokenId++;

        emit Transfer(address(0), msg.sender, tokenId);
    }

    // ======== 内部方法 ========
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _approve(address to, uint256 tokenId) internal {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        _approve(address(0), tokenId);
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
    private returns (bool)
    {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch {
                return false;
            }
        }
        return true;
    }

    // ======== ERC165 接口检测 ========
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return (interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f);  // ERC721Metadata
    }
}
```

```solidity [使用 OpenZeppelin 的 ERC721]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleERC721 is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("Simple NFT", "SFT") {}

    function mint(address to, string memory tokenURI_) public onlyOwner {
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);       // 安全铸造（检查接收方）
        _setTokenURI(tokenId, tokenURI_); // 设置元数据
        nextTokenId++;
    }
}
```

```solidity [Soulbound Token(SBT，灵魂绑定代币)]
    // 继承 ERC721 保持标准接口，重写 _transfer 方法，阻止转账：
    function _transfer(
        address from,
        address to,
        uint256 tokenId) internal pure override {
        revert("This NFT is Soulbound and cannot be transferred");
    }
```

:::

:::code-group

```ts [前端Mint NFT]
// 1. 上传图片
const imageCid = await nftStorageClient.uploadFile(file);
// imageCid = 'bafkreib5...'

// 2. 构造metadata
const metadata = {
  name: "My NFT #1",
  description: "This is my first NFT",
  image: `ipfs://${imageCid}`,
};

// 3. 上传metadata JSON
const metadataBlob = new Blob([JSON.stringify(metadata)], {type: 'application/json'});
const metadataCid = await nftStorageClient.uploadFile(metadataBlob);

// 4. 铸造NFT，传入metadata的CID
await contract.mint(`ipfs://${metadataCid}`);
```

:::

## ERC1155

ERC1155 是一种多代币标准，由 Enjin 团队提出。它创新点在于：

- 同一合约内可以管理多种代币，支持同时拥有同质化代币（类似 ERC20）和非同质化代币（类似 ERC721）。
- 支持 批量转移，一次调用能转移多种代币和多种数量，极大节省链上交易成本和 Gas。
- 适用于游戏道具、收藏品、装备等多样化资产管理。

## 常见业务逻辑合约

区块链智能合约不仅限于代币发行，还可以实现各种业务逻辑，下面介绍三种常见场景：

### 简单众筹合约

> 用户可以向合约捐款（以太币），达到目标金额后，合约创建者可提取资金，否则支持者可退款。

**核心要点：**

- 记录每个支持者的金额
- 设定众筹目标和截止时间
- 允许目标未达时退款，目标达时合约拥有者提取资金

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 简单众筹合约示例
contract SimpleCrowdfunding {
    address public owner;         // 合约拥有者（发起人）
    uint public goal;             // 众筹目标金额（单位：wei）
    uint public deadline;         // 众筹截止时间（时间戳）
    mapping(address => uint) public contributions;  // 记录每个支持者的贡献金额
    bool public goalReached;      // 记录目标是否达成

    /// @notice 构造函数，初始化众筹目标和持续时间
    /// @param _goal 众筹目标金额（wei）
    /// @param _durationSeconds 众筹持续秒数
    constructor(uint _goal, uint _durationSeconds) {
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + _durationSeconds;
    }

    /// @notice 支持众筹，向合约发送以太币
    function contribute() external payable {
        require(block.timestamp < deadline, "Crowdfunding ended"); // 截止后不可支持
        contributions[msg.sender] += msg.value;                     // 增加支持者的贡献金额
    }

    /// @notice 众筹目标达成后，合约拥有者提取所有资金
    function withdraw() external {
        require(msg.sender == owner, "Not owner");                  // 只有合约拥有者可调用
        require(block.timestamp >= deadline, "Still ongoing");      // 只有众筹结束后可提取
        require(address(this).balance >= goal, "Goal not reached"); // 只有达成目标才能提取

        goalReached = true;
        payable(owner).transfer(address(this).balance);             // 转账给拥有者
    }

    /// @notice 众筹未达成，支持者可退款
    function refund() external {
        require(block.timestamp >= deadline, "Still ongoing");      // 只有众筹结束后可退款
        require(address(this).balance < goal, "Goal reached");      // 只有未达成目标才可退款

        uint amount = contributions[msg.sender];
        require(amount > 0, "No contribution");                     // 必须有贡献才可退款

        contributions[msg.sender] = 0;                               // 防止重入攻击，先置零
        payable(msg.sender).transfer(amount);                        // 退款给支持者
    }
}
```

### 简单投票合约

> 参与者给候选人投票，最后统计票数。

**核心要点：**

- 记录候选人列表和票数
- 限制每个地址只能投一次
- 投票结束后可查询结果

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 简单投票合约示例
contract SimpleVoting {
    address public owner;                       // 合约拥有者
    string[] public candidates;                 // 候选人名单
    mapping(string => uint) public votes;       // 每个候选人的票数
    mapping(address => bool) public hasVoted;   // 记录每个地址是否已投票
    mapping(string => bool) public isCandidate; // 判断候选人是否合法

    /// @notice 构造函数，初始化候选人列表
    /// @param _candidates 候选人数组
    constructor(string[] memory _candidates) {
        owner = msg.sender;
        candidates = _candidates;

        for (uint i = 0; i < _candidates.length; i++) {
            isCandidate[_candidates[i]] = true;
        }
    }

    /// @notice 给指定候选人投票
    /// @param candidate 要投票的候选人名字
    function vote(string memory candidate) external {
        require(!hasVoted[msg.sender], "Already voted");
        require(isCandidate[candidate], "Invalid candidate");

        votes[candidate] += 1;
        hasVoted[msg.sender] = true;
    }

    /// @notice 查询候选人的票数
    /// @param candidate 候选人名字
    /// @return 票数
    function getVotes(string memory candidate) external view returns (uint) {
        return votes[candidate];
    }
}
```

### 时间锁合约

> 合约中的资金只能在指定时间之后才可被提取，常用于治理延迟执行。

**核心要点：**

- 设定锁定期结束时间
- 只能锁定期后提取资金
- 管理权限和安全性设计

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 简单时间锁合约示例
contract SimpleTimelock {
    address public owner;           // 合约拥有者
    uint public releaseTime;        // 资金释放时间戳

    /// @notice 构造函数，初始化释放时间，合约部署时可以发送资金
    /// @param _releaseTime 资金释放的时间戳，必须晚于当前时间
    constructor(uint _releaseTime) payable {
        require(_releaseTime > block.timestamp, "Release time must be in future");
        owner = msg.sender;
        releaseTime = _releaseTime;
    }

    /// @notice 只有合约拥有者在释放时间后才能提取资金
    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        require(block.timestamp >= releaseTime, "Locked");

        payable(owner).transfer(address(this).balance);
    }

    /// @notice 允许合约接收以太币
    receive() external payable {}
}

```

## 可升级合约

区块链合约一旦部署不可修改，为了支持未来升级，通常采用**代理合约(Proxy)** 模式，把逻辑代码和存储分离：

- **逻辑合约(Implementation / Logic Contract)**：存放业务代码，实现功能。
- **代理合约(Proxy Contract)** ：代理所有调用，负责存储，转发调用给逻辑合约。

### UUPS

> UUPS (Universal Upgradeable Proxy Standard) 逻辑合约本身包含升级函数、代理合约更轻量，只负责委托调用、逻辑合约控制升级权限和升级流程

:::code-group

```solidity [使用 OpenZeppelin UUPS 模式]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyUpgradeableContract is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    // 初始化函数，代替构造函数
    function initialize(uint256 _value) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        value = _value;
    }

    // 业务函数示例
    function setValue(uint256 _value) public onlyOwner {
        value = _value;
    }

    // 实现 _authorizeUpgrade 方法，限制升级权限
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

```

:::

### Transparent Proxy

> Transparent Proxy（透明代理） 由 OpenZeppelin 最初提出，最常用升级代理模式

代理合约区分调用者身份例如：

- 管理员调用时，执行升级逻辑
- 普通用户调用时，转发逻辑合约

管理员与普通调用分开，避免升级调用冲突

:::code-group

```solidity [Implementation 合约（逻辑合约）]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LogicV1 is Ownable {
    uint256 public value;

    function setValue(uint256 newValue) external onlyOwner {
        value = newValue;
    }
}
```

```solidity [ProxyAdmin 合约]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
```

```solidity [TransparentUpgradeableProxy 合约]
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
```

:::

Transparent Proxy 并没有过时，它依然是业界非常广泛使用且稳定的升级代理模式。

但是，UUPS 模式近年来更受推崇，原因是：

- 代理合约更轻量，部署成本更低
- 逻辑合约直接控制升级逻辑，更灵活
- OpenZeppelin 目前推荐 UUPS 作为主要升级方案

| 方案                | 状态     | 说明                 |
|-------------------|--------|--------------------|
| Transparent Proxy | 依然广泛使用 | 经典方案，成熟稳定，管理权限清晰   |
| UUPS Proxy        | 越来越流行  | 更现代、更轻量，推荐使用，代码更简洁 |


# 安全最佳实践

## 常见漏洞

### 重入攻击

```solidity
// ❌ 危险
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool success,) = msg.sender.call{value: amount}("");
    balances[msg.sender] = 0; // 状态更新在外部调用之后
}

// ✅ 安全
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Secure is ReentrancyGuard {
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0; // 先更新状态
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

### 闪电贷回调验证

```solidity
// ❌ 危险 - 任何人都可以调用
function executeOperation(...) external returns (bool) {
    // 没有验证
}

// ✅ 安全
function executeOperation(
    address asset,
    uint256 amount,
    uint256 premium,
    address initiator,
    bytes calldata params
) external override returns (bool) {
    require(msg.sender == address(POOL), "Invalid caller");
    require(initiator == address(this), "Invalid initiator");
    // ...
}
```

### 未检查返回值

```solidity
// ❌ 危险
IERC20(token).transfer(to, amount);

// ✅ 安全 - 方式 1
bool success = IERC20(token).transfer(to, amount);
require(success, "Transfer failed");

// ✅ 安全 - 方式 2 (推荐)
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

IERC20(token).safeTransfer(to, amount);
```

## 健康因子监控

```solidity
contract HealthMonitor {
    IPool public immutable POOL;
    
    uint256 constant SAFE = 2e18;      // 2.0
    uint256 constant WARNING = 1.5e18; // 1.5
    uint256 constant DANGER = 1.1e18;  // 1.1
    
    event Alert(address indexed user, uint256 healthFactor, string level);
    
    function check(address user) external view returns (string memory status) {
        (, , , , , uint256 hf) = POOL.getUserAccountData(user);
        
        if (hf >= SAFE) return "SAFE";
        if (hf >= WARNING) return "WARNING";
        if (hf >= DANGER) return "DANGER";
        if (hf >= 1e18) return "CRITICAL";
        return "LIQUIDATABLE";
    }
    
    function monitor(address[] calldata users) external {
        for (uint i = 0; i < users.length; i++) {
            (, , , , , uint256 hf) = POOL.getUserAccountData(users[i]);
            if (hf < WARNING) {
                emit Alert(users[i], hf, hf < 1e18 ? "LIQUIDATABLE" : "WARNING");
            }
        }
    }
}
```

## 自动保护

```solidity
contract AutoProtection {
    IPool public immutable POOL;
    
    struct Config {
        uint256 triggerHF;  // 触发健康因子
        uint256 targetHF;   // 目标健康因子
        address repayAsset;
        bool active;
    }
    
    mapping(address => Config) public configs;
    
    function setup(uint256 triggerHF, uint256 targetHF, address repayAsset) external {
        require(triggerHF < targetHF, "Invalid thresholds");
        require(triggerHF >= 1e18, "Trigger too low");
        
        configs[msg.sender] = Config({
            triggerHF: triggerHF,
            targetHF: targetHF,
            repayAsset: repayAsset,
            active: true
        });
    }
    
    function execute(address user) external {
        Config memory cfg = configs[user];
        require(cfg.active, "Not active");
        
        (, , , , , uint256 hf) = POOL.getUserAccountData(user);
        require(hf < cfg.triggerHF, "Not triggered");
        
        uint256 repayAmount = _calculateRepayAmount(user, cfg);
        
        IERC20(cfg.repayAsset).transferFrom(user, address(this), repayAmount);
        IERC20(cfg.repayAsset).approve(address(POOL), repayAmount);
        POOL.repay(cfg.repayAsset, repayAmount, 2, user);
        
        (, , , , , uint256 newHF) = POOL.getUserAccountData(user);
        require(newHF >= cfg.targetHF, "Target not reached");
    }
}
```

## 访问控制

### 角色管理

```solidity
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract SecureManager is AccessControl {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant OPERATOR = keccak256("OPERATOR");
    
    uint256 public maxSingleOp = 1_000_000e6;  // 100万
    uint256 public dailyLimit = 10_000_000e6; // 1000万
    uint256 public dailyUsed;
    uint256 public lastReset;
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN, msg.sender);
        lastReset = block.timestamp;
    }
    
    modifier withinLimits(uint256 amount) {
        require(amount <= maxSingleOp, "Exceeds single limit");
        
        if (block.timestamp >= lastReset + 1 days) {
            dailyUsed = 0;
            lastReset = block.timestamp;
        }
        
        require(dailyUsed + amount <= dailyLimit, "Exceeds daily limit");
        dailyUsed += amount;
        _;
    }
    
    function supply(address asset, uint256 amount) 
        external 
        onlyRole(OPERATOR) 
        withinLimits(amount) 
    {
        // ...
    }
    
    function setLimits(uint256 single, uint256 daily) external onlyRole(ADMIN) {
        maxSingleOp = single;
        dailyLimit = daily;
    }
}
```

### 时间锁

```solidity
contract TimelockManager {
    uint256 public constant DELAY = 24 hours;
    
    struct PendingOp {
        bytes32 hash;
        uint256 executeTime;
        bool executed;
    }
    
    mapping(bytes32 => PendingOp) public pending;
    
    event Scheduled(bytes32 indexed id, uint256 executeTime);
    event Executed(bytes32 indexed id);
    
    function schedule(address asset, uint256 amount, address to) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(asset, amount, to, block.timestamp));
        
        pending[id] = PendingOp({
            hash: id,
            executeTime: block.timestamp + DELAY,
            executed: false
        });
        
        emit Scheduled(id, block.timestamp + DELAY);
        return id;
    }
    
    function execute(bytes32 id, address asset, uint256 amount, address to) external {
        PendingOp storage op = pending[id];
        
        require(!op.executed, "Already executed");
        require(block.timestamp >= op.executeTime, "Too early");
        
        op.executed = true;
        POOL.withdraw(asset, amount, to);
        
        emit Executed(id);
    }
}
```

## 紧急处理

### 暂停机制

```solidity
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

contract EmergencyManager is Pausable, AccessControl {
    bytes32 public constant GUARDIAN = keccak256("GUARDIAN");
    
    function pause() external onlyRole(GUARDIAN) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function supply(address asset, uint256 amount) external whenNotPaused {
        // ...
    }
    
    // 紧急提取 - 即使暂停也可执行
    function emergencyWithdraw(address asset) external {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        if (balance > 0) {
            IERC20(asset).safeTransfer(msg.sender, balance);
        }
    }
}
```

## 价格保护

```solidity
contract PriceProtection {
    IAaveOracle public immutable aaveOracle;
    AggregatorV3Interface public immutable chainlink;
    
    uint256 public constant MAX_DEVIATION = 500; // 5%
    
    function validatePrice(address asset) internal view {
        uint256 aavePrice = aaveOracle.getAssetPrice(asset);
        
        (, int256 clPrice, , ,) = chainlink.latestRoundData();
        require(clPrice > 0, "Invalid Chainlink price");
        
        uint256 deviation = _calcDeviation(aavePrice, uint256(clPrice));
        require(deviation <= MAX_DEVIATION, "Price deviation too high");
    }
    
    function _calcDeviation(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 diff = a > b ? a - b : b - a;
        return (diff * 10000) / ((a + b) / 2);
    }
}
```

## 审计清单

### 部署前

- [ ] 所有外部调用有重入保护
- [ ] 闪电贷回调验证调用者和发起者
- [ ] 使用 SafeERC20
- [ ] 实现访问控制
- [ ] 有紧急暂停机制
- [ ] 关键操作有时间锁
- [ ] 测试覆盖率 > 90%
- [ ] 至少一家审计公司审计

### 运行时

- [ ] 健康因子实时监控
- [ ] 大额交易告警
- [ ] 价格偏差监控
- [ ] 异常行为检测

## 错误码参考

| 代码 | 含义 |
|:---:|:---|
| 1 | CALLER_NOT_POOL_ADMIN |
| 28 | RESERVE_FROZEN |
| 29 | RESERVE_PAUSED |
| 30 | BORROWING_NOT_ENABLED |
| 35 | HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD |
| 36 | COLLATERAL_CANNOT_COVER_NEW_BORROW |

完整错误码参考 [Aave 文档](https://docs.aave.com/developers/guides/troubleshooting-errors)

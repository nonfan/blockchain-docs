# 开发指南

## 环境准备

### 安装依赖

```bash
# npm
npm install @aave/v4-core @aave/v4-periphery

# yarn
yarn add @aave/v4-core @aave/v4-periphery

# Foundry
forge install aave/aave-v4-core
```

### 配置文件

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  }
};
```

## 核心接口

### Pool 接口

```solidity
interface IPoolV4 {
    // 供应资产
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    
    // 提取资产
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    
    // 借贷资产
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
    
    // 偿还借款
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256);
    
    // 批量操作
    function executeBatch(
        BatchOperation[] calldata operations
    ) external;
    
    // 获取用户账户数据
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}
```

### 流动性层接口

```solidity
interface ILiquidityLayer {
    struct LiquidityAllocation {
        address market;
        uint256 allocation;
    }
    
    // 获取资产的流动性分配
    function getLiquidityAllocation(address asset) 
        external view returns (LiquidityAllocation[] memory);
    
    // 优化流动性分配
    function optimizeLiquidity(address asset) external;
    
    // 获取总可用流动性
    function getTotalAvailableLiquidity(address asset) 
        external view returns (uint256);
}
```

### 自动化模块接口

```solidity
interface IAutomationModule {
    enum TriggerType {
        HEALTH_FACTOR,
        PRICE,
        TIME,
        UTILIZATION
    }
    
    enum ActionType {
        REPAY,
        WITHDRAW,
        SUPPLY,
        SWAP_COLLATERAL
    }
    
    struct AutomationRule {
        TriggerType triggerType;
        uint256 triggerValue;
        ActionType actionType;
        address actionAsset;
        uint256 actionAmount;
        bool isActive;
    }
    
    function createRule(AutomationRule calldata rule) 
        external returns (uint256 ruleId);
    
    function executeRule(uint256 ruleId) external;
    
    function cancelRule(uint256 ruleId) external;
    
    function getUserRules(address user) 
        external view returns (uint256[] memory);
}
```

## 基础集成

### 供应和借贷

```solidity
pragma solidity ^0.8.20;

import {IPoolV4} from "@aave/v4-core/contracts/interfaces/IPoolV4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AaveV4Integration {
    IPoolV4 public immutable POOL;
    
    constructor(address pool) {
        POOL = IPoolV4(pool);
    }
    
    function supply(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(address(POOL), amount);
        POOL.supply(asset, amount, msg.sender, 0);
    }
    
    function borrow(address asset, uint256 amount) external {
        POOL.borrow(asset, amount, 2, 0, msg.sender);
    }
    
    function repay(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(address(POOL), amount);
        POOL.repay(asset, amount, 2, msg.sender);
    }
}
```

### 批量操作

```solidity
pragma solidity ^0.8.20;

import {IPoolV4} from "@aave/v4-core/contracts/interfaces/IPoolV4.sol";

contract BatchOperationsExample {
    IPoolV4 public immutable POOL;
    
    constructor(address pool) {
        POOL = IPoolV4(pool);
    }
    
    /**
     * @notice 一键开仓：供应抵押品并借贷
     */
    function openPosition(
        address collateralAsset,
        uint256 collateralAmount,
        address borrowAsset,
        uint256 borrowAmount
    ) external {
        // 转入抵押品
        IERC20(collateralAsset).transferFrom(
            msg.sender, 
            address(this), 
            collateralAmount
        );
        IERC20(collateralAsset).approve(address(POOL), collateralAmount);
        
        // 构建批量操作
        IPoolV4.BatchOperation[] memory ops = new IPoolV4.BatchOperation[](2);
        
        ops[0] = IPoolV4.BatchOperation({
            operationType: 0, // Supply
            asset: collateralAsset,
            amount: collateralAmount,
            interestRateMode: 0,
            onBehalfOf: msg.sender
        });
        
        ops[1] = IPoolV4.BatchOperation({
            operationType: 2, // Borrow
            asset: borrowAsset,
            amount: borrowAmount,
            interestRateMode: 2, // Variable
            onBehalfOf: msg.sender
        });
        
        // 执行批量操作
        POOL.executeBatch(ops);
        
        // 将借出的资产发送给用户
        IERC20(borrowAsset).transfer(msg.sender, borrowAmount);
    }
    
    /**
     * @notice 一键平仓：偿还借款并提取抵押品
     */
    function closePosition(
        address collateralAsset,
        uint256 collateralAmount,
        address debtAsset,
        uint256 debtAmount
    ) external {
        // 转入债务资产
        IERC20(debtAsset).transferFrom(msg.sender, address(this), debtAmount);
        IERC20(debtAsset).approve(address(POOL), debtAmount);
        
        // 构建批量操作
        IPoolV4.BatchOperation[] memory ops = new IPoolV4.BatchOperation[](2);
        
        ops[0] = IPoolV4.BatchOperation({
            operationType: 3, // Repay
            asset: debtAsset,
            amount: debtAmount,
            interestRateMode: 2,
            onBehalfOf: msg.sender
        });
        
        ops[1] = IPoolV4.BatchOperation({
            operationType: 1, // Withdraw
            asset: collateralAsset,
            amount: collateralAmount,
            interestRateMode: 0,
            onBehalfOf: msg.sender
        });
        
        POOL.executeBatch(ops);
        
        // 将抵押品发送给用户
        IERC20(collateralAsset).transfer(msg.sender, collateralAmount);
    }
}
```

## 自动化集成

### 健康因子保护

```solidity
pragma solidity ^0.8.20;

import {IAutomationModule} from "@aave/v4-core/contracts/interfaces/IAutomationModule.sol";
import {IPoolV4} from "@aave/v4-core/contracts/interfaces/IPoolV4.sol";

contract HealthFactorProtection {
    IAutomationModule public immutable automation;
    IPoolV4 public immutable pool;
    
    constructor(address _automation, address _pool) {
        automation = IAutomationModule(_automation);
        pool = IPoolV4(_pool);
    }
    
    /**
     * @notice 设置健康因子保护
     * @param triggerHF 触发健康因子
     * @param repayAsset 偿还资产
     * @param repayAmount 偿还数量
     */
    function setupProtection(
        uint256 triggerHF,
        address repayAsset,
        uint256 repayAmount
    ) external returns (uint256 ruleId) {
        IAutomationModule.AutomationRule memory rule = IAutomationModule.AutomationRule({
            triggerType: IAutomationModule.TriggerType.HEALTH_FACTOR,
            triggerValue: triggerHF,
            actionType: IAutomationModule.ActionType.REPAY,
            actionAsset: repayAsset,
            actionAmount: repayAmount,
            isActive: true
        });
        
        return automation.createRule(rule);
    }
    
    /**
     * @notice 设置止损
     * @param asset 监控资产
     * @param stopLossPrice 止损价格
     * @param withdrawAmount 提取数量
     */
    function setupStopLoss(
        address asset,
        uint256 stopLossPrice,
        uint256 withdrawAmount
    ) external returns (uint256 ruleId) {
        IAutomationModule.AutomationRule memory rule = IAutomationModule.AutomationRule({
            triggerType: IAutomationModule.TriggerType.PRICE,
            triggerValue: stopLossPrice,
            actionType: IAutomationModule.ActionType.WITHDRAW,
            actionAsset: asset,
            actionAmount: withdrawAmount,
            isActive: true
        });
        
        return automation.createRule(rule);
    }
}
```

### 定期再平衡

```solidity
contract RebalanceAutomation {
    IAutomationModule public immutable automation;
    
    struct RebalanceConfig {
        address[] assets;
        uint256[] targetAllocations; // basis points
        uint256 rebalanceThreshold;  // 触发再平衡的偏差阈值
    }
    
    mapping(address => RebalanceConfig) public userConfigs;
    
    function setupRebalance(
        address[] calldata assets,
        uint256[] calldata allocations,
        uint256 threshold
    ) external {
        require(assets.length == allocations.length, "Length mismatch");
        
        uint256 totalAllocation;
        for (uint i = 0; i < allocations.length; i++) {
            totalAllocation += allocations[i];
        }
        require(totalAllocation == 10000, "Must equal 100%");
        
        userConfigs[msg.sender] = RebalanceConfig({
            assets: assets,
            targetAllocations: allocations,
            rebalanceThreshold: threshold
        });
    }
    
    function executeRebalance(address user) external {
        RebalanceConfig memory config = userConfigs[user];
        
        // 计算当前分配
        uint256[] memory currentAllocations = _calculateCurrentAllocations(
            user, 
            config.assets
        );
        
        // 检查是否需要再平衡
        bool needsRebalance = false;
        for (uint i = 0; i < config.assets.length; i++) {
            uint256 deviation = _abs(
                int256(currentAllocations[i]) - int256(config.targetAllocations[i])
            );
            if (deviation > config.rebalanceThreshold) {
                needsRebalance = true;
                break;
            }
        }
        
        require(needsRebalance, "Rebalance not needed");
        
        // 执行再平衡
        _executeRebalance(user, config, currentAllocations);
    }
    
    function _calculateCurrentAllocations(
        address user,
        address[] memory assets
    ) internal view returns (uint256[] memory) {
        // 实现分配计算逻辑
    }
    
    function _executeRebalance(
        address user,
        RebalanceConfig memory config,
        uint256[] memory currentAllocations
    ) internal {
        // 实现再平衡逻辑
    }
    
    function _abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }
}
```

## 智能账户集成

### ERC-4337 账户

```solidity
pragma solidity ^0.8.20;

import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {BaseAccount} from "@account-abstraction/contracts/core/BaseAccount.sol";

contract AaveSmartAccount is BaseAccount {
    IPoolV4 public immutable aavePool;
    IEntryPoint private immutable _entryPoint;
    address public owner;
    
    constructor(address entryPoint_, address pool_, address owner_) {
        _entryPoint = IEntryPoint(entryPoint_);
        aavePool = IPoolV4(pool_);
        owner = owner_;
    }
    
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        bytes32 hash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );
        
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(userOp.signature);
        address signer = ecrecover(hash, v, r, s);
        
        if (signer != owner) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }
    
    /**
     * @notice 执行 Aave 操作
     */
    function executeAaveOperation(
        uint8 operationType,
        address asset,
        uint256 amount
    ) external {
        require(msg.sender == address(_entryPoint) || msg.sender == owner, "Unauthorized");
        
        if (operationType == 0) {
            // Supply
            IERC20(asset).approve(address(aavePool), amount);
            aavePool.supply(asset, amount, address(this), 0);
        } else if (operationType == 1) {
            // Withdraw
            aavePool.withdraw(asset, amount, address(this));
        } else if (operationType == 2) {
            // Borrow
            aavePool.borrow(asset, amount, 2, 0, address(this));
        } else if (operationType == 3) {
            // Repay
            IERC20(asset).approve(address(aavePool), amount);
            aavePool.repay(asset, amount, 2, address(this));
        }
    }
    
    /**
     * @notice 批量执行 Aave 操作
     */
    function executeBatchAaveOperations(
        IPoolV4.BatchOperation[] calldata operations
    ) external {
        require(msg.sender == address(_entryPoint) || msg.sender == owner, "Unauthorized");
        
        // 批准所有需要的代币
        for (uint i = 0; i < operations.length; i++) {
            if (operations[i].operationType == 0 || operations[i].operationType == 3) {
                IERC20(operations[i].asset).approve(
                    address(aavePool), 
                    operations[i].amount
                );
            }
        }
        
        aavePool.executeBatch(operations);
    }
    
    function _splitSignature(bytes memory sig) internal pure returns (
        bytes32 r, bytes32 s, uint8 v
    ) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
```

## TypeScript SDK

### 基础使用

```typescript
import { AaveV4SDK, BatchOperation } from '@aave/v4-sdk';
import { ethers } from 'ethers';

// 初始化 SDK
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

const aave = new AaveV4SDK({
    provider,
    signer,
    chainId: 1,
});

// 供应资产
async function supply() {
    const tx = await aave.supply({
        asset: 'USDC',
        amount: '1000',
    });
    await tx.wait();
    console.log('Supply successful:', tx.hash);
}

// 批量操作
async function batchOperations() {
    const operations: BatchOperation[] = [
        { type: 'supply', asset: 'USDC', amount: '1000' },
        { type: 'supply', asset: 'WETH', amount: '1' },
        { type: 'borrow', asset: 'DAI', amount: '500' },
    ];
    
    const tx = await aave.executeBatch(operations);
    await tx.wait();
    console.log('Batch successful:', tx.hash);
}

// 创建自动化规则
async function setupAutomation() {
    const ruleId = await aave.automation.createRule({
        triggerType: 'healthFactor',
        triggerValue: 1.2,
        actionType: 'repay',
        actionAsset: 'USDC',
        actionAmount: '500',
    });
    console.log('Rule created:', ruleId);
}

// 获取用户数据
async function getUserData() {
    const userAddress = await signer.getAddress();
    const data = await aave.getUserAccountData(userAddress);
    
    console.log('Total Collateral:', data.totalCollateralBase);
    console.log('Total Debt:', data.totalDebtBase);
    console.log('Health Factor:', data.healthFactor);
}
```

### 高级功能

```typescript
// 监听事件
aave.on('Supply', (reserve, user, amount) => {
    console.log(`${user} supplied ${amount} of ${reserve}`);
});

aave.on('Borrow', (reserve, user, amount) => {
    console.log(`${user} borrowed ${amount} of ${reserve}`);
});

// 获取流动性数据
async function getLiquidityData() {
    const liquidity = await aave.liquidityLayer.getTotalLiquidity('USDC');
    console.log('Total USDC Liquidity:', liquidity);
    
    const allocation = await aave.liquidityLayer.getAllocation('USDC');
    console.log('Liquidity Allocation:', allocation);
}

// 模拟交易
async function simulateTransaction() {
    const simulation = await aave.simulate.supply({
        asset: 'USDC',
        amount: '1000',
    });
    
    console.log('Estimated Gas:', simulation.gasEstimate);
    console.log('New Health Factor:', simulation.newHealthFactor);
}
```

## 测试

### 单元测试

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Aave V4 Integration', () => {
    let pool: any;
    let usdc: any;
    let user: any;
    
    beforeEach(async () => {
        [user] = await ethers.getSigners();
        
        // 部署或连接合约
        pool = await ethers.getContractAt('IPoolV4', POOL_ADDRESS);
        usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS);
    });
    
    it('should supply assets', async () => {
        const amount = ethers.utils.parseUnits('1000', 6);
        
        await usdc.approve(pool.address, amount);
        await pool.supply(usdc.address, amount, user.address, 0);
        
        const accountData = await pool.getUserAccountData(user.address);
        expect(accountData.totalCollateralBase).to.be.gt(0);
    });
    
    it('should execute batch operations', async () => {
        const supplyAmount = ethers.utils.parseUnits('1000', 6);
        
        await usdc.approve(pool.address, supplyAmount);
        
        const operations = [
            {
                operationType: 0,
                asset: usdc.address,
                amount: supplyAmount,
                interestRateMode: 0,
                onBehalfOf: user.address,
            },
        ];
        
        await pool.executeBatch(operations);
        
        const accountData = await pool.getUserAccountData(user.address);
        expect(accountData.totalCollateralBase).to.be.gt(0);
    });
});
```

## 最佳实践

### 批量操作

```solidity
// ❌ 多次单独调用
pool.supply(asset1, amount1, user, 0);
pool.supply(asset2, amount2, user, 0);
pool.borrow(asset3, amount3, 2, 0, user);

// ✅ 使用批量操作
BatchOperation[] memory ops = new BatchOperation[](3);
ops[0] = BatchOperation(0, asset1, amount1, 0, user);
ops[1] = BatchOperation(0, asset2, amount2, 0, user);
ops[2] = BatchOperation(2, asset3, amount3, 2, user);
pool.executeBatch(ops);
```

### 自动化保护

```solidity
// 设置健康因子保护，避免清算
automation.createRule(AutomationRule({
    triggerType: TriggerType.HEALTH_FACTOR,
    triggerValue: 1.2e18,
    actionType: ActionType.REPAY,
    actionAsset: USDC,
    actionAmount: 1000e6,
    isActive: true
}));
```

### 流动性检查

```typescript
// 在执行大额操作前检查流动性
const liquidity = await aave.liquidityLayer.getTotalLiquidity('USDC');
if (liquidity < requiredAmount) {
    console.warn('Insufficient liquidity');
}
```

::: warning 注意事项
- 批量操作中任一步骤失败会导致整体回滚
- 自动化规则需要预先授权足够的代币额度
- 大额操作前务必检查流动性和滑点
:::

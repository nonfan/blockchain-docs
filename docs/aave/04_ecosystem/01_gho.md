# GHO 稳定币

## GHO 概述

GHO 是 Aave 协议原生的去中心化超额抵押稳定币，与美元软锚定。它是 Aave DAO 推出的第一个稳定币，旨在为 DeFi 生态提供一个透明、去中心化的稳定资产。

### 核心特点

| 特性 | 描述 |
|------|------|
| 锚定 | 1 GHO ≈ 1 USD |
| 抵押 | 超额抵押，使用 Aave 存款 |
| 利率 | 由 Aave DAO 治理决定 |
| 铸造 | 通过 Aave 协议铸造 |
| 销毁 | 偿还借款时销毁 |

## 工作机制

### 铸造流程

```
用户存入抵押品 → 获得借贷能力 → 铸造 GHO → 支付借贷利率
      ↓                                         ↓
   aToken                                  利息归 DAO
```

### 与传统借贷的区别

| 方面 | 传统借贷 | GHO 铸造 |
|------|----------|----------|
| 资金来源 | 流动性池 | 直接铸造 |
| 利率模型 | 供需决定 | DAO 治理决定 |
| 利息去向 | 供应者 | Aave DAO |
| 流动性限制 | 受池子限制 | 无上限（受抵押品限制） |

## 智能合约集成

### GHO 代币接口

```solidity
interface IGhoToken is IERC20 {
    // 铸造 GHO（仅限授权的 Facilitator）
    function mint(address account, uint256 amount) external;
    
    // 销毁 GHO
    function burn(uint256 amount) external;
    
    // 获取 Facilitator 信息
    function getFacilitator(address facilitator) 
        external view returns (Facilitator memory);
    
    // 获取 Facilitator 的铸造上限
    function getFacilitatorBucket(address facilitator) 
        external view returns (uint256 capacity, uint256 level);
}

struct Facilitator {
    uint128 bucketCapacity;  // 铸造上限
    uint128 bucketLevel;     // 当前铸造量
    string label;            // 标签
}
```

### 铸造 GHO

```solidity
pragma solidity ^0.8.10;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GhoMinter {
    IPool public immutable POOL;
    address public constant GHO = 0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f;
    
    constructor(address pool) {
        POOL = IPool(pool);
    }
    
    /**
     * @notice 存入抵押品并铸造 GHO
     * @param collateralAsset 抵押品资产
     * @param collateralAmount 抵押品数量
     * @param ghoAmount 要铸造的 GHO 数量
     */
    function depositAndMintGho(
        address collateralAsset,
        uint256 collateralAmount,
        uint256 ghoAmount
    ) external {
        // 1. 转入抵押品
        IERC20(collateralAsset).transferFrom(
            msg.sender, 
            address(this), 
            collateralAmount
        );
        
        // 2. 存入 Aave
        IERC20(collateralAsset).approve(address(POOL), collateralAmount);
        POOL.supply(collateralAsset, collateralAmount, msg.sender, 0);
        
        // 3. 铸造 GHO（借贷 GHO）
        POOL.borrow(GHO, ghoAmount, 2, 0, msg.sender);
    }
    
    /**
     * @notice 偿还 GHO 并提取抵押品
     * @param ghoAmount 要偿还的 GHO 数量
     * @param collateralAsset 要提取的抵押品
     * @param collateralAmount 要提取的数量
     */
    function repayAndWithdraw(
        uint256 ghoAmount,
        address collateralAsset,
        uint256 collateralAmount
    ) external {
        // 1. 转入 GHO
        IERC20(GHO).transferFrom(msg.sender, address(this), ghoAmount);
        
        // 2. 偿还 GHO
        IERC20(GHO).approve(address(POOL), ghoAmount);
        POOL.repay(GHO, ghoAmount, 2, msg.sender);
        
        // 3. 提取抵押品
        POOL.withdraw(collateralAsset, collateralAmount, msg.sender);
    }
}
```

## stkAAVE 折扣机制

### 折扣计算

持有 stkAAVE（质押的 AAVE）可以获得 GHO 借贷利率折扣：

```solidity
interface IGhoDiscountRateStrategy {
    // 获取用户的折扣率
    function calculateDiscountRate(
        uint256 debtBalance,
        uint256 discountTokenBalance
    ) external view returns (uint256);
}

// 折扣计算示例
contract GhoDiscountCalculator {
    IGhoDiscountRateStrategy public discountStrategy;
    IERC20 public stkAAVE;
    
    // 最大折扣：50%
    uint256 public constant MAX_DISCOUNT = 5000; // 50% in basis points
    
    // 每 100 stkAAVE 可获得 10,000 GHO 的折扣
    uint256 public constant DISCOUNT_RATE = 100; // 100 stkAAVE per 10,000 GHO
    
    function calculateUserDiscount(address user, uint256 ghoDebt) 
        external view returns (uint256 discountRate, uint256 effectiveRate) {
        
        uint256 stkBalance = stkAAVE.balanceOf(user);
        
        // 计算可享受折扣的 GHO 数量
        uint256 discountableGho = (stkBalance * 10000e18) / DISCOUNT_RATE;
        
        if (discountableGho >= ghoDebt) {
            // 全额折扣
            discountRate = MAX_DISCOUNT;
        } else {
            // 部分折扣
            discountRate = (discountableGho * MAX_DISCOUNT) / ghoDebt;
        }
        
        // 假设基础利率为 3%
        uint256 baseRate = 300; // 3% in basis points
        effectiveRate = baseRate - (baseRate * discountRate) / 10000;
        
        return (discountRate, effectiveRate);
    }
}
```

### 折扣示例

| stkAAVE 持有量 | GHO 债务 | 折扣率 | 有效利率 |
|----------------|----------|--------|----------|
| 100 | 10,000 | 50% | 1.5% |
| 50 | 10,000 | 25% | 2.25% |
| 100 | 20,000 | 25% | 2.25% |
| 200 | 10,000 | 50% | 1.5% |

## Facilitator 机制

### 什么是 Facilitator

Facilitator 是被授权铸造 GHO 的实体，每个 Facilitator 有独立的铸造上限：

```
┌─────────────────────────────────────────────────┐
│                  GHO 代币                        │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Aave V3 Pool │  │ FlashMinter  │            │
│  │ Facilitator  │  │ Facilitator  │            │
│  │ Cap: 100M    │  │ Cap: 2M      │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   Future     │  │   Future     │            │
│  │ Facilitator  │  │ Facilitator  │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

### 当前 Facilitator

| Facilitator | 铸造上限 | 用途 |
|-------------|----------|------|
| Aave V3 Pool | 100M GHO | 主要铸造渠道 |
| FlashMinter | 2M GHO | 闪电铸造 |

### 闪电铸造

```solidity
interface IGhoFlashMinter {
    // 闪电铸造 GHO
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
    
    // 获取闪电铸造费用
    function flashFee(address token, uint256 amount) 
        external view returns (uint256);
}

// 闪电铸造示例
contract GhoFlashMintExample is IERC3156FlashBorrower {
    IGhoFlashMinter public flashMinter;
    
    function executeFlashMint(uint256 amount) external {
        flashMinter.flashLoan(
            this,
            GHO_ADDRESS,
            amount,
            ""
        );
    }
    
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // 使用闪电铸造的 GHO
        // ...
        
        // 偿还 GHO + 费用
        IERC20(token).approve(msg.sender, amount + fee);
        
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
```

## GHO 稳定机制

### 价格稳定

GHO 通过以下机制维持价格稳定：

**1. 套利机制**
```
当 GHO > $1:
  用户铸造 GHO → 卖出 GHO → 价格下降

当 GHO < $1:
  用户买入 GHO → 偿还债务 → 价格上升
```

**2. 利率调整**
```solidity
// DAO 可以调整 GHO 借贷利率
interface IGhoVariableDebtToken {
    function updateDiscountRateStrategy(
        address newDiscountRateStrategy
    ) external;
}
```

**3. 铸造上限**
- 限制总供应量
- 防止过度铸造

### 监控 GHO 状态

```solidity
contract GhoMonitor {
    IGhoToken public gho;
    IPool public pool;
    
    struct GhoStatus {
        uint256 totalSupply;
        uint256 totalBorrowed;
        uint256 borrowRate;
        uint256 facilitatorCapacity;
        uint256 facilitatorLevel;
    }
    
    function getGhoStatus() external view returns (GhoStatus memory) {
        (uint256 capacity, uint256 level) = gho.getFacilitatorBucket(
            address(pool)
        );
        
        DataTypes.ReserveData memory reserveData = pool.getReserveData(
            address(gho)
        );
        
        return GhoStatus({
            totalSupply: gho.totalSupply(),
            totalBorrowed: IERC20(reserveData.variableDebtTokenAddress).totalSupply(),
            borrowRate: reserveData.currentVariableBorrowRate,
            facilitatorCapacity: capacity,
            facilitatorLevel: level
        });
    }
}
```

## 使用场景

### 1. 杠杆交易

```solidity
contract GhoLeverage {
    IPool public pool;
    ISwapRouter public swapRouter;
    
    /**
     * @notice 使用 GHO 进行杠杆操作
     * @param collateralAsset 抵押品
     * @param collateralAmount 初始抵押品数量
     * @param leverageMultiplier 杠杆倍数 (2x = 20000)
     */
    function leveragePosition(
        address collateralAsset,
        uint256 collateralAmount,
        uint256 leverageMultiplier
    ) external {
        // 1. 存入初始抵押品
        IERC20(collateralAsset).transferFrom(
            msg.sender, 
            address(this), 
            collateralAmount
        );
        IERC20(collateralAsset).approve(address(pool), collateralAmount);
        pool.supply(collateralAsset, collateralAmount, address(this), 0);
        
        // 2. 计算要铸造的 GHO
        uint256 ghoToMint = (collateralAmount * (leverageMultiplier - 10000)) / 10000;
        
        // 3. 铸造 GHO
        pool.borrow(GHO, ghoToMint, 2, 0, address(this));
        
        // 4. 将 GHO 换成更多抵押品
        IERC20(GHO).approve(address(swapRouter), ghoToMint);
        uint256 additionalCollateral = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: GHO,
                tokenOut: collateralAsset,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: ghoToMint,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // 5. 存入额外抵押品
        IERC20(collateralAsset).approve(address(pool), additionalCollateral);
        pool.supply(collateralAsset, additionalCollateral, address(this), 0);
    }
}
```

### 2. 稳定币流动性提供

```solidity
contract GhoLiquidityProvider {
    ICurvePool public curvePool; // GHO/USDC/USDT 池
    
    function provideLiquidity(uint256 ghoAmount) external {
        // 铸造 GHO
        pool.borrow(GHO, ghoAmount, 2, 0, msg.sender);
        
        // 添加到 Curve 池
        IERC20(GHO).approve(address(curvePool), ghoAmount);
        uint256[3] memory amounts = [ghoAmount, 0, 0];
        curvePool.add_liquidity(amounts, 0);
    }
}
```

## 风险管理

### 主要风险

1. **脱锚风险**：GHO 价格偏离 $1
2. **清算风险**：抵押品价值下跌
3. **利率风险**：DAO 可能调整利率
4. **智能合约风险**：代码漏洞

### 风险缓解

```solidity
contract GhoRiskManager {
    uint256 public constant MIN_HEALTH_FACTOR = 1.5e18;
    
    function checkPosition(address user) external view returns (
        bool isSafe,
        uint256 healthFactor,
        uint256 ghoDebt
    ) {
        (, , , , , uint256 hf) = pool.getUserAccountData(user);
        
        DataTypes.ReserveData memory ghoData = pool.getReserveData(GHO);
        uint256 debt = IERC20(ghoData.variableDebtTokenAddress).balanceOf(user);
        
        return (
            hf >= MIN_HEALTH_FACTOR,
            hf,
            debt
        );
    }
}
```

## 与其他稳定币对比

| 特性 | GHO | DAI | USDC |
|:---|:---:|:---:|:---:|
| 类型 | 超额抵押 | 超额抵押 | 法币储备 |
| 去中心化 | ✅ | ✅ | ❌ |
| 利率决定 | DAO 治理 | 算法 | N/A |
| 利息归属 | Aave DAO | 供应者 | Circle |
| 铸造方式 | 借贷铸造 | CDP | 1:1 兑换 |

::: tip GHO 优势
- 利息收入归 DAO，增强协议可持续性
- stkAAVE 持有者享受折扣，激励生态参与
- 无流动性限制，只受抵押品约束
:::

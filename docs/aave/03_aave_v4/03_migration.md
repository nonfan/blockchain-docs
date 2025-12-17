# Aave V3 到 V4 迁移指南

## 迁移概述

从 Aave V3 迁移到 V4 需要考虑以下几个方面：

1. **合约接口变化**
2. **数据结构更新**
3. **新功能适配**
4. **用户仓位迁移**

## 接口变化

### Pool 合约

```solidity
// V3 接口
interface IPoolV3 {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
}

// V4 接口 - 新增批量操作
interface IPoolV4 {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    
    // 新增
    function executeBatch(BatchOperation[] calldata operations) external;
}
```

### 数据类型变化

```solidity
// V3 ReserveData
struct ReserveDataV3 {
    ReserveConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    uint40 lastUpdateTimestamp;
    uint16 id;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
}

// V4 ReserveData - 新增字段
struct ReserveDataV4 {
    // ... 继承 V3 字段
    
    // 新增
    uint256 liquidityLayerAllocation;
    uint256 dynamicLTV;
    uint256 dynamicLiquidationThreshold;
    bool softLiquidationEnabled;
}
```

## 代码迁移

### 基础迁移

```solidity
// V3 代码
contract MyProtocolV3 {
    IPool public pool;
    
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(address(pool), amount);
        pool.supply(asset, amount, msg.sender, 0);
    }
}

// V4 代码 - 基本兼容
contract MyProtocolV4 {
    IPoolV4 public pool;
    
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(address(pool), amount);
        pool.supply(asset, amount, msg.sender, 0); // 接口相同
    }
    
    // 新增：利用批量操作优化
    function depositMultiple(
        address[] calldata assets,
        uint256[] calldata amounts
    ) external {
        BatchOperation[] memory ops = new BatchOperation[](assets.length);
        
        for (uint i = 0; i < assets.length; i++) {
            IERC20(assets[i]).transferFrom(msg.sender, address(this), amounts[i]);
            IERC20(assets[i]).approve(address(pool), amounts[i]);
            
            ops[i] = BatchOperation({
                operationType: 0, // Supply
                asset: assets[i],
                amount: amounts[i],
                interestRateMode: 0,
                onBehalfOf: msg.sender
            });
        }
        
        pool.executeBatch(ops);
    }
}
```

### 闪电贷迁移

```solidity
// V3 闪电贷
contract FlashLoanV3 is FlashLoanSimpleReceiverBase {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // V3 逻辑
        return true;
    }
}

// V4 闪电贷 - 接口相同，但可以利用新功能
contract FlashLoanV4 is FlashLoanSimpleReceiverBaseV4 {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // V4 逻辑 - 可以使用批量操作
        BatchOperation[] memory ops = new BatchOperation[](2);
        // ... 构建操作
        POOL.executeBatch(ops);
        
        return true;
    }
}
```

## 用户仓位迁移

### 迁移助手合约

```solidity
pragma solidity ^0.8.20;

import {IPoolV3} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IPoolV4} from "@aave/v4-core/contracts/interfaces/IPoolV4.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MigrationHelper {
    IPoolV3 public immutable poolV3;
    IPoolV4 public immutable poolV4;
    
    constructor(address _poolV3, address _poolV4) {
        poolV3 = IPoolV3(_poolV3);
        poolV4 = IPoolV4(_poolV4);
    }
    
    /**
     * @notice 迁移用户的供应仓位
     * @param assets 要迁移的资产列表
     */
    function migrateSupplyPositions(address[] calldata assets) external {
        for (uint i = 0; i < assets.length; i++) {
            _migrateSupply(assets[i]);
        }
    }
    
    function _migrateSupply(address asset) internal {
        // 1. 获取 V3 aToken 地址
        DataTypes.ReserveData memory reserveData = poolV3.getReserveData(asset);
        address aTokenV3 = reserveData.aTokenAddress;
        
        // 2. 获取用户在 V3 的余额
        uint256 balance = IERC20(aTokenV3).balanceOf(msg.sender);
        if (balance == 0) return;
        
        // 3. 从 V3 提取
        // 用户需要先授权 aToken
        IERC20(aTokenV3).transferFrom(msg.sender, address(this), balance);
        uint256 withdrawn = poolV3.withdraw(asset, type(uint256).max, address(this));
        
        // 4. 存入 V4
        IERC20(asset).approve(address(poolV4), withdrawn);
        poolV4.supply(asset, withdrawn, msg.sender, 0);
    }
    
    /**
     * @notice 迁移完整仓位（包括债务）
     * @dev 使用闪电贷来处理债务迁移
     */
    function migrateFullPosition(
        address[] calldata supplyAssets,
        address[] calldata debtAssets,
        uint256[] calldata debtAmounts
    ) external {
        // 使用闪电贷偿还 V3 债务
        bytes memory params = abi.encode(
            msg.sender,
            supplyAssets,
            debtAssets,
            debtAmounts
        );
        
        // 从 V4 借出资金来偿还 V3 债务
        poolV4.flashLoanSimple(
            address(this),
            debtAssets[0], // 简化：假设单一债务资产
            debtAmounts[0],
            params,
            0
        );
    }
    
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(poolV4), "Invalid caller");
        
        (
            address user,
            address[] memory supplyAssets,
            address[] memory debtAssets,
            uint256[] memory debtAmounts
        ) = abi.decode(params, (address, address[], address[], uint256[]));
        
        // 1. 偿还 V3 债务
        for (uint i = 0; i < debtAssets.length; i++) {
            IERC20(debtAssets[i]).approve(address(poolV3), debtAmounts[i]);
            poolV3.repay(debtAssets[i], debtAmounts[i], 2, user);
        }
        
        // 2. 从 V3 提取抵押品
        for (uint i = 0; i < supplyAssets.length; i++) {
            DataTypes.ReserveData memory data = poolV3.getReserveData(supplyAssets[i]);
            uint256 balance = IERC20(data.aTokenAddress).balanceOf(user);
            
            if (balance > 0) {
                // 用户需要预先授权
                IERC20(data.aTokenAddress).transferFrom(user, address(this), balance);
                poolV3.withdraw(supplyAssets[i], type(uint256).max, address(this));
            }
        }
        
        // 3. 存入 V4
        for (uint i = 0; i < supplyAssets.length; i++) {
            uint256 balance = IERC20(supplyAssets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(supplyAssets[i]).approve(address(poolV4), balance);
                poolV4.supply(supplyAssets[i], balance, user, 0);
            }
        }
        
        // 4. 在 V4 重新借贷
        for (uint i = 0; i < debtAssets.length; i++) {
            poolV4.borrow(debtAssets[i], debtAmounts[i], 2, 0, user);
        }
        
        // 5. 偿还闪电贷
        uint256 totalDebt = amount + premium;
        IERC20(asset).approve(address(poolV4), totalDebt);
        
        return true;
    }
    
    /**
     * @notice 估算迁移成本
     */
    function estimateMigrationCost(
        address user,
        address[] calldata supplyAssets,
        address[] calldata debtAssets
    ) external view returns (uint256 estimatedGas) {
        // 基础 gas 成本
        estimatedGas = 100000;
        
        // 每个供应资产的成本
        estimatedGas += supplyAssets.length * 150000;
        
        // 每个债务资产的成本
        estimatedGas += debtAssets.length * 200000;
        
        // 闪电贷成本
        if (debtAssets.length > 0) {
            estimatedGas += 100000;
        }
    }
}
```

### JavaScript 迁移脚本

```typescript
import { ethers } from 'ethers';

class AaveMigrator {
    private poolV3: ethers.Contract;
    private poolV4: ethers.Contract;
    private migrationHelper: ethers.Contract;
    private signer: ethers.Signer;
    
    constructor(
        poolV3Address: string,
        poolV4Address: string,
        migrationHelperAddress: string,
        signer: ethers.Signer
    ) {
        this.poolV3 = new ethers.Contract(poolV3Address, POOL_V3_ABI, signer);
        this.poolV4 = new ethers.Contract(poolV4Address, POOL_V4_ABI, signer);
        this.migrationHelper = new ethers.Contract(
            migrationHelperAddress, 
            MIGRATION_HELPER_ABI, 
            signer
        );
        this.signer = signer;
    }
    
    async analyzePosition(): Promise<{
        supplies: { asset: string; amount: string }[];
        debts: { asset: string; amount: string }[];
        healthFactor: string;
    }> {
        const userAddress = await this.signer.getAddress();
        
        // 获取 V3 账户数据
        const accountData = await this.poolV3.getUserAccountData(userAddress);
        
        // 获取所有储备
        const reserves = await this.poolV3.getReservesList();
        
        const supplies: { asset: string; amount: string }[] = [];
        const debts: { asset: string; amount: string }[] = [];
        
        for (const reserve of reserves) {
            const reserveData = await this.poolV3.getReserveData(reserve);
            
            // 检查供应
            const aToken = new ethers.Contract(
                reserveData.aTokenAddress, 
                ERC20_ABI, 
                this.signer
            );
            const supplyBalance = await aToken.balanceOf(userAddress);
            if (supplyBalance.gt(0)) {
                supplies.push({
                    asset: reserve,
                    amount: supplyBalance.toString()
                });
            }
            
            // 检查债务
            const debtToken = new ethers.Contract(
                reserveData.variableDebtTokenAddress,
                ERC20_ABI,
                this.signer
            );
            const debtBalance = await debtToken.balanceOf(userAddress);
            if (debtBalance.gt(0)) {
                debts.push({
                    asset: reserve,
                    amount: debtBalance.toString()
                });
            }
        }
        
        return {
            supplies,
            debts,
            healthFactor: ethers.utils.formatEther(accountData.healthFactor)
        };
    }
    
    async migrate(): Promise<string[]> {
        const position = await this.analyzePosition();
        const txHashes: string[] = [];
        
        console.log('Current Position:', position);
        
        // 1. 授权 aTokens
        for (const supply of position.supplies) {
            const reserveData = await this.poolV3.getReserveData(supply.asset);
            const aToken = new ethers.Contract(
                reserveData.aTokenAddress,
                ERC20_ABI,
                this.signer
            );
            
            const tx = await aToken.approve(
                this.migrationHelper.address,
                ethers.constants.MaxUint256
            );
            await tx.wait();
            txHashes.push(tx.hash);
            console.log(`Approved aToken for ${supply.asset}`);
        }
        
        // 2. 执行迁移
        if (position.debts.length === 0) {
            // 无债务，简单迁移
            const supplyAssets = position.supplies.map(s => s.asset);
            const tx = await this.migrationHelper.migrateSupplyPositions(supplyAssets);
            await tx.wait();
            txHashes.push(tx.hash);
            console.log('Supply positions migrated');
        } else {
            // 有债务，完整迁移
            const supplyAssets = position.supplies.map(s => s.asset);
            const debtAssets = position.debts.map(d => d.asset);
            const debtAmounts = position.debts.map(d => d.amount);
            
            const tx = await this.migrationHelper.migrateFullPosition(
                supplyAssets,
                debtAssets,
                debtAmounts
            );
            await tx.wait();
            txHashes.push(tx.hash);
            console.log('Full position migrated');
        }
        
        return txHashes;
    }
    
    async verifyMigration(): Promise<boolean> {
        const userAddress = await this.signer.getAddress();
        
        // 检查 V3 仓位是否清空
        const v3Data = await this.poolV3.getUserAccountData(userAddress);
        const v3Empty = v3Data.totalCollateralBase.eq(0) && v3Data.totalDebtBase.eq(0);
        
        // 检查 V4 仓位
        const v4Data = await this.poolV4.getUserAccountData(userAddress);
        const v4HasPosition = v4Data.totalCollateralBase.gt(0);
        
        console.log('V3 Position Cleared:', v3Empty);
        console.log('V4 Position Created:', v4HasPosition);
        
        return v3Empty && v4HasPosition;
    }
}

// 使用示例
async function main() {
    const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
    const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
    
    const migrator = new AaveMigrator(
        POOL_V3_ADDRESS,
        POOL_V4_ADDRESS,
        MIGRATION_HELPER_ADDRESS,
        signer
    );
    
    // 分析当前仓位
    const position = await migrator.analyzePosition();
    console.log('Current Position:', position);
    
    // 执行迁移
    const txHashes = await migrator.migrate();
    console.log('Migration Transactions:', txHashes);
    
    // 验证迁移
    const success = await migrator.verifyMigration();
    console.log('Migration Successful:', success);
}
```

## 迁移检查清单

### 迁移前

- [ ] 分析当前 V3 仓位
- [ ] 确认 V4 支持所有资产
- [ ] 检查 V4 的风险参数
- [ ] 准备足够的 Gas
- [ ] 在测试网测试迁移流程

### 迁移中

- [ ] 授权所有必要的代币
- [ ] 执行迁移交易
- [ ] 监控交易状态

### 迁移后

- [ ] 验证 V3 仓位已清空
- [ ] 验证 V4 仓位正确
- [ ] 检查健康因子
- [ ] 设置 V4 自动化规则

## 常见问题

### Q: 迁移会影响我的健康因子吗？

A: 迁移过程中健康因子可能会暂时波动，但最终应该保持相似水平。V4 的动态风险参数可能会导致略有不同的健康因子。

### Q: 迁移需要多少 Gas？

A: 取决于仓位复杂度：
- 简单供应仓位：约 200,000-300,000 Gas
- 包含债务的仓位：约 500,000-800,000 Gas

### Q: 可以部分迁移吗？

A: 可以，你可以选择只迁移部分资产。但如果有债务，建议一次性完整迁移。

### Q: 迁移后可以回到 V3 吗？

A: 技术上可以，但不建议。V4 提供更好的功能和效率。

::: danger 迁移前必读
- 在测试网充分测试迁移流程
- 确保有足够 Gas 完成整个迁移
- 选择市场波动较小的时间窗口
- 准备好紧急回滚方案
:::

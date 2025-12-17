# 治理

## 治理概述

Aave 采用去中心化治理模式，由 AAVE 代币持有者共同决定协议的发展方向。治理涵盖协议参数调整、新功能开发、资金分配等重要决策。

### 治理架构

```
┌─────────────────────────────────────────────────┐
│                 Aave DAO                        │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐            │
│  │ AAVE 持有者  │  │ stkAAVE 持有者│            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  ↓                              │
│         ┌───────────────┐                       │
│         │   治理合约    │                       │
│         └───────┬───────┘                       │
│                 ↓                               │
│  ┌──────────────────────────────────┐          │
│  │           执行器                  │          │
│  │  Short │ Long │ Guardian         │          │
│  └──────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

## AAVE 代币

### 代币功能

| 功能 | 描述 |
|------|------|
| 治理投票 | 参与协议决策 |
| 安全模块质押 | 保护协议，获得奖励 |
| GHO 折扣 | 质押者借 GHO 享受利率折扣 |
| 协议费用 | 未来可能分享协议收入 |

### 代币分布

```
总供应量: 16,000,000 AAVE

┌────────────────────────────────────┐
│ 创始团队和投资者    30%            │
│ 生态系统储备        40%            │
│ 安全模块激励        10%            │
│ 流动性挖矿          20%            │
└────────────────────────────────────┘
```

## 安全模块 (Safety Module)

### 工作机制

```solidity
interface IStakedAave {
    // 质押 AAVE
    function stake(address to, uint256 amount) external;
    
    // 开始冷却期
    function cooldown() external;
    
    // 赎回（冷却期后）
    function redeem(address to, uint256 amount) external;
    
    // 领取奖励
    function claimRewards(address to, uint256 amount) external;
    
    // 获取用户冷却期信息
    function stakersCooldowns(address staker) external view returns (uint256);
}
```

### 质押流程

```
质押 AAVE → 获得 stkAAVE → 赚取奖励
                ↓
           冷却期 (10天)
                ↓
           赎回窗口 (2天)
                ↓
           赎回 AAVE
```

### 质押合约示例

```solidity
pragma solidity ^0.8.10;

import {IStakedAave} from "./interfaces/IStakedAave.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingHelper {
    IStakedAave public immutable stkAAVE;
    IERC20 public immutable AAVE;
    
    constructor(address _stkAAVE, address _aave) {
        stkAAVE = IStakedAave(_stkAAVE);
        AAVE = IERC20(_aave);
    }
    
    /**
     * @notice 质押 AAVE
     */
    function stake(uint256 amount) external {
        AAVE.transferFrom(msg.sender, address(this), amount);
        AAVE.approve(address(stkAAVE), amount);
        stkAAVE.stake(msg.sender, amount);
    }
    
    /**
     * @notice 开始冷却期
     */
    function startCooldown() external {
        stkAAVE.cooldown();
    }
    
    /**
     * @notice 赎回 stkAAVE
     */
    function redeem(uint256 amount) external {
        // 检查是否在赎回窗口内
        uint256 cooldownStart = stkAAVE.stakersCooldowns(msg.sender);
        require(cooldownStart > 0, "Cooldown not started");
        require(
            block.timestamp >= cooldownStart + 10 days,
            "Cooldown not finished"
        );
        require(
            block.timestamp <= cooldownStart + 12 days,
            "Redeem window closed"
        );
        
        stkAAVE.redeem(msg.sender, amount);
    }
    
    /**
     * @notice 领取质押奖励
     */
    function claimRewards() external {
        uint256 rewards = stkAAVE.getTotalRewardsBalance(msg.sender);
        stkAAVE.claimRewards(msg.sender, rewards);
    }
}
```

### Slashing 机制

当协议出现资金缺口时，安全模块中的 stkAAVE 可能被削减（最高 30%）来弥补损失：

```solidity
interface ISlashingAdmin {
    // 执行 slashing
    function slash(
        address destination,
        uint256 amount
    ) external;
}
```

## 提案流程

### 提案类型

| 类型 | 执行器 | 延迟时间 | 用途 |
|------|--------|----------|------|
| Short | Short Executor | 1 天 | 常规参数调整 |
| Long | Long Executor | 7 天 | 重大变更 |
| Guardian | Guardian | 即时 | 紧急操作 |

### 提案生命周期

```
创建提案 → 投票期 (3天) → 执行延迟 → 执行
    ↓           ↓            ↓
  需要阈值    需要法定人数   时间锁
```

### 创建提案

```solidity
interface IAaveGovernanceV2 {
    struct ProposalWithoutVotes {
        uint256 id;
        address creator;
        IExecutorWithTimelock executor;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        bool withDelegatecalls;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executionTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
        address strategy;
        bytes32 ipfsHash;
    }
    
    // 创建提案
    function create(
        IExecutorWithTimelock executor,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        bool[] memory withDelegatecalls,
        bytes32 ipfsHash
    ) external returns (uint256);
    
    // 投票
    function submitVote(uint256 proposalId, bool support) external;
    
    // 执行提案
    function execute(uint256 proposalId) external payable;
}
```

### 提案示例

```solidity
contract ProposalCreator {
    IAaveGovernanceV2 public governance;
    IExecutorWithTimelock public shortExecutor;
    
    /**
     * @notice 创建调整利率的提案
     */
    function createRateUpdateProposal(
        address asset,
        uint256 newOptimalRate
    ) external returns (uint256) {
        address[] memory targets = new address[](1);
        targets[0] = address(poolConfigurator);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        string[] memory signatures = new string[](1);
        signatures[0] = "setReserveInterestRateStrategyAddress(address,address)";
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encode(asset, newRateStrategy);
        
        bool[] memory withDelegatecalls = new bool[](1);
        withDelegatecalls[0] = true;
        
        bytes32 ipfsHash = keccak256("AIP-XXX: Update interest rate");
        
        return governance.create(
            shortExecutor,
            targets,
            values,
            signatures,
            calldatas,
            withDelegatecalls,
            ipfsHash
        );
    }
}
```

## 投票机制

### 投票权计算

```solidity
interface IGovernanceStrategy {
    // 获取用户在特定区块的投票权
    function getVotingPowerAt(
        address user,
        uint256 blockNumber
    ) external view returns (uint256);
    
    // 获取总投票权
    function getTotalVotingSupplyAt(
        uint256 blockNumber
    ) external view returns (uint256);
}

// 投票权 = AAVE 余额 + stkAAVE 余额 + 委托给用户的投票权
```

### 委托投票

```solidity
interface IDelegation {
    // 委托投票权
    function delegate(address delegatee) external;
    
    // 委托给特定类型
    function delegateByType(
        address delegatee,
        DelegationType delegationType
    ) external;
    
    // 获取委托人
    function getDelegateeByType(
        address delegator,
        DelegationType delegationType
    ) external view returns (address);
}

enum DelegationType {
    VOTING_POWER,
    PROPOSITION_POWER
}
```

### 投票示例

```solidity
contract VotingHelper {
    IAaveGovernanceV2 public governance;
    IERC20 public aave;
    IStakedAave public stkAAVE;
    
    /**
     * @notice 委托投票权
     */
    function delegateVotingPower(address delegatee) external {
        // 委托 AAVE 投票权
        IDelegation(address(aave)).delegate(delegatee);
        
        // 委托 stkAAVE 投票权
        IDelegation(address(stkAAVE)).delegate(delegatee);
    }
    
    /**
     * @notice 投票
     */
    function vote(uint256 proposalId, bool support) external {
        governance.submitVote(proposalId, support);
    }
    
    /**
     * @notice 批量投票
     */
    function batchVote(
        uint256[] calldata proposalIds,
        bool[] calldata supports
    ) external {
        require(proposalIds.length == supports.length, "Length mismatch");
        
        for (uint i = 0; i < proposalIds.length; i++) {
            governance.submitVote(proposalIds[i], supports[i]);
        }
    }
}
```

## 治理参数

### 提案阈值

| 参数 | Short Executor | Long Executor |
|------|----------------|---------------|
| 创建阈值 | 0.5% 总供应量 | 2% 总供应量 |
| 法定人数 | 2% 总供应量 | 6.5% 总供应量 |
| 通过阈值 | 50% + 1 | 50% + 1 |
| 投票期 | 3 天 | 10 天 |
| 执行延迟 | 1 天 | 7 天 |

### 可治理参数

```solidity
// 协议参数
- 利率策略
- 风险参数 (LTV, 清算阈值等)
- 储备因子
- 供应/借贷上限

// 治理参数
- 提案阈值
- 投票期
- 执行延迟

// 安全模块参数
- 质押奖励
- 冷却期
- Slashing 比例
```

## Guardian 角色

### Guardian 权限

Guardian 是紧急情况下的快速响应机制：

```solidity
interface IEmergencyAdmin {
    // 暂停协议
    function setPoolPause(bool paused) external;
    
    // 暂停特定资产
    function setReservePause(address asset, bool paused) external;
    
    // 取消提案
    function cancel(uint256 proposalId) external;
}
```

### Guardian 使用场景

1. **安全漏洞**：发现漏洞时暂停协议
2. **预言机故障**：价格数据异常时暂停
3. **恶意提案**：取消可能损害协议的提案

## 参与治理

### JavaScript 示例

```typescript
import { ethers } from 'ethers';

class AaveGovernance {
    private governance: ethers.Contract;
    private aave: ethers.Contract;
    private stkAAVE: ethers.Contract;
    private signer: ethers.Signer;
    
    constructor(
        governanceAddress: string,
        aaveAddress: string,
        stkAAVEAddress: string,
        signer: ethers.Signer
    ) {
        this.governance = new ethers.Contract(
            governanceAddress, 
            GOVERNANCE_ABI, 
            signer
        );
        this.aave = new ethers.Contract(aaveAddress, AAVE_ABI, signer);
        this.stkAAVE = new ethers.Contract(stkAAVEAddress, STK_AAVE_ABI, signer);
        this.signer = signer;
    }
    
    async getVotingPower(): Promise<string> {
        const userAddress = await this.signer.getAddress();
        const blockNumber = await this.signer.provider!.getBlockNumber();
        
        const strategy = await this.governance.getGovernanceStrategy();
        const strategyContract = new ethers.Contract(
            strategy,
            STRATEGY_ABI,
            this.signer
        );
        
        const votingPower = await strategyContract.getVotingPowerAt(
            userAddress,
            blockNumber
        );
        
        return ethers.utils.formatEther(votingPower);
    }
    
    async delegate(delegatee: string): Promise<void> {
        // 委托 AAVE
        const tx1 = await this.aave.delegate(delegatee);
        await tx1.wait();
        
        // 委托 stkAAVE
        const tx2 = await this.stkAAVE.delegate(delegatee);
        await tx2.wait();
    }
    
    async vote(proposalId: number, support: boolean): Promise<string> {
        const tx = await this.governance.submitVote(proposalId, support);
        const receipt = await tx.wait();
        return receipt.transactionHash;
    }
    
    async getProposal(proposalId: number): Promise<any> {
        return await this.governance.getProposalById(proposalId);
    }
    
    async getActiveProposals(): Promise<number[]> {
        const count = await this.governance.getProposalsCount();
        const activeProposals: number[] = [];
        
        for (let i = 0; i < count; i++) {
            const state = await this.governance.getProposalState(i);
            if (state === 1) { // Active
                activeProposals.push(i);
            }
        }
        
        return activeProposals;
    }
}

// 使用示例
async function main() {
    const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
    const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
    
    const governance = new AaveGovernance(
        GOVERNANCE_ADDRESS,
        AAVE_ADDRESS,
        STK_AAVE_ADDRESS,
        signer
    );
    
    // 获取投票权
    const votingPower = await governance.getVotingPower();
    console.log('Voting Power:', votingPower);
    
    // 获取活跃提案
    const activeProposals = await governance.getActiveProposals();
    console.log('Active Proposals:', activeProposals);
    
    // 投票
    if (activeProposals.length > 0) {
        await governance.vote(activeProposals[0], true);
    }
}
```

## 治理资源

### 官方渠道

- [治理论坛](https://governance.aave.com/)
- [Snapshot 投票](https://snapshot.org/#/aave.eth)
- [治理文档](https://docs.aave.com/governance/)

### 提案模板

```markdown
# AIP-XXX: [提案标题]

## 简介
[简要描述提案内容]

## 动机
[为什么需要这个提案]

## 规格
[技术细节和参数]

## 实现
[如何实现]

## 风险分析
[潜在风险和缓解措施]

## 参考
[相关链接和讨论]
```

## 治理最佳实践

::: tip 参与建议
- 关注治理论坛，了解提案背景
- 评估提案对协议安全和收益的影响
- 考虑委托给专业代表（如无时间研究）
- 参与 Snapshot 温度检查投票
:::

::: warning 注意事项
- 投票权基于快照区块，需提前持有代币
- 委托后仍可自行投票（覆盖委托）
- Guardian 操作无需投票，用于紧急情况
:::

# 开发资源

## 官方资源

### 文档

| 资源 | 链接 | 描述 |
|------|------|------|
| 官方文档 | https://docs.aave.com/ | 完整协议文档 |
| 开发者文档 | https://docs.aave.com/developers/ | 技术集成指南 |
| 治理文档 | https://docs.aave.com/governance/ | 治理机制说明 |
| 风险框架 | https://docs.aave.com/risk/ | 风险参数和管理 |

### 代码仓库

| 仓库 | 链接 | 描述 |
|------|------|------|
| aave-v3-core | https://github.com/aave/aave-v3-core | V3 核心合约 |
| aave-v3-periphery | https://github.com/aave/aave-v3-periphery | V3 外围合约 |
| aave-utilities | https://github.com/aave/aave-utilities | SDK 和工具 |
| gho-core | https://github.com/aave/gho-core | GHO 稳定币合约 |
| aave-governance-v2 | https://github.com/aave/governance-v2 | 治理合约 |

### 应用

| 应用 | 链接 | 描述 |
|------|------|------|
| Aave App | https://app.aave.com/ | 主应用界面 |
| 治理论坛 | https://governance.aave.com/ | 提案讨论 |
| Snapshot | https://snapshot.org/#/aave.eth | 链下投票 |

## 合约地址

### Ethereum 主网

```javascript
const ETHEREUM_ADDRESSES = {
  // V3 核心
  Pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  PoolAddressesProvider: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
  PoolDataProvider: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
  
  // 预言机
  AaveOracle: "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
  
  // 治理
  AaveGovernanceV2: "0xEC568fffba86c094cf06b22134B23074DFE2252c",
  ShortExecutor: "0xEE56e2B3D491590B5b31738cC34d5232F378a8D5",
  LongExecutor: "0x79426A1c24B2978D90d7A5070a46C65B07bC4299",
  
  // 代币
  AAVE: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  stkAAVE: "0x4da27a545c0c5B758a6BA100e3a049001de870f5",
  GHO: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
  
  // 辅助
  WETHGateway: "0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C",
  WrappedTokenGatewayV3: "0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C",
};
```

### Polygon

```javascript
const POLYGON_ADDRESSES = {
  Pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  PoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  PoolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  AaveOracle: "0xb023e699F5a33916Ea823A16485e259257cA8Bd1",
};
```

### Arbitrum

```javascript
const ARBITRUM_ADDRESSES = {
  Pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  PoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  PoolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  AaveOracle: "0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7",
};
```

### Optimism

```javascript
const OPTIMISM_ADDRESSES = {
  Pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  PoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
  PoolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  AaveOracle: "0xD81eb3728a631871a7eBBaD631b5f424909f0c77",
};
```

## SDK 和工具

### @aave/contract-helpers

```bash
npm install @aave/contract-helpers
```

```typescript
import { Pool, InterestRate } from '@aave/contract-helpers';

const pool = new Pool(provider, {
  POOL: POOL_ADDRESS,
  WETH_GATEWAY: WETH_GATEWAY_ADDRESS,
});

// 供应
const supplyTxs = await pool.supply({
  user: userAddress,
  reserve: assetAddress,
  amount: '1000',
});

// 借贷
const borrowTxs = await pool.borrow({
  user: userAddress,
  reserve: assetAddress,
  amount: '500',
  interestRateMode: InterestRate.Variable,
});
```

### @aave/math-utils

```bash
npm install @aave/math-utils
```

```typescript
import { 
  formatReserves, 
  formatUserSummary,
  calculateHealthFactorFromBalances 
} from '@aave/math-utils';

// 格式化储备数据
const formattedReserves = formatReserves({
  reserves: rawReserves,
  currentTimestamp,
  marketReferenceCurrencyDecimals: 8,
  marketReferencePriceInUsd: ethPriceUsd,
});

// 格式化用户数据
const userSummary = formatUserSummary({
  currentTimestamp,
  marketReferencePriceInUsd: ethPriceUsd,
  marketReferenceCurrencyDecimals: 8,
  userReserves: rawUserReserves,
  formattedReserves,
  userEmodeCategoryId: 0,
});

// 计算健康因子
const healthFactor = calculateHealthFactorFromBalances({
  collateralBalanceMarketReferenceCurrency: '10000',
  borrowBalanceMarketReferenceCurrency: '5000',
  currentLiquidationThreshold: '8000',
});
```

### Subgraph

```graphql
# Aave V3 Subgraph
# https://thegraph.com/hosted-service/subgraph/aave/protocol-v3

query GetUserReserves($user: String!) {
  userReserves(where: { user: $user }) {
    reserve {
      symbol
      underlyingAsset
    }
    currentATokenBalance
    currentVariableDebt
    currentStableDebt
  }
}

query GetReserves {
  reserves {
    symbol
    underlyingAsset
    liquidityRate
    variableBorrowRate
    stableBorrowRate
    totalLiquidity
    totalCurrentVariableDebt
  }
}
```

## 测试资源

### 测试网

| 网络 | 水龙头 | Pool 地址 |
|------|--------|-----------|
| Sepolia | https://staging.aave.com/faucet/ | 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951 |
| Mumbai | https://staging.aave.com/faucet/ | 0x0b913A76beFF3887d35073b8e5530755D60F78C7 |

### Hardhat Fork 测试

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
        blockNumber: 18000000,
      },
    },
  },
};
```

```typescript
// 测试示例
import { ethers } from "hardhat";

describe("Aave Integration", () => {
  it("should supply and borrow", async () => {
    // Impersonate a whale
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE_ADDRESS],
    });
    
    const whale = await ethers.getSigner(WHALE_ADDRESS);
    const pool = await ethers.getContractAt("IPool", POOL_ADDRESS, whale);
    
    // Supply
    await pool.supply(USDC_ADDRESS, amount, whale.address, 0);
    
    // Borrow
    await pool.borrow(DAI_ADDRESS, borrowAmount, 2, 0, whale.address);
  });
});
```

## API 和数据

### Aave API

```typescript
// 获取市场数据
const response = await fetch(
  'https://aave-api-v2.aave.com/data/markets-data'
);
const markets = await response.json();

// 获取用户数据
const userResponse = await fetch(
  `https://aave-api-v2.aave.com/data/users/${userAddress}`
);
const userData = await userResponse.json();
```

### DeFi Llama API

```typescript
// 获取 Aave TVL
const response = await fetch(
  'https://api.llama.fi/protocol/aave'
);
const data = await response.json();
console.log('TVL:', data.tvl);
```

## 安全资源

### 审计报告

| 审计公司 | 版本 | 链接 |
|----------|------|------|
| Trail of Bits | V3 | https://github.com/aave/aave-v3-core/tree/master/audits |
| ABDK | V3 | https://github.com/aave/aave-v3-core/tree/master/audits |
| OpenZeppelin | V3 | https://github.com/aave/aave-v3-core/tree/master/audits |
| SigmaPrime | V3 | https://github.com/aave/aave-v3-core/tree/master/audits |

### Bug Bounty

- **平台**: Immunefi
- **链接**: https://immunefi.com/bounty/aave/
- **最高奖励**: $250,000

## 社区资源

### 官方渠道

| 平台 | 链接 |
|------|------|
| Discord | https://discord.gg/aave |
| Twitter | https://twitter.com/aaborrowow |
| Medium | https://medium.com/aave |
| YouTube | https://www.youtube.com/c/Aave |

### 开发者社区

| 资源 | 链接 |
|------|------|
| 开发者 Discord | https://discord.gg/aave (开发者频道) |
| GitHub Discussions | https://github.com/aave/aave-v3-core/discussions |
| Stack Exchange | https://ethereum.stackexchange.com/questions/tagged/aave |

## 学习资源

### 教程

1. **官方教程**
   - [Aave 开发者入门](https://docs.aave.com/developers/getting-started/readme)
   - [闪电贷教程](https://docs.aave.com/developers/guides/flash-loans)

2. **社区教程**
   - [Alchemy Aave 教程](https://docs.alchemy.com/docs/how-to-build-with-aave)
   - [Chainlink Aave 集成](https://docs.chain.link/data-feeds/using-data-feeds)

### 视频课程

| 课程 | 平台 | 链接 |
|------|------|------|
| Aave 开发入门 | YouTube | Aave 官方频道 |
| DeFi 开发 | Udemy | 搜索 "Aave Development" |
| 智能合约安全 | Secureum | https://secureum.xyz/ |

## 常用代码片段

### 获取用户账户数据

```typescript
async function getUserAccountData(userAddress: string) {
  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
  
  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor
  ] = await pool.getUserAccountData(userAddress);
  
  return {
    totalCollateral: ethers.utils.formatUnits(totalCollateralBase, 8),
    totalDebt: ethers.utils.formatUnits(totalDebtBase, 8),
    availableBorrows: ethers.utils.formatUnits(availableBorrowsBase, 8),
    liquidationThreshold: currentLiquidationThreshold.toString(),
    ltv: ltv.toString(),
    healthFactor: ethers.utils.formatEther(healthFactor),
  };
}
```

### 获取储备数据

```typescript
async function getReserveData(assetAddress: string) {
  const dataProvider = new ethers.Contract(
    DATA_PROVIDER_ADDRESS,
    DATA_PROVIDER_ABI,
    provider
  );
  
  const data = await dataProvider.getReserveData(assetAddress);
  
  return {
    availableLiquidity: data.availableLiquidity.toString(),
    totalStableDebt: data.totalStableDebt.toString(),
    totalVariableDebt: data.totalVariableDebt.toString(),
    liquidityRate: data.liquidityRate.toString(),
    variableBorrowRate: data.variableBorrowRate.toString(),
    stableBorrowRate: data.stableBorrowRate.toString(),
    utilizationRate: data.utilizationRate.toString(),
  };
}
```

### 监听事件

```typescript
function setupEventListeners(pool: ethers.Contract) {
  pool.on("Supply", (reserve, user, onBehalfOf, amount, referralCode, event) => {
    console.log(`Supply: ${user} supplied ${amount} of ${reserve}`);
  });
  
  pool.on("Borrow", (reserve, user, onBehalfOf, amount, interestRateMode, borrowRate, referralCode, event) => {
    console.log(`Borrow: ${user} borrowed ${amount} of ${reserve}`);
  });
  
  pool.on("Repay", (reserve, user, repayer, amount, useATokens, event) => {
    console.log(`Repay: ${repayer} repaid ${amount} of ${reserve} for ${user}`);
  });
  
  pool.on("LiquidationCall", (collateralAsset, debtAsset, user, debtToCover, liquidatedCollateralAmount, liquidator, receiveAToken, event) => {
    console.log(`Liquidation: ${liquidator} liquidated ${user}`);
  });
}
```

## 快速参考

::: tip 开发检查清单
- [ ] 安装 SDK：`npm install @aave/contract-helpers @aave/math-utils`
- [ ] 配置正确的网络合约地址
- [ ] 设置 Hardhat fork 测试环境
- [ ] 订阅 Discord 开发者频道获取更新
- [ ] 阅读最新审计报告了解安全边界
:::

::: warning 常见问题
- 确保使用正确版本的 Solidity（V3 需要 0.8.10+）
- 注意不同网络的合约地址不同
- 测试网代币需从官方水龙头获取
- Subgraph 数据可能有几分钟延迟
:::

# TypeScript SDK

> 使用 Aptos TypeScript SDK 进行账户、交易、视图函数与索引查询

- `Aptos` / `AptosConfig` 连接网络与查询链上数据（TS SDK v2）
- `Account` 本地账户与签名（支持 Ed25519/Secp256k1）
- `transaction.build.simple` 构建交易 + `signAndSubmitTransaction` 提交
- `fundAccount` 测试网水龙头为地址注资

## 安装

```bash
npm i @aptos-labs/ts-sdk
# 或
pnpm add @aptos-labs/ts-sdk
# 或
yarn add @aptos-labs/ts-sdk
```

## 初始化与查询

初始化客户端即建立与网络的连接。查询常用信息如账本、账户模块、资源等，便于在发送交易前完成前置检查与环境探测。根据环境选择 `Network.TESTNET/MAINNET/DEVNET`，或使用自定义端点与 API Key。

```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const ledger = await aptos.getLedgerInfo();
const modules = await aptos.getAccountModules({ accountAddress: "0x1" });
```

## 账户与转账

标准流程包括：生成或导入账户、在测试网为账户注资、构建转账交易、签名并提交、等待交易确认。

转账金额单位为 Octas（1 APT = 10^8 Octas），示例中的数值均为 Octas。生产环境建议使用钱包或后端签名服务，避免在前端持有私钥。

```ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const alice = Account.generate();
await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: 1_000_000 });

const transaction = await aptos.transaction.build.simple({
  sender: alice.accountAddress,
  data: {
    function: "0x1::coin::transfer",
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    functionArguments: ["0x...recipient", 1000],
  },
});

const pending = await aptos.signAndSubmitTransaction({ signer: alice, transaction });
await aptos.waitForTransaction({ transactionHash: pending.hash });
```

## 交易（JSON 与 BCS）

构建交易后建议先进行模拟，查看 gas 估算与可能的失败原因，再进行签名与提交。对于常见转账场景可使用封装好的便捷 API，减少样板代码。复杂交互可自定义 `data` 的入口函数、类型参数与函数参数。

```ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const alice = Account.generate();

const tx = await aptos.transaction.build.simple({
  sender: alice.accountAddress,
  data: {
    function: "0x1::coin::transfer",
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    functionArguments: ["0x...recipient", 1000],
  },
});

// 可选：模拟
const [simulation] = await aptos.transaction.simulate.simple({ signer: alice, transaction: tx });

// 提交
const committed = await aptos.signAndSubmitTransaction({ signer: alice, transaction: tx });
await aptos.waitForTransaction({ transactionHash: committed.hash });
```

```ts
// 便捷转账 API（封装了简单交易）
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const alice = Account.generate();
const transaction = await aptos.transferCoinTransaction({ sender: alice, recipient: "0x...recipient", amount: 1000 });
const pending = await aptos.signAndSubmitTransaction({ signer: alice, transaction });
await aptos.waitForTransaction({ transactionHash: pending.hash });
```

## 进阶专题（建议掌握）

- 账户认证与密钥：默认 Legacy Ed25519；可启用统一认证（Single Sender）。
- 交易流程细化：构建→模拟→签名→提交→等待确认，失败用日志与重试策略处理。
- 只读视图类型化：为返回数据建模，降低数据处理的隐式错误。
- 索引器与分页：GraphQL 查询结合分页与缓存，避免速率限制与全量拉取。

示例：统一认证与错误处理

```ts
import { Aptos, AptosConfig, Network, Account, SigningSchemeInput } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
// 启用统一认证（非 Legacy Ed25519）
const alice = Account.generate({ scheme: SigningSchemeInput.Ed25519, legacy: false });

const tx = await aptos.transaction.build.simple({
  sender: alice.accountAddress,
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: ["0x...recipient", 100],
  },
});

try {
  const pending = await aptos.signAndSubmitTransaction({ signer: alice, transaction: tx });
  await aptos.waitForTransaction({ transactionHash: pending.hash });
} catch (e) {
  console.error("交易失败", e);
}
```

### 多签账户（Multisig v2）

- 适用场景：高额资产操作、协议治理、团队协作审批
- 基本要素：多签地址、提案交易、签名收集、聚合提交与执行
- 实操要点：先构建目标交易的负载，各签名方独立产生签名，再由聚合者提交执行并跟踪结果

示例：创建多签账户与提案、审批、执行

```ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const owner1 = Account.generate();
const owner2 = Account.generate();

const create = await aptos.transaction.build.simple({
  sender: owner1.accountAddress,
  data: {
    function: "0x1::multisig_account::create_multisig_account",
    functionArguments: [[owner1.accountAddress, owner2.accountAddress], 2],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner1, transaction: create });

const propose = await aptos.transaction.build.simple({
  sender: owner1.accountAddress,
  data: {
    function: "0x1::multisig_account::create_transaction",
    functionArguments: ["0x1::coin::transfer", ["0x1::aptos_coin::AptosCoin"], ["0x...recipient", 1000]],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner1, transaction: propose });

const approve = await aptos.transaction.build.simple({
  sender: owner2.accountAddress,
  data: {
    function: "0x1::multisig_account::approve_transaction",
    functionArguments: [1],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner2, transaction: approve });

const execute = await aptos.transaction.build.simple({
  sender: owner1.accountAddress,
  data: {
    function: "0x1::multisig_account::execute_transaction",
    functionArguments: [1],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner1, transaction: execute });
```

### 资源账户（Resource Account）

- 适用场景：模块与资源的独立托管、跨团队协作、权限隔离
- 核心能力：以资源账户为载体部署模块、持有资源，与个人账户分离管理
- 实操要点：先按模块接口创建资源账户，再将业务模块与状态挂载到该账户下，统一以入口函数进行读写与升级

示例：创建资源账户并在其名下执行入口函数

```ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const admin = Account.generate();

const createRa = await aptos.transaction.build.simple({
  sender: admin.accountAddress,
  data: {
    function: "0x1::resource_account::create_resource_account",
    functionArguments: ["seed"],
  },
});
await aptos.signAndSubmitTransaction({ signer: admin, transaction: createRa });

const call = await aptos.transaction.build.simple({
  sender: admin.accountAddress,
  data: {
    function: "0xYOURADDR::app_module::init_under_resource",
    functionArguments: ["config"],
  },
});
await aptos.signAndSubmitTransaction({ signer: admin, transaction: call });
```

## View 函数

只读函数无需支付费用，不改变链上状态，适合查询余额、配置与派生数据。建议为结果定义明确的类型，使用 `viewJson<[T]>` 获取结构化返回，便于下游处理。

```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

type Balance = number;
const [balance] = await aptos.viewJson<[Balance]>({
  payload: {
    function: "0x1::coin::balance",
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    functionArguments: ["0x...address"],
  },
});
```

## Token 与 NFT（自定义模块）

自定义资产通常通过 Move 模块暴露入口函数，例如创建集合、铸造 NFT 等。TS SDK 以入口函数为中心构建交易，按顺序提交操作。模块地址与函数名需替换为实际部署地址与接口。

```ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const owner = Account.generate();

// 创建集合
const tx1 = await aptos.transaction.build.simple({
  sender: owner.accountAddress,
  data: {
    function: "0xYOURADDR::my_nft::create_collection",
    functionArguments: ["MyCollection", "Description", "https://example.com/metadata"],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner, transaction: tx1 });

// 铸造 NFT
const tx2 = await aptos.transaction.build.simple({
  sender: owner.accountAddress,
  data: {
    function: "0xYOURADDR::my_nft::mint_token",
    functionArguments: ["MyNFT #2", "https://example.com/nft2"],
  },
});
await aptos.signAndSubmitTransaction({ signer: owner, transaction: tx2 });
```

## Indexer GraphQL

索引服务用于高层数据查询与聚合，适合检索账户、交易与事件。示例使用 `fetch` 调用 GraphQL 端点，生产中建议添加分页、重试与类型约束，并注意速率限制与缓存策略。

```ts
const endpoint = "https://indexer.testnet.aptoslabs.com/v1/graphql";
const query = `query { accounts(limit: 5) { address } }`;
const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const data = await res.json();
```

## 钱包适配（React）

基于 AIP-62 标准的钱包适配为前端提供统一接口。通过 Provider 指定网络并自动连接历史钱包，使用 `signAndSubmitTransaction({ data })` 发起交易，必要时结合客户端 `waitForTransaction` 跟踪链上状态。

```tsx
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

function App() {
  return (
    <AptosWalletAdapterProvider autoConnect dappConfig={{ network: Network.TESTNET }}>
      <TransferButton />
    </AptosWalletAdapterProvider>
  );
}

function TransferButton() {
  const { connected, account, connect, disconnect, signAndSubmitTransaction } = useWallet();
  const data = {
    function: "0x1::coin::transfer",
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    functionArguments: [account?.address?.toString(), 1000],
  };
  if (!connected) return <button onClick={() => connect()}>连接钱包</button>;
  return (
    <div>
      <div>当前账户: {account?.address?.toString()}</div>
      <button
        onClick={async () => {
          const res = await signAndSubmitTransaction({ data });
          console.log(res.hash);
        }}
      >发送</button>
      <button onClick={disconnect}>断开</button>
    </div>
  );
}
```

## 最佳实践

围绕构建→模拟→签名→提交→等待确认的闭环，完善错误捕获与日志记录；复杂模块交互优先封装为可复用函数，减少重复代码与参数错误。

- 交易前模拟，检查 gas 与失败原因
- 使用 `waitForTransaction` 等待确认
- 捕获错误并记录 `vm_status`
- 自定义模块优先使用 BCS 构造
- 生产环境使用钱包或后端签名服务

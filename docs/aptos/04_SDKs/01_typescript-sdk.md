# TypeScript SDK

> 使用 Aptos TypeScript SDK 进行账户、交易、视图函数与索引查询

导航： [公链概述](../01_intro.md) · [快速开始](../02_quick-start.md)

## 概览

- `AptosClient` 连接节点、查询资源、生成/提交/模拟交易
- `FaucetClient` 测试网水龙头，为地址发放测试币
- `AptosAccount` 本地账户与签名
- `TxnBuilderTypes` 与 `BCS` 构造 BCS 交易负载

## 初始化与查询

```ts
import { AptosClient } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const resources = await client.getAccountResources("0x1");
```

## 账户与转账

```ts
import { AptosClient, FaucetClient, AptosAccount } from "aptos";

const NODE = "https://fullnode.testnet.aptoslabs.com/v1";
const FAUCET = "https://faucet.testnet.aptoslabs.com";

const client = new AptosClient(NODE);
const faucet = new FaucetClient(NODE, FAUCET);
const account = new AptosAccount();
await faucet.fundAccount(account.address(), 1000000);

const payload = {
  type: "entry_function_payload",
  function: "0x1::coin::transfer",
  type_arguments: ["0x1::aptos_coin::AptosCoin"],
  arguments: ["0x...recipient", 1000],
};

const txnReq = await client.generateTransaction(account.address(), payload);
const signed = await client.signTransaction(account, txnReq);
const res = await client.submitTransaction(signed);
await client.waitForTransaction(res.hash);
```

## 交易（JSON 与 BCS）

```ts
import { AptosClient, AptosAccount } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const account = new AptosAccount();
const payload = {
  type: "entry_function_payload",
  function: "0x1::coin::transfer",
  type_arguments: ["0x1::aptos_coin::AptosCoin"],
  arguments: ["0x...recipient", 1000],
};
const req = await client.generateTransaction(account.address(), payload);
const sim = await client.simulateTransaction(account, req);
```

```ts
import { AptosClient, AptosAccount, TxnBuilderTypes, BCS } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const account = new AptosAccount();
const entryFunction = new TxnBuilderTypes.EntryFunction(
  TxnBuilderTypes.ModuleId.fromStr("0x1::coin"),
  new TxnBuilderTypes.Identifier("transfer"),
  [TxnBuilderTypes.TypeTagStruct.fromStr("0x1::aptos_coin::AptosCoin")],
  [
    BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex("0x...recipient")),
    BCS.bcsSerializeUint64(1000),
  ]
);
const rawTxn = await client.generateRawTransaction(account.address(), entryFunction);
const signed = await client.signTransaction(account, rawTxn);
const res = await client.submitTransaction(signed);
await client.waitForTransaction(res.hash);
```

## View 函数

```ts
import { AptosClient } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const result = await client.view({
  function: "0x1::coin::balance",
  type_arguments: ["0x1::aptos_coin::AptosCoin"],
  arguments: ["0x...address"],
});
```

## Token 与 NFT（自定义模块）

```ts
import { AptosClient, AptosAccount } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const account = new AptosAccount();
const createCollection = {
  type: "entry_function_payload",
  function: "0xYOURADDR::my_nft::create_collection",
  type_arguments: [],
  arguments: ["MyCollection", "Description", "https://example.com/metadata"],
};
const req1 = await client.generateTransaction(account.address(), createCollection);
const signed1 = await client.signTransaction(account, req1);
const res1 = await client.submitTransaction(signed1);
await client.waitForTransaction(res1.hash);
```

```ts
import { AptosClient, AptosAccount, TxnBuilderTypes, BCS } from "aptos";
const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
const account = new AptosAccount();
const entryFunction = new TxnBuilderTypes.EntryFunction(
  TxnBuilderTypes.ModuleId.fromStr("0xYOURADDR::my_nft"),
  new TxnBuilderTypes.Identifier("mint_token"),
  [],
  [BCS.bcsSerializeStr("MyNFT #2"), BCS.bcsSerializeStr("https://example.com/nft2")]
);
const rawTxn = await client.generateRawTransaction(account.address(), entryFunction);
const signed = await client.signTransaction(account, rawTxn);
const res = await client.submitTransaction(signed);
await client.waitForTransaction(res.hash);
```

## Indexer GraphQL

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

```tsx
import { AptosWalletProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { PontemWalletAdapter, PetraWallet } from "@aptos-labs/wallet-adapter-wallets";

function App() {
  const wallets = [new PetraWallet(), new PontemWalletAdapter()];
  return (
    <AptosWalletProvider plugins={wallets} autoConnect>
      <TransferButton />
    </AptosWalletProvider>
  );
}

function TransferButton() {
  const { connected, account, connect, disconnect, signAndSubmitTransaction } = useWallet();
  const payload = {
    type: "entry_function_payload",
    function: "0x1::coin::transfer",
    type_arguments: ["0x1::aptos_coin::AptosCoin"],
    arguments: ["0x...recipient", 1000],
  };
  if (!connected) return <button onClick={connect}>连接钱包</button>;
  return (
    <div>
      <div>当前账户: {account?.address?.toString()}</div>
      <button onClick={async () => {
        const res = await signAndSubmitTransaction({ payload });
        console.log(res.hash);
      }}>发送</button>
      <button onClick={disconnect}>断开</button>
    </div>
  );
}
```

## 最佳实践

- 交易前模拟，检查 gas 与失败原因
- 使用 `waitForTransaction` 等待确认
- 捕获错误并记录 `vm_status`
- 自定义模块优先使用 BCS 构造
- 生产环境使用钱包或后端签名服务

返回： [公链概述](../01_intro.md) · [快速开始](../02_quick-start.md)


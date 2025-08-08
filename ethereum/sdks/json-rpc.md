# JSON-RPC

> Ethereum 节点（如 Geth、Erigon、Nethermind 等）提供了一套基于 HTTP/WebSocket 的 JSON-RPC 接口，用于客户端与区块链进行交互。

以下为主流 `eth_`、`net_`、`web3_`、`debug_` 等 JSON-RPC 方法，涵盖区块、交易、账户、合约调用、调试与网络信息等场景。

**基本格式:**

```text
{
  "jsonrpc": "2.0",
  "method": "eth_METHOD_NAME",
  "params": [...],
  "id": 1
}
```

**请求示例：**

```text
curl -X POST https://eth.llamarpc.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getBalance",
    "params":["0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "latest"],
    "id":1
  }'
```

**返回结果：**

```text
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": ...
}
```

## 区块相关

| 方法                                        | 描述                | 参数说明                                   |
|-------------------------------------------|-------------------|----------------------------------------|
| `eth_blockNumber`                         | 返回最新区块编号          | `[]`                                   |
| `eth_getBlockByNumber`                    | 根据区块号获取区块信息       | `["latest"/区块编号, 是否包含交易详情 true/false]` |
| `eth_getBlockByHash`                      | 根据区块哈希获取完整区块数据。   | `["区块哈希", 是否包含交易详情 true/false]`        |
| `eth_getUncleByBlockNumberAndIndex`       | 获取叔块信息            | `[区块编号, 叔块索引]`                         |
| `eth_getBlockTransactionCountByNumber`    | 获取区块中交易数量（按编号）    | `[区块编号]`                               |
| `eth_getBlockTransactionCountByHash`      | 获取区块中交易数量（按哈希）    | `[区块哈希]`                               |
| `eth_getTransactionByBlockNumberAndIndex` | 获取区块中指定位置的交易（按编号） | `[区块编号, 交易索引]`                         |
| `eth_getTransactionByBlockHashAndIndex`   | 获取区块中指定位置的交易（按哈希） | `[区块哈希, 交易索引]`                         |

:::code-group

```js [eth_blockNumber]
const url = "https://eth.llamarpc.com";
const json = {
  jsonrpc: "2.0",
  method: "eth_blockNumber",
  params: [],
  id: 1,
};

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(json),
})
  .then((res) => res.json())
  .then((res) => {
    console.log("区块号", parseInt(res.result, 16));
  });
```

```js [eth_getBlockByNumber]
const json = {
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", true], // 是否返回完整交易对象（true）或只返回交易哈希（false）
  id: 1,
};
```

```js [eth_getBlockByHash]
// 根据区块哈希：block hash（不是交易哈希）
const json = {
  jsonrpc: "2.0",
  method: "eth_getBlockByHash",
  params: ["0xa25ea5f3741da337f214b103b935943d28d14e5e43360917c95c968a894c927d", true], // 是否返回完整交易对象（true）或只返回交易哈希（false）
  id: 1,
};
```

:::

## 交易相关

| 方法                          | 描述          | 参数说明                              |
|-----------------------------|-------------|-----------------------------------|
| `eth_sendRawTransaction`    | 发送签名交易      | `[签名交易数据]`                        |
| `eth_getTransactionByHash`  | 获取交易详情      | `[交易哈希]`                          |
| `eth_getTransactionReceipt` | 获取交易收据      | `[交易哈希]`                          |
| `eth_getTransactionCount`   | 获取地址的 nonce | `[地址, latest/pending]`            |
| `eth_estimateGas`           | 估算交易 gas    | `[交易对象]`（包含 to/from/value/data 等） |


## 账户与余额

| 方法               | 描述                           | 参数说明                   |
|------------------|------------------------------|------------------------|
| `eth_getBalance` | 查询地址余额                       | `[地址, latest]`         |
| `eth_getCode`    | 获取地址的合约字节码                   | `[地址, latest]`         |
| `eth_accounts`   | 获取本地节点钱包地址                   | `[]`                   |
| `eth_chainId`    | 获取当前链 ID                     | `[]`                   |
| `eth_syncing`    | 节点是否在同步中                     | `[]` 返回 false 或同步状态对象  |
| `eth_getProof`   | 获取账户及存储槽 Merkle 证明（EIP-1186） | `[地址, [slot], latest]` |

## 合约调用

| 方法                 | 描述     | 参数说明                   |
|--------------------|--------|------------------------|
| `eth_call`         | 调用只读方法 | `[交易对象, latest]`       |
| `eth_getStorageAt` | 查询存储槽值 | `[地址, slot位置, latest]` |

## Gas 相关

| 方法               | 描述             | 参数说明                     |
|------------------|----------------|--------------------------|
| `eth_gasPrice`   | 获取当前 gas price | `[]`                     |
| `eth_feeHistory` | 获取历史 gas 数据    | `[区块数, "latest", 百分位数组]` |

## 日志与事件

| 方法                     | 描述        | 参数说明                                         |
|------------------------|-----------|----------------------------------------------|
| `eth_getLogs`          | 查询事件日志    | `[过滤器对象，如 address/topics/fromBlock/toBlock]` |
| `eth_newFilter`        | 创建日志过滤器   | `[过滤器对象]`                                    |
| `eth_getFilterChanges` | 获取过滤器日志变化 | `[filterId]`                                 |
| `eth_uninstallFilter`  | 移除日志过滤器   | `[filterId]`                                 |

## 网络信息

| 方法              | 描述               | 参数说明 |
|-----------------|------------------|------|
| `net_version`   | 获取网络 ID（如 1 为主网） | `[]` |
| `net_peerCount` | 获取已连接的对等节点数量     | `[]` |
| `net_listening` | 节点是否在监听新连接       | `[]` |

## Web3 基础方法

| 方法                   | 描述                    | 参数说明            |
|----------------------|-----------------------|-----------------|
| `web3_clientVersion` | 获取节点客户端版本             | `[]`            |
| `web3_sha3`          | 对数据进行 Keccak-256 哈希运算 | `["0x十六进制字符串"]` |

## 调试方法（debug_ 系列，仅本地节点支持）

| 方法                       | 描述                | 参数说明                 |
|--------------------------|-------------------|----------------------|
| `debug_traceTransaction` | 回溯交易执行过程（需开启调试模块） | `[交易哈希]`             |
| `debug_getRawReceipts`   | 获取原始交易回执（高级调试用途）  | `[区块哈希]`             |
| `debug_getRawHeader`     | 获取区块原始头部数据        | `[区块哈希]`             |
| `debug_getRawBlock`      | 获取原始区块数据（RLP 编码）  | `[区块哈希]`             |
| `debug_accountRange`     | 遍历状态树账户范围（仅限某些节点） | `[区块标识, 起始地址, 限制数量]` |

> [!WARNING] 警告
> `debug_` 方法通常只对本地 Geth 节点开放，远程服务如 Infura 不支持。




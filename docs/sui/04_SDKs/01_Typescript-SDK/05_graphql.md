# GraphQL Transport

> 使用 GraphQL 查询 Sui 链上数据的强大工具

> [!IMPORTANT] 本节重点
> 1. 什么是 GraphQL Transport？有什么优势？
> 2. 如何配置和使用 GraphQL 客户端？
> 3. 如何编写 GraphQL 查询？
> 4. 如何进行复杂的数据查询和过滤？
> 5. 与 JSON-RPC 有什么区别？

## 什么是 GraphQL Transport？

**@mysten/graphql-transport** 是 Sui 提供的 GraphQL 查询层，允许你使用 GraphQL 而不是传统的 JSON-RPC 来查询链上数据。

### GraphQL vs JSON-RPC

| 特性 | GraphQL | JSON-RPC |
|------|---------|----------|
| 查询灵活性 | ✅ 强大 | ⚠️ 有限 |
| 数据获取 | ✅ 精确控制 | ⚠️ 固定格式 |
| 多资源查询 | ✅ 一次请求 | ❌ 多次请求 |
| 过滤和排序 | ✅ 原生支持 | ⚠️ 有限 |
| 类型安全 | ✅ 强类型 | ⚠️ 弱类型 |
| 学习曲线 | ⚠️ 较陡 | ✅ 简单 |

### 使用场景

- 📊 **复杂数据查询**: 需要灵活查询和过滤
- 🔍 **数据分析**: 链上数据分析和统计
- 📱 **高级应用**: 需要精确控制数据结构
- 🎯 **性能优化**: 减少网络请求次数
- 🔗 **关联查询**: 查询相关联的多个对象

## 安装

```bash
npm install @mysten/graphql-transport @mysten/sui.js graphql
```

## 基础配置

### 创建 GraphQL 客户端

```typescript
import { SuiGraphQLClient } from '@mysten/graphql-transport';
import { GraphQLClient } from 'graphql-request';

// 方式 1: 使用 SuiGraphQLClient
const client = new SuiGraphQLClient({
  url: 'https://sui-testnet.mystenlabs.com/graphql',
});

// 方式 2: 使用 graphql-request
const graphqlClient = new GraphQLClient(
  'https://sui-testnet.mystenlabs.com/graphql',
  {
    headers: {
      'Content-Type': 'application/json',
    },
  }
);
```

### 网络端点

```typescript
const GRAPHQL_ENDPOINTS = {
  mainnet: 'https://sui-mainnet.mystenlabs.com/graphql',
  testnet: 'https://sui-testnet.mystenlabs.com/graphql',
  devnet: 'https://sui-devnet.mystenlabs.com/graphql',
};

// 选择网络
const client = new SuiGraphQLClient({
  url: GRAPHQL_ENDPOINTS.testnet,
});
```

## 基础查询

### 查询对象

```typescript
import { gql } from 'graphql-request';

// 定义查询
const GET_OBJECT = gql`
  query GetObject($id: SuiAddress!) {
    object(address: $id) {
      address
      version
      digest
      owner {
        __typename
        ... on AddressOwner {
          owner {
            address
          }
        }
      }
      content {
        __typename
        type {
          repr
        }
        json
      }
    }
  }
`;

// 执行查询
async function getObject(objectId: string) {
  const result = await graphqlClient.request(GET_OBJECT, {
    id: objectId,
  });

  console.log('对象信息:', result.object);
  return result.object;
}
```

### 查询多个对象

```typescript
const GET_MULTIPLE_OBJECTS = gql`
  query GetObjects($ids: [SuiAddress!]!) {
    objects(addresses: $ids) {
      nodes {
        address
        version
        owner {
          __typename
        }
        content {
          type {
            repr
          }
        }
      }
    }
  }
`;

async function getMultipleObjects(objectIds: string[]) {
  const result = await graphqlClient.request(GET_MULTIPLE_OBJECTS, {
    ids: objectIds,
  });

  return result.objects.nodes;
}
```

### 查询地址余额

```typescript
const GET_BALANCE = gql`
  query GetBalance($address: SuiAddress!) {
    address(address: $address) {
      address
      balance {
        coinType {
          repr
        }
        coinObjectCount
        totalBalance
      }
    }
  }
`;

async function getBalance(address: string) {
  const result = await graphqlClient.request(GET_BALANCE, {
    address,
  });

  return result.address.balance;
}
```

### 查询所有代币余额

```typescript
const GET_ALL_BALANCES = gql`
  query GetAllBalances($address: SuiAddress!) {
    address(address: $address) {
      address
      balances {
        nodes {
          coinType {
            repr
          }
          coinObjectCount
          totalBalance
        }
      }
    }
  }
`;

async function getAllBalances(address: string) {
  const result = await graphqlClient.request(GET_ALL_BALANCES, {
    address,
  });

  return result.address.balances.nodes;
}
```

## 高级查询

### 分页查询拥有的对象

```typescript
const GET_OWNED_OBJECTS = gql`
  query GetOwnedObjects(
    $address: SuiAddress!
    $first: Int
    $after: String
    $filter: ObjectFilter
  ) {
    address(address: $address) {
      objects(first: $first, after: $after, filter: $filter) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          address
          version
          digest
          content {
            type {
              repr
            }
            json
          }
          display {
            key
            value
            error
          }
        }
      }
    }
  }
`;

async function getOwnedObjects(
  address: string,
  options: {
    first?: number;
    after?: string;
    type?: string;
  } = {}
) {
  const filter = options.type
    ? {
        type: options.type,
      }
    : undefined;

  const result = await graphqlClient.request(GET_OWNED_OBJECTS, {
    address,
    first: options.first || 10,
    after: options.after,
    filter,
  });

  return result.address.objects;
}

// 使用示例：分页获取所有对象
async function getAllOwnedObjects(address: string) {
  let hasNextPage = true;
  let cursor: string | null = null;
  const allObjects = [];

  while (hasNextPage) {
    const result = await getOwnedObjects(address, {
      first: 50,
      after: cursor || undefined,
    });

    allObjects.push(...result.nodes);
    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  return allObjects;
}
```

### 查询交易历史

```typescript
const GET_TRANSACTION_BLOCKS = gql`
  query GetTransactionBlocks(
    $address: SuiAddress
    $first: Int
    $after: String
    $filter: TransactionBlockFilter
  ) {
    transactionBlocks(
      first: $first
      after: $after
      filter: $filter
      scanLimit: 100
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        digest
        sender {
          address
        }
        gasInput {
          gasSponsor {
            address
          }
          gasPrice
          gasBudget
        }
        effects {
          status
          timestamp
          gasEffects {
            gasUsed
            gasSummary {
              computationCost
              storageCost
              storageRebate
            }
          }
        }
      }
    }
  }
`;

async function getTransactionHistory(
  address: string,
  options: {
    first?: number;
    after?: string;
  } = {}
) {
  const result = await graphqlClient.request(GET_TRANSACTION_BLOCKS, {
    address,
    first: options.first || 20,
    after: options.after,
    filter: {
      signAddress: address,
    },
  });

  return result.transactionBlocks;
}
```

### 查询事件

```typescript
const GET_EVENTS = gql`
  query GetEvents(
    $filter: EventFilter!
    $first: Int
    $after: String
  ) {
    events(first: $first, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        sendingModule {
          package {
            address
          }
          name
        }
        type {
          repr
        }
        sender {
          address
        }
        timestamp
        json
        bcs
      }
    }
  }
`;

async function getEvents(
  packageId: string,
  moduleName: string,
  options: {
    first?: number;
    after?: string;
  } = {}
) {
  const result = await graphqlClient.request(GET_EVENTS, {
    first: options.first || 20,
    after: options.after,
    filter: {
      emittingModule: {
        package: packageId,
        module: moduleName,
      },
    },
  });

  return result.events;
}
```

### 复杂过滤查询

```typescript
const GET_FILTERED_OBJECTS = gql`
  query GetFilteredObjects($address: SuiAddress!, $filter: ObjectFilter!) {
    address(address: $address) {
      objects(filter: $filter) {
        nodes {
          address
          version
          content {
            type {
              repr
            }
            json
          }
        }
      }
    }
  }
`;

// 查询特定类型的对象
async function getObjectsByType(address: string, objectType: string) {
  const result = await graphqlClient.request(GET_FILTERED_OBJECTS, {
    address,
    filter: {
      type: objectType,
    },
  });

  return result.address.objects.nodes;
}

// 查询包含特定字段的对象
async function getObjectsWithField(
  address: string,
  fieldName: string,
  fieldValue: any
) {
  const result = await graphqlClient.request(GET_FILTERED_OBJECTS, {
    address,
    filter: {
      objectKeys: [
        {
          name: fieldName,
          value: fieldValue,
        },
      ],
    },
  });

  return result.address.objects.nodes;
}
```

## 动态字段查询

### 查询动态字段

```typescript
const GET_DYNAMIC_FIELDS = gql`
  query GetDynamicFields($objectId: SuiAddress!, $first: Int, $after: String) {
    object(address: $objectId) {
      dynamicFields(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name {
            type {
              repr
            }
            json
            bcs
          }
          value {
            ... on MoveValue {
              type {
                repr
              }
              json
              bcs
            }
            ... on MoveObject {
              address
              content {
                type {
                  repr
                }
                json
              }
            }
          }
        }
      }
    }
  }
`;

async function getDynamicFields(objectId: string) {
  const result = await graphqlClient.request(GET_DYNAMIC_FIELDS, {
    objectId,
    first: 100,
  });

  return result.object.dynamicFields.nodes;
}
```

### 查询特定动态字段

```typescript
const GET_DYNAMIC_FIELD = gql`
  query GetDynamicField($objectId: SuiAddress!, $name: DynamicFieldName!) {
    object(address: $objectId) {
      dynamicField(name: $name) {
        name {
          type {
            repr
          }
          json
        }
        value {
          ... on MoveValue {
            type {
              repr
            }
            json
          }
          ... on MoveObject {
            address
            content {
              json
            }
          }
        }
      }
    }
  }
`;

async function getDynamicField(objectId: string, fieldName: any) {
  const result = await graphqlClient.request(GET_DYNAMIC_FIELD, {
    objectId,
    name: {
      type: 'u64', // 或其他类型
      value: fieldName,
    },
  });

  return result.object.dynamicField;
}
```

## 查询验证者和网络信息

### 查询验证者集合

```typescript
const GET_VALIDATORS = gql`
  query GetValidators($epoch: Int) {
    epoch(id: $epoch) {
      epochId
      validators {
        nodes {
          address {
            address
          }
          name
          description
          imageUrl
          votingPower
          commissionRate
          stakingPoolActivationEpoch
          stakingPoolSuiBalance
        }
      }
    }
  }
`;

async function getValidators(epochId?: number) {
  const result = await graphqlClient.request(GET_VALIDATORS, {
    epoch: epochId,
  });

  return result.epoch.validators.nodes;
}
```

### 查询网络参数

```typescript
const GET_PROTOCOL_CONFIG = gql`
  query GetProtocolConfig($version: Int) {
    protocolConfig(protocolVersion: $version) {
      protocolVersion
      configs {
        key
        value
      }
      featureFlags {
        key
        value
      }
    }
  }
`;

async function getProtocolConfig(version?: number) {
  const result = await graphqlClient.request(GET_PROTOCOL_CONFIG, {
    version,
  });

  return result.protocolConfig;
}
```

## TypeScript 类型生成

### 使用 GraphQL Code Generator

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
```

创建 `codegen.yml`:

```yaml
schema: https://sui-testnet.mystenlabs.com/graphql
documents: './src/**/*.graphql'
generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
    config:
      scalars:
        SuiAddress: string
        BigInt: string
```

生成类型：

```bash
npx graphql-codegen
```

使用生成的类型：

```typescript
import { GetObjectQuery, GetObjectQueryVariables } from './generated/graphql';

async function getObjectTyped(objectId: string): Promise<GetObjectQuery> {
  const result = await graphqlClient.request<
    GetObjectQuery,
    GetObjectQueryVariables
  >(GET_OBJECT, {
    id: objectId,
  });

  return result;
}
```

## React 集成

### 使用 React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';

const GET_BALANCE = gql`
  query GetBalance($address: SuiAddress!) {
    address(address: $address) {
      balance {
        totalBalance
        coinType {
          repr
        }
      }
    }
  }
`;

function useBalance(address: string) {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: async () => {
      const result = await graphqlClient.request(GET_BALANCE, { address });
      return result.address.balance;
    },
    enabled: !!address,
    refetchInterval: 10000, // 每 10 秒刷新
  });
}

// 使用
function BalanceDisplay({ address }: { address: string }) {
  const { data, isLoading, error } = useBalance(address);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <p>余额: {Number(data.totalBalance) / 1_000_000_000} SUI</p>
    </div>
  );
}
```

### 分页 Hook

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useOwnedObjects(address: string) {
  return useInfiniteQuery({
    queryKey: ['owned-objects', address],
    queryFn: async ({ pageParam }) => {
      const result = await graphqlClient.request(GET_OWNED_OBJECTS, {
        address,
        first: 20,
        after: pageParam,
      });
      return result.address.objects;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    enabled: !!address,
  });
}

// 使用
function ObjectsList({ address }: { address: string }) {
  const { data, fetchNextPage, hasNextPage, isLoading } =
    useOwnedObjects(address);

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      {data?.pages.map((page) =>
        page.nodes.map((obj) => (
          <div key={obj.address}>
            <p>对象 ID: {obj.address}</p>
          </div>
        ))
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>加载更多</button>
      )}
    </div>
  );
}
```

## 性能优化

### 批量查询

```typescript
// 一次查询多个资源
const BATCH_QUERY = gql`
  query BatchQuery($address: SuiAddress!, $objectId: SuiAddress!) {
    address(address: $address) {
      balance {
        totalBalance
      }
      objects(first: 10) {
        nodes {
          address
        }
      }
    }
    object(address: $objectId) {
      content {
        json
      }
    }
  }
`;

async function batchQuery(address: string, objectId: string) {
  const result = await graphqlClient.request(BATCH_QUERY, {
    address,
    objectId,
  });

  return {
    balance: result.address.balance,
    objects: result.address.objects.nodes,
    object: result.object,
  };
}
```

### 字段选择优化

```typescript
// ❌ 查询所有字段
const INEFFICIENT_QUERY = gql`
  query GetObject($id: SuiAddress!) {
    object(address: $id) {
      address
      version
      digest
      owner {
        # ... 大量字段
      }
      content {
        # ... 大量字段
      }
      # ...
    }
  }
`;

// ✅ 只查询需要的字段
const EFFICIENT_QUERY = gql`
  query GetObject($id: SuiAddress!) {
    object(address: $id) {
      address
      content {
        type {
          repr
        }
      }
    }
  }
`;
```

### 使用 DataLoader

```typescript
import DataLoader from 'dataloader';

const objectLoader = new DataLoader(async (ids: readonly string[]) => {
  const result = await graphqlClient.request(GET_MULTIPLE_OBJECTS, {
    ids: [...ids],
  });

  const objectMap = new Map(
    result.objects.nodes.map((obj: any) => [obj.address, obj])
  );

  return ids.map((id) => objectMap.get(id) || null);
});

// 使用
const object1 = await objectLoader.load('0x1...');
const object2 = await objectLoader.load('0x2...');
// 实际只会发送一次批量请求
```

## 最佳实践

### 1. 错误处理

```typescript
import { ClientError } from 'graphql-request';

async function safeQuery<T>(
  query: string,
  variables?: any
): Promise<T | null> {
  try {
    const result = await graphqlClient.request<T>(query, variables);
    return result;
  } catch (error) {
    if (error instanceof ClientError) {
      console.error('GraphQL 错误:', error.response.errors);
    } else {
      console.error('网络错误:', error);
    }
    return null;
  }
}
```

### 2. 查询缓存

```typescript
const queryCache = new Map<string, { data: any; expiry: number }>();

async function cachedQuery<T>(
  query: string,
  variables: any,
  ttl = 60000
): Promise<T> {
  const key = JSON.stringify({ query, variables });
  const cached = queryCache.get(key);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await graphqlClient.request<T>(query, variables);
  queryCache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });

  return data;
}
```

### 3. 分页处理

```typescript
async function fetchAllPages<T>(
  query: string,
  variables: any,
  extractNodes: (data: any) => { nodes: T[]; pageInfo: any }
) {
  let hasNextPage = true;
  let cursor: string | null = null;
  const allNodes: T[] = [];

  while (hasNextPage) {
    const result = await graphqlClient.request(query, {
      ...variables,
      after: cursor,
    });

    const { nodes, pageInfo } = extractNodes(result);
    allNodes.push(...nodes);

    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  return allNodes;
}
```

## 常见问题

### Q1: GraphQL 和 JSON-RPC 哪个更快？

**A:** 取决于使用场景：
- 简单查询：JSON-RPC 可能更快
- 复杂查询：GraphQL 通常更高效
- 多资源查询：GraphQL 显著减少请求次数

### Q2: 如何处理大量数据的分页？

**A:** 使用 `scanLimit` 参数并合理设置 `first` 值：

```typescript
const result = await graphqlClient.request(QUERY, {
  first: 50,
  scanLimit: 1000, // 最多扫描 1000 个对象
});
```

### Q3: GraphQL 支持订阅吗？

**A:** 目前 Sui GraphQL 主要支持查询（Query），订阅功能在开发中。

### Q4: 如何调试 GraphQL 查询？

**A:** 使用 GraphQL Playground 或 GraphiQL：
- Testnet: `https://sui-testnet.mystenlabs.com/graphql`
- 浏览器中打开即可交互式测试

### Q5: 查询有速率限制吗？

**A:** 是的，建议：
- 使用缓存减少重复请求
- 批量查询而不是单独请求
- 合理设置轮询间隔

## 参考资源

- [Sui GraphQL 文档](https://docs.sui.io/guides/developer/graphql)
- [GraphQL 规范](https://graphql.org/)
- [graphql-request 文档](https://github.com/prisma-labs/graphql-request)
- [React Query 文档](https://tanstack.com/query/latest)

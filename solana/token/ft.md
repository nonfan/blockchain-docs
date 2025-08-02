# 同质化代币-FT

> 在 Solana 区块链中，同质化代币（如稳定币、治理代币等）使用的是由 **Solana Program Library（SPL）** 提供的 Token 程序模块，通常简称为
`spl-token`。
> 它是 Solana 上实现代币功能的标准协议，类似于以太坊的 **ERC-20** 标准，用于创建、转账、授权、销毁等代币操作。


**标准模块地址是：**

```text
Token Program v1:  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Token 2022 Program:  TokenzQd9iReCk1L66P7a6i8YQdhoU5eWj84wnm8iT
```

**开发者可以通过指令（Instruction）与该程序交互，实现：**

- *初始化代币（Mint）*
- *创建关联账户（Associated Token Account）*
- *铸造代币（Mint To）*
- *转账代币（Transfer）*
- *授权与撤销（Approve / Revoke）*
- *销毁代币（Burn）*

## 安装依赖

```bash
# 准备依赖安装: solana必要库
npm install @solana/web3.js @solana/spl-token

# solana钱包适配器
npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
```

```ts
import {Connection} from '@solana/web3.js';
import {useWallet} from '@solana/wallet-adapter-react';

// 建议：初始化连接时指定 RPC URL
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// 从 Wallet Adapter 中获取连接的钱包信息
const {publicKey, sendTransaction} = useWallet();
```

## 初始化代币（Mint）

> 创建一个新的代币合约（mint account），用于后续的铸造与分发。

:::code-group

```ts [DApp Kit]
import {Connection, Keypair, SystemProgram, Transaction} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import {useWallet} from '@solana/wallet-adapter-react';
import {createMint} from '@/api/mint.api';

// 假设你已经通过 useWallet 获取钱包连接状态
const {publicKey, sendTransaction} = useWallet();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// 1. 定义代币元数据
const decimals = 9;
const symbol = 'Solana USD';

// 2. 生成一个新的代币地址（mint）
const mint = Keypair.generate();

// 3. 获取区块信息和租金豁免 lamports
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
const lamports = await getMinimumBalanceForRentExemptMint(connection);

// 4. 创建 mint 账户（必须由用户钱包支付租金）
const createAccountInstruction = SystemProgram.createAccount({
  fromPubkey: publicKey,
  newAccountPubkey: mint.publicKey,
  space: MINT_SIZE,
  lamports,
  programId: TOKEN_2022_PROGRAM_ID,
});

// 5. 初始化 mint 设置代币精度和管理员（mint authority）
const initializeMintInstruction = createInitializeMintInstruction(
  mint.publicKey,
  decimals,
  publicKey,
  publicKey,
  TOKEN_2022_PROGRAM_ID,
);

// 6. 构建交易
const transaction = new Transaction().add(
  createAccountInstruction,
  initializeMintInstruction,
);
transaction.feePayer = publicKey;
transaction.recentBlockhash = blockhash;

// 7. 发送交易并签名（包含新生成的 mint Keypair）
const signature = await sendTransaction(transaction, connection, {
  signers: [mint],
});

// 8. 等待确认
await connection.confirmTransaction(
  {signature, blockhash, lastValidBlockHeight},
  'confirmed',
);

// 9. 可选：将代币信息保存至后端（便于管理）
const address = mint.publicKey.toString();
const authority = publicKey.toString();
await createMint({mintAddress: address, decimals, symbol, authority});
```

:::

## 创建关联账户（Associated Token Account）

> 在 Solana 中，创建关联账户（Associated Token Account, ATA） 是代币操作的基础步骤之一，用于将某个代币分配给某个用户地址。每个用户对每种代币只能有一个
> ATA，作用类似于 ERC-20 的余额记录表中的行。

> [!INFO] 提示
> 用户的 ATA 并不自动存在，必须先创建才能收款。大多数钱包（如 Phantom）会自动创建 ATA，当你首次接收代币时。你自己发币/转账时，需要在代码中显式创建
> ATA（如果未存在）。


:::code-group

```ts [DApp Kit]
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {PublicKey, Transaction} from '@solana/web3.js';

const {publicKey, sendTransaction} = useWallet();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// 1. 定义 mint 地址 和 接收者地址
const mint = new PublicKey('<Mint地址>');
const recipient = new PublicKey('<用户钱包地址>');

// 2. 计算该用户的 ATA 地址（是可预测的，不一定存在）
const ata = await getAssociatedTokenAddress(
  mint,
  recipient,
  false, // allowOwnerOffCurve: 是否支持非曲线地址，一般为 false
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// 3. 查询该 ATA 是否已存在
const accountInfo = await connection.getAccountInfo(ata);

const instructions = [];

if (!accountInfo) {
  // 如果 ATA 不存在，添加创建指令
  instructions.push(
    createAssociatedTokenAccountInstruction(
      publicKey,     // 费用支付者
      ata,           // 要创建的 ATA 地址
      recipient,     // 该 ATA 的所有者
      mint,          // 代币 mint
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
}

// 后续可以用这些 instructions 放入交易中一起发送
const tx = new Transaction().add(...instructions);
const signature = await sendTransaction(tx, connection);

```

:::

我们可以封装一个通用函数来检查并创建关联账户（ATA），从而在转账、铸造、授权等代币操作前自动处理 ATA 的存在问题。

**封装函数示例**：`ensureAssociatedTokenAccount`

```ts
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {Connection, PublicKey, TransactionInstruction} from '@solana/web3.js';

/**
 * 确保 Associated Token Account 存在（如果不存在则返回创建指令）
 * @param connection - Solana 链接
 * @param payer - 支付创建账户租金的地址
 * @param mint - 代币 Mint 地址
 * @param owner - 拥有者钱包地址
 * @returns 包含 ATA 地址和可选的创建指令（如果已存在则为 null）
 */
export async function ensureAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
): Promise<{
  ata: PublicKey;
  instruction: TransactionInstruction | null;
}> {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const accountInfo = await connection.getAccountInfo(ata);

  if (!accountInfo) {
    const instruction = createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    return {ata, instruction};
  }

  return {ata, instruction: null};
}
```

## 铸造代币（Mint To）

:::code-group

```ts [DApp Kit]
import {
  getAssociatedTokenAddress,
  createMintToInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {Transaction, PublicKey} from '@solana/web3.js';
import {ensureAssociatedTokenAccount} from './utils/ensureAssociatedTokenAccount';

const {publicKey, sendTransaction} = useWallet();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// 示例参数
const mint = new PublicKey('<Mint地址>');
const recipient = new PublicKey('<用户钱包地址>');
const decimals = 6; // 代币精度，比如 USDC 是 6
const amount = 100; // 你希望铸造的数量（人类可读形式，比如 100 个 USDC）

// 获取最近区块信息（必须用于交易）
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

// 初始化指令数组
const instructions = [];

// 调用 ensureAssociatedTokenAccount 工具，确保 recipient 拥有 ATA
const {ata, instruction} = await ensureAssociatedTokenAccount(
  connection,
  publicKey,   // payer：支付新账户租金的人
  mint,        // mint：代币地址
  recipient,   // owner：接收者地址
);

// 如果 ATA 不存在，则 instruction 存在，加入到交易中
if (instruction) instructions.push(instruction);

// 创建 MintTo 指令，将代币铸造到 ATA
instructions.push(
  createMintToInstruction(
    mint,               // 代币 mint 地址
    ata,                // 接收者的关联账户 ATA
    publicKey,          // 铸造权限（mintAuthority）
    amount * 10 ** decimals, // 实际铸造数量（需乘以精度）
    [],                 // 多签 signer，一般为空
    TOKEN_2022_PROGRAM_ID, // 使用的是 2022 代币标准
  ),
);

// 构造交易对象，加入所有指令
const tx = new Transaction({
  feePayer: publicKey,
  recentBlockhash: blockhash,
}).add(...instructions);

// 发送交易（前端钱包签名）
const signature = await sendTransaction(tx, connection);

// 等待交易被确认
await connection.confirmTransaction(
  {signature, blockhash, lastValidBlockHeight},
  'confirmed',
);
```

:::

## 转账代币（Transfer）

### 普通转账

:::code-group

```ts [DApp Kit]
const mint = new PublicKey('<Mint地址>');
const toOwner = new PublicKey('<接收者地址>');
const amount = BigInt("<数量> * 10 ** <decimals>");

// 计算 fromATA 和 toATA，确保 toATA 存在
const {ata: fromATA} = await ensureAssociatedTokenAccount(connection, publicKey, mint, publicKey);
const {ata: toATA, instruction} = await ensureAssociatedTokenAccount(connection, publicKey, mint, toOwner);

const instructions = [];
if (instruction) instructions.push(instruction); // 如果 toATA 不存在，先创建

// 构造转账指令
instructions.push(
  createTransferInstruction(fromATA, toATA, publicKey, amount, [], TOKEN_2022_PROGRAM_ID),
);

// 构建并发送交易
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
const tx = new Transaction({feePayer: publicKey, recentBlockhash: blockhash}).add(...instructions);
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');

```

:::

### 委托转账

:::code-group

```ts [DApp Kit]
const mint = new PublicKey('<Mint地址>');
const fromOwner = new PublicKey('<授权人地址>');
const toOwner = new PublicKey('<接收者地址>');
const amount = BigInt("<数量> * 10 ** <decimals>");

// 计算 fromATA 和 toATA，确保 toATA 存在
const {ata: fromATA} = await ensureAssociatedTokenAccount(connection, publicKey, mint, fromOwner);
const {ata: toATA, instruction} = await ensureAssociatedTokenAccount(connection, publicKey, mint, toOwner);

const fromATAInfo = await getAccount(connection, fromATA, 'confirmed', TOKEN_2022_PROGRAM_ID);

// 校验授权情况
const isDelegate = fromATAInfo.delegate && new PublicKey(fromATAInfo.delegate).equals(publicKey);
if (!isDelegate) throw new Error('未被授权');

const delegatedAmount = BigInt(fromATAInfo.delegatedAmount.toString());
if (delegatedAmount < amount) throw new Error('授权额度不足');

const instructions = [];
if (instruction) instructions.push(instruction);

// 构造转账指令（签名者为被授权人）
instructions.push(
  createTransferInstruction(fromATA, toATA, publicKey, amount, [], TOKEN_2022_PROGRAM_ID),
);

// 构建并发送交易
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
const tx = new Transaction({feePayer: publicKey, recentBlockhash: blockhash}).add(...instructions);
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');

```

:::

## 授权与撤销（Approve / Revoke）

> 在 Solana 的 SPL Token 模块中，授权（Approve）与撤销授权（Revoke）机制允许代币持有者委托第三方地址在限定额度内代表自己操作代币，如转账（Transfer）或销毁（Burn）。

### 授权（Approve）

授权让某个地址（称为 delegate）在代币持有者的账户上拥有指定数量的操作权限。

```ts [DApp Kit]
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createApproveInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {useWallet} from '@solana/wallet-adapter-react';
import {ensureAssociatedTokenAccount} from './utils/ensureATA';

// 初始化连接和钱包
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const {publicKey, sendTransaction} = useWallet();

const mint = new PublicKey('<Mint地址>');
const amount = BigInt(amount * 10 ** decimals);
const delegate = new PublicKey(delegateAddress);
const owner = publicKey!;

// 获取最近区块信息
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

// 获取或创建 Associated Token Account（ATA）
const {ata, instruction} = await ensureAssociatedTokenAccount(
  connection,
  owner,      // 支付者（也是 token 所有者）
  mint,       // 代币地址
  owner       // ATA 拥有者
);

// 创建 Approve 授权指令
const approveIx = createApproveInstruction(
  ata,        // 授权的 token 账户
  delegate,   // 被授权人地址
  owner,      // 签名者（账户拥有者）
  rawAmount,  // 授权额度
  [],         // 多签地址（无）
  TOKEN_2022_PROGRAM_ID
);

// 合并指令（如需创建 ATA，则放在前面）
const instructions = instruction ? [instruction, approveIx] : [approveIx];

// 构造并发送交易
const tx = new Transaction({
  recentBlockhash: blockhash,
  feePayer: owner,
}).add(...instructions);

const signature = await sendTransaction(tx, connection);

// 等待链上确认
await connection.confirmTransaction(
  {
    signature,
    blockhash,
    lastValidBlockHeight,
  },
  'confirmed'
);

```

> [!TIP] 授权限制
> 每个 token 账户（即 ATA）只能有一个有效的授权记录；再次授权会覆盖原来的授权；不能同时授权多个地址共享某个账户的代币权限。

### 撤销（Revoke）

> 撤销授权不需要指定 **delegate** 地址，因为每个账户只能授权一个地址，撤销时不需关心目标是谁；如果没有设置授权，也可以安全调用
> revoke 不会报错；

:::code-group

```ts [DApp Kit]
import {
  createRevokeInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {sendTransaction, useWallet} from '@solana/wallet-adapter-react';
import {ensureAssociatedTokenAccount} from '@/utils/token/ensureATA';

const {publicKey} = useWallet();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const mint = new PublicKey('<Mint地址>');

// 获取当前用户的 ATA（若不存在将返回创建指令）
const {ata, instruction} = await ensureAssociatedTokenAccount(
  connection,
  publicKey,
  mint,
  publicKey,
);

const instructions = [];
if (instruction) instructions.push(instruction);

// 构造撤销授权指令
instructions.push(createRevokeInstruction(
  ata,
  publicKey,
  [],
  TOKEN_2022_PROGRAM_ID,
));

// 获取区块哈希信息
const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

// 构造并发送交易
const tx = new Transaction({
  recentBlockhash: blockhash,
  lastValidBlockHeight,
  feePayer: publicKey,
}).add(...instructions);

const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');

```

:::

## 销毁代币（Burn）

> 谁持有某个代币的 Associated Token Account（ATA）并且是该账户的 **Owner** 或被**授权者（delegate）**，就可以销毁这些代币（Burn）。

:::code-group

```ts [DApp Kit]
import {
  getAssociatedTokenAddress,
  createBurnInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  PublicKey,
  Transaction,
} from '@solana/web3.js';

const {publicKey, sendTransaction} = useWallet();
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const mint = new PublicKey('<Mint地址>');  // 可以通过 API 获取 Mint 地址
const decimals = 6;
const amount = 1000 * 10 ** decimals;

const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

const ata = await getAssociatedTokenAddress(
  mint,
  publicKey,
  false,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
);

const instruction = createBurnInstruction(
  ata,
  mint,
  publicKey,
  BigInt(amount * 10 ** decimals),
  [owner],
  TOKEN_2022_PROGRAM_ID,
);

const tx = new Transaction({
  feePayer: owner,
  blockhash,
  lastValidBlockHeight,
}).add(instruction);

const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction({signature, blockhash, lastValidBlockHeight}, 'confirmed');

```

:::
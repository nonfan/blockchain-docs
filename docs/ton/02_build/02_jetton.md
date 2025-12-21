# 创建 Jetton 代币

> 使用 Tact 创建标准代币（类似 ERC-20）

Jetton 是 TON 的标准代币协议，采用分布式架构，由 Jetton Master 和 Jetton Wallet 组成。

## 创建项目

```bash
# 使用 Jetton 模板创建项目
npm create ton@latest my-jetton -- --template jetton

cd my-jetton
npm install
```

## Jetton 合约

### Jetton Master 合约

`contracts/jetton_master.tact`：

```tact
import "@stdlib/deploy";
import "@stdlib/ownable";

message Mint {
    to: Address;
    amount: Int as coins;
}

contract JettonMaster with Deployable, Ownable {
    owner: Address;
    totalSupply: Int as coins;
    mintable: Bool;
    
    init(owner: Address) {
        self.owner = owner;
        self.totalSupply = 0;
        self.mintable = true;
    }
    
    receive(msg: Mint) {
        self.requireOwner();
        require(self.mintable, "Minting is disabled");
        
        self.totalSupply += msg.amount;
        
        // 发送到用户的 Jetton Wallet
        let walletInit = initOf JettonWallet(myAddress(), msg.to);
        send(SendParameters{
            to: contractAddress(walletInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: walletInit.code,
            data: walletInit.data,
            body: InternalTransfer{
                amount: msg.amount,
                from: myAddress()
            }.toCell()
        });
    }
    
    receive("stop_mint") {
        self.requireOwner();
        self.mintable = false;
    }
    
    get fun totalSupply(): Int {
        return self.totalSupply;
    }
    
    get fun mintable(): Bool {
        return self.mintable;
    }
}
```

### Jetton Wallet 合约

```tact
message InternalTransfer {
    amount: Int as coins;
    from: Address;
}

message Transfer {
    to: Address;
    amount: Int as coins;
    forwardPayload: Cell?;
}

message Burn {
    amount: Int as coins;
}

contract JettonWallet {
    master: Address;
    owner: Address;
    balance: Int as coins;
    
    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.balance = 0;
    }
    
    receive(msg: InternalTransfer) {
        require(sender() == self.master, "Only master can mint");
        self.balance += msg.amount;
    }
    
    receive(msg: Transfer) {
        require(sender() == self.owner, "Only owner can transfer");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance -= msg.amount;
        
        let walletInit = initOf JettonWallet(self.master, msg.to);
        send(SendParameters{
            to: contractAddress(walletInit),
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            code: walletInit.code,
            data: walletInit.data,
            body: InternalTransfer{
                amount: msg.amount,
                from: self.owner
            }.toCell()
        });
    }
    
    receive(msg: Burn) {
        require(sender() == self.owner, "Only owner can burn");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance -= msg.amount;
        
        send(SendParameters{
            to: self.master,
            value: ton("0.01"),
            mode: SendIgnoreErrors,
            body: BurnNotification{
                amount: msg.amount,
                owner: self.owner
            }.toCell()
        });
    }
    
    get fun balance(): Int {
        return self.balance;
    }
    
    get fun owner(): Address {
        return self.owner;
    }
}

message BurnNotification {
    amount: Int as coins;
    owner: Address;
}
```

## 编译和测试

```bash
# 编译合约
npx blueprint build

# 运行测试
npx blueprint test

# 部署到测试网
npx blueprint run
```

## 铸造代币

创建 `scripts/mint.ts`：

```typescript
import { Address, toNano } from '@ton/core';
import { JettonMaster } from '../wrappers/JettonMaster';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Jetton Master 地址
    const masterAddress = Address.parse(await ui.input('Jetton Master address'));
    const jettonMaster = provider.open(JettonMaster.fromAddress(masterAddress));
    
    // 接收者地址
    const recipient = Address.parse(await ui.input('Recipient address'));
    
    // 铸造数量（9 位小数）
    const amount = toNano(await ui.input('Amount to mint'));
    
    // 发送铸造交易
    await jettonMaster.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'Mint',
            to: recipient,
            amount: amount,
        }
    );
    
    ui.write('Tokens minted successfully!');
}
```

运行铸造脚本：

```bash
npx blueprint run mint
```

## 查询余额

创建工具函数查询 Jetton 余额：

```typescript
import { TonClient, Address, beginCell } from '@ton/ton';

async function getJettonBalance(
    client: TonClient,
    jettonMasterAddress: string,
    ownerAddress: string
) {
    // 获取 Jetton Wallet 地址
    const result = await client.runMethod(
        Address.parse(jettonMasterAddress),
        'get_wallet_address',
        [{ 
            type: 'slice', 
            cell: beginCell()
                .storeAddress(Address.parse(ownerAddress))
                .endCell() 
        }]
    );
    
    const jettonWalletAddress = result.stack.readAddress();
    
    // 查询余额
    const balanceResult = await client.runMethod(
        jettonWalletAddress,
        'get_wallet_data'
    );
    
    const balance = balanceResult.stack.readBigNumber();
    return balance;
}

// 使用示例
const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
});

const balance = await getJettonBalance(
    client,
    'EQ...jetton_master',
    'UQ...owner'
);

console.log('余额:', balance);
```

## 转账代币

使用 TON Connect 转账 Jetton：

```typescript
import { TonConnectUI } from '@tonconnect/ui';
import { Address, toNano, beginCell } from '@ton/core';

const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://your-app.com/tonconnect-manifest.json',
});

// 构建转账消息
const transferBody = beginCell()
    .storeUint(0xf8a7ea5, 32)  // op: transfer
    .storeUint(0, 64)          // query_id
    .storeCoins(toNano('100')) // amount
    .storeAddress(Address.parse('UQ...recipient'))
    .storeAddress(Address.parse(tonConnectUI.wallet.account.address))
    .storeBit(0)               // no custom_payload
    .storeCoins(toNano('0.01')) // forward_ton_amount
    .storeBit(0)               // no forward_payload
    .endCell();

// 发送交易
await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
        {
            address: 'EQ...jetton_wallet',
            amount: toNano('0.1').toString(),
            payload: transferBody.toBoc().toString('base64')
        }
    ]
});
```



# 安装 <Badge type="tip" text="^5.4.0" />

> [!IMPORTANT] 官方文档
> https://docs.openzeppelin.com/contracts

**使用 npm 安装（推荐 Hardhat / Node.js 项目）**

在你的 Solidity 项目目录下执行：

```bash
npm init -y
npm install @openzeppelin/contracts@5.4.0
# 最新版本
npm install @openzeppelin/contracts@latest
```

`@openzeppelin/contracts` 是 OpenZeppelin 的主库，包括 ERC20、ERC721、Math、Address 等工具库。

安装完成后，你可以在 Solidity 文件中直接引用：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}
```
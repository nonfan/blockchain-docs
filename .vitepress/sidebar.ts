interface SidebarItem {
  text: string
  collapsed?: boolean
  icon?: string
  items?: SidebarItem[]
  link?: string
}

export function getSidebar(): Record<string, SidebarItem[]> {
  return {
    '/': [
      {
        text: '诞生',
        link: '/guide/overview',
      },
      {
        text: "区块链原理",
        link: '/guide/basics/blockchain-principles',
      },
      {
        text: "密码学",
        link: '/guide/basics/cryptography',
      },
      {
        text: "分布式系统",
        link: '/guide/basics/distributed-systems',
      },
      {
        text: "IPFS",
        link: '/guide/ipfs',
      },
      {
        text: "公链",
        items: [

          {
            text: 'Solana',
            collapsed: true,
            icon: 'solana.svg',
            items: [
              { text: '公链概览', link: '/solana/intro' },
              {
                text: '代币',
                items: [
                  { text: '同质化代币', link: '/solana/token/ft' },
                  { text: '非同质化代币', link: '/solana/token/nft' },
                ],
              },
            ],
          },
          {
            text: 'Sui',
            collapsed: true,
            icon: 'sui.svg',
            items: [
              { text: '公链概览', link: '/sui/intro' },
            ],
          },
        ]
      },
      {
        text: "EVM链",
        items: [
          {
            text: 'Ethereum',
            collapsed: true,
            icon: 'ethereum.svg',
            items: [
              {
                text: '公链概览',
                link: '/ethereum/intro',
              },
              {
                text: 'Solidity',
                collapsed: true,
                items: [
                  { text: '基础语法', link: '/ethereum/solidity/01_basic' },
                  { text: '合约核心', link: '/ethereum/solidity/02_structure' },
                  { text: '合约交互机制', link: '/ethereum/solidity/03_interactions' },
                  { text: '代币标准与常见合约', link: '/ethereum/solidity/04_tokens' },
                  { text: '模块化设计', link: '/ethereum/solidity/05_modules' },
                  { text: '生态标准与工具链', collapsed: true, items: [
                    {
                      text: 'OpenZeppelin', collapsed: true, items: [
                        {
                          text: "Install", link: "/ethereum/solidity/ecosystem/openzeppelin/00_install.md"
                        },
                        {
                          text: "Utils", link: "/ethereum/solidity/ecosystem/openzeppelin/01_utils"
                        },
                        {
                          text: "Access", link: "/ethereum/solidity/ecosystem/openzeppelin/02_access"
                        },
                        {
                          text: "Token", link: "/ethereum/solidity/ecosystem/openzeppelin/03_token"
                        },
                        {
                          text: "Proxy", link: "/ethereum/solidity/ecosystem/openzeppelin/04_proxy"
                        },
                        {
                          text: "Governance", link: "/ethereum/solidity/ecosystem/openzeppelin/05_governance"
                        },
                        {
                          text: "Security", link: "/ethereum/solidity/ecosystem/openzeppelin/06_security"
                        },
                    ]
                    },
                    { text: 'Hardhat', link: '/ethereum/solidity/ecosystem/hardhat' },
                    { text: 'Testing', link: '/ethereum/solidity/ecosystem/testing' },
                  ] },
                ],
              },
              {
                text: 'SDKs',
                items: [
                  { text: 'Ethers.js', link: '/ethereum/sdks/ethers_js' },
                  { text: 'JSON-RPC', link: '/ethereum/sdks/json-rpc' },
                  { text: 'Viem', link: '/ethereum/sdks/viem' },
                  { text: 'Wagmi', link: '/ethereum/sdks/wagmi' },
                ],
              },
            ],
          },
          {
            text: 'VeChain',
            collapsed: true,
            icon: 'vet.svg',
            items: [
              { text: '公链概览', link: '/vechain/intro' },
              { text: '合约部署升级', link: '/vechain/contract-deploy' },
              {
                text: 'SDKs',
                collapsed: false,
                items: [
                  {
                    text: "SDK",
                    collapsed: false,
                    items: [
                      { text: "ThorClient", link: '/vechain/sdks/sdk/thor-client' },
                      { text: "Clause", link: '/vechain/sdks/sdk/clause' },
                      { text: "Transaction", link: '/vechain/sdks/sdk/transaction' },
                      { text: "Contract", link: '/vechain/sdks/sdk/contract' },
                      { text: "Utils", link: '/vechain/sdks/sdk/utils' },
                      { text: "Wallet", link: '/vechain/sdks/sdk/wallet' }
                    ]
                  },
                  { text: 'Connex', link: '/vechain/sdks/connex' },
                  {
                    text: 'React Usages',
                    collapsed: false,
                    items: [
                      { text: "自签名交易", link: "/vechain/sdks/react-usage/self-signature" }
                    ]
                  }
                ],
              },
            ],
          },
          {
            text: 'Monad',
            collapsed: true,
            icon: 'monad.svg',
            items: [
              { text: '公链概览', link: '/monad/intro' },
            ],
          },
        ]
      }
    ],
  }
}

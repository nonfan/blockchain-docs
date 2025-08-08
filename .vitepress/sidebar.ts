import type { DefaultTheme } from 'vitepress'

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
        text: 'Ethereum',
        collapsed: true,
        icon: '/ethereum.svg',
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
              { text: '代币标准', link: '/ethereum/solidity/04_tokens' },
              { text: '模块化设计', link: '/ethereum/solidity/05_modules' },
              { text: '安全防护', link: '/ethereum/solidity/06_security' },
              { text: '测试', link: '/ethereum/solidity/07_testing' },
              { text: '部署', link: '/ethereum/solidity/08_deployment' },
              { text: '进阶特性', link: '/ethereum/solidity/09_advanced' },
              { text: '生态标准与工具链', link: '/ethereum/solidity/10_ecosystem' },
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
        icon: '/vet.svg',
        items: [
          { text: '公链概览', link: '/vechain/intro' },
          { text: '合约部署升级', link: '/vechain/contract-deploy' },
          {
            text: 'SDKs',
            collapsed: false,
            items: [
              { text: 'Connex', link: '/vechain/sdks/connex' },
            ],
          },
        ],
      },
      {
        text: 'Solana',
        collapsed: true,
        icon: '/solana.svg',
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
        text: 'Monad',
        collapsed: true,
        icon: '/monad.svg',
        items: [
          { text: '公链概览', link: '/monad/intro' },
        ],
      },
      {
        text: 'Sui',
        collapsed: true,
        icon: '/sui.svg',
        items: [
          { text: '公链概览', link: '/sui/intro' },
        ],
      },
    ],
  }
}

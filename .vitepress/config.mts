import {defineConfig} from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  lang: "zh",
  base: "/blockchain-docs",
  title: "区块链",
  description: "区块链最初因比特币而流行，目前已广泛应用于加密货币、智能合约、去中心化金融（DeFi）、NFT、供应链溯源等领域。",
  head: [['link', {rel: 'icon', href: '/blockchain-docs/logo.svg'}]],
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    sidebar: [
      {
        text: "诞生",
        link: "/guide/overview",
      },
      {
        text: 'Ethereum',
        collapsed: true,
        icon: "/ethereum.svg",
        items: [
          {
            text: '公链概览',
            link: '/ethereum/intro'
          },
          {
            text: "Solidity",
            collapsed: true,
            items: [
              {
                text: "基础语法",
                link: "/ethereum/solidity/01_basic",
              },
              {
                text: "合约核心",
                link: "/ethereum/solidity/02_structure",
              },
              {
                text: "合约交互机制",
                link: "/ethereum/solidity/03_interactions",
              },
              {
                text: "代币标准",
                link: "/ethereum/solidity/04_tokens",
              },
              {
                text: "模块化设计",
                link: "/ethereum/solidity/05_modules",
              },
              {
                text: "安全防护",
                link: "/ethereum/solidity/06_security",
              },
              {
                text: "测试",
                link: "/ethereum/solidity/07_testing",
              },
              {
                text: "部署",
                link: "/ethereum/solidity/08_deployment",
              },
              {
                text: "进阶特性",
                link: "/ethereum/solidity/09_advanced",
              },
              {
                text: "生态标准与工具链",
                link: "/ethereum/solidity/10_ecosystem",
              },
            ],
          }
        ]
      },
      {
        text: 'VeChain',
        collapsed: true,
        icon: "/vet.svg",
        items: [
          {
            text: '公链概览',
            link: '/vechain/intro'
          },
          {text: '合约部署升级', link: '/vechain/contract-deploy'},
          {
            text: 'SDKs', collapsed: false, items: [
              {text: 'Connex', link: '/vechain/sdk/connex'}
            ]
          },
        ]
      },
      {
        text: 'Solana',
        collapsed: true,
        icon: "/solana.svg",
        items: [
          {text: '公链概览', link: '/solana/intro'},
          {
            text: '代币', items: [
              {text: "同质化代币", link: '/solana/token/ft'},
              {text: "非同质化代币", link: '/solana/token/nft'},
            ]
          },
        ]
      },
      {
        text: 'Monad',
        collapsed: true,
        icon: "/monad.svg",
        items: [
          {text: '公链概览', link: '/monad/intro'},
        ]
      },
      {
        text: 'Sui',
        collapsed: true,
        icon: "/sui.svg",
        items: [
          {text: '公链概览', link: '/sui/intro'},
        ]
      },
    ],
    outline: [2, 3],
    outlineTitle: "页面导航",
    lastUpdated: {
      text: '最后更新于',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    darkModeSwitchLabel: '外观',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    search: {
      provider: 'local',
    },
    socialLinks: [
      {icon: 'github', link: 'https://github.com/nonfan/blockchain-docs'}
    ],
    editLink: {
      pattern: 'https://github.com/nonfan/blockchain-docs/edit/docs/docs/:path',
      text: "在 GitHub 上编辑此页面"
    },
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2025-present <a href="https://github.com/nonfan">MOFAN</a>'
    },
  },
  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/VPSidebarItem\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPSidebarItem.vue', import.meta.url)
          )
        }
      ]
    }
  }
})
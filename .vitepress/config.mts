import {defineConfig} from 'vitepress'

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
        text: "概述",
        link: "/guide/overview"
      },
      {
        text: "智能合约",
        link: "/guide/solidity"
      },
      {
        text: 'VeChain',
        collapsed: false,
        items: [
          {text: '公链概览', link: '/vechain/intro'},
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
        collapsed: false,
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
        collapsed: false,
        items: [
          {text: '介绍', link: '/monad/intro'},
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
})
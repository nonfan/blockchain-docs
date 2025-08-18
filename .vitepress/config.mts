import {defineConfig} from 'vitepress'
import {fileURLToPath, URL} from 'node:url'
import {getSidebar} from "./sidebar";

export default defineConfig({
  lang: "zh",
  base: "/blockchain-docs",
  title: "区块链",
  cleanUrls: true,
  description: "区块链最初因比特币而流行，目前已广泛应用于加密货币、智能合约、去中心化金融（DeFi）、NFT、供应链溯源等领域。",
  head: [['link', {rel: 'icon', href: '/blockchain-docs/logo.svg'}]],
  themeConfig: {
    logo: "/logo.svg",
    sidebar: getSidebar(),
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
      pattern: 'https://github.com/nonfan/blockchain-docs/edit/main/:path',
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
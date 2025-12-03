import { defineConfig } from "vitepress";
import { fileURLToPath, URL } from "node:url";
import { getSidebar } from "./sidebar";
import {
  transformerTwoslash,
  defaultHoverInfoProcessor,
} from "@shikijs/vitepress-twoslash";
import KeywordTipPlugin from "./plugins/keywordTipPlugin";
import taskLists from "markdown-it-task-lists";

// 根据环境决定 base 路径
const base = "/blockchain-docs";

export default defineConfig({
  srcDir: "./docs",
  outDir: ".vitepress/dist", // 输出到根目录的 dist 文件夹
  cacheDir: ".vitepress/cache",
  lang: "zh",
  base,
  title: "区块链",
  cleanUrls: true,
  description:
    "区块链最初因比特币而流行，目前已广泛应用于加密货币、智能合约、去中心化金融（DeFi）、NFT、供应链溯源等领域。",
  head: [["link", { rel: "icon", href: `/blockchain-docs/logo.svg` }]],
  themeConfig: {
    logo: "/logo.svg",
    sidebar: getSidebar(),
    outline: [2, 3],
    outlineTitle: "页面导航",
    lastUpdated: {
      text: "最后更新于",
    },
    docFooter: {
      prev: "上一篇",
      next: "下一篇",
    },
    darkModeSwitchLabel: "外观",
    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "菜单",
    search: {
      provider: "local",
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/nonfan/blockchain-docs" },
    ],
    editLink: {
      pattern: "https://github.com/nonfan/blockchain-docs/edit/main/:path",
      text: "在 GitHub 上编辑此页面",
    },
    footer: {
      message: "基于 MIT 许可发布",
      copyright:
        'Copyright © 2025-present <a href="https://github.com/nonfan">MOFAN</a>',
    },
  },
  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/VPSidebarItem\.vue$/,
          replacement: fileURLToPath(
            new URL("./theme/components/VPSidebarItem.vue", import.meta.url)
          ),
        },
      ],
    },
  },
  markdown: {
    config: (md) => {
      // 注册关键字替换插件
      md.use(taskLists, { label: true /* 在 <li> 中包 label，便于点击 */ });
      md.use(KeywordTipPlugin, {
        keywords: {
          useAccount: { file: "useAccount.txt", lang: "tsx" },
        },
      });
    },
    code: {
      highlight: "shiki",
      shikiConfig: {
        themes: {
          light: "vitesse-light",
          dark: "vitesse-dark",
        },
        transformers: [
          transformerTwoslash({
            // 控制 Hover 的 tooltip 怎么显示
            processHoverInfo: defaultHoverInfoProcessor,
          }),
        ],
      },
    },
  },
});

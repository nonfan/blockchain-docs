// .vitepress/config.mts
import { defineConfig } from "file:///C:/Users/dream/Documents/blockchain-docs/node_modules/vitepress/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";

// .vitepress/sidebar.ts
import fs from "fs";
import path from "path";
import matter from "file:///C:/Users/dream/Documents/blockchain-docs/node_modules/gray-matter/index.js";
var __vite_injected_original_dirname = "C:\\Users\\dream\\Documents\\blockchain-docs\\.vitepress";
var docsDir = path.join(__vite_injected_original_dirname, "../docs");
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { content: markdown } = matter(content);
    const match = markdown.match(/^#\s+(.+)$/m);
    if (match && match[1]) return match[1];
    const filename = path.basename(filePath, ".md");
    return smartParseFilename(filename);
  } catch {
    const filename = path.basename(filePath, ".md");
    return smartParseFilename(filename);
  }
}
function smartParseFilename(filename) {
  let name = filename.replace(/^\d+_/, "");
  name = name.replace(/[-_]/g, " ");
  return name.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function smartParseFolderName(folderName) {
  let name = folderName.replace(/^\d+_/, "");
  const specialFolders = {
    sdks: "SDKs",
    sdk: "SDK",
    ecosystem: "\u751F\u6001\u6807\u51C6\u4E0E\u5DE5\u5177\u94FE",
    openzeppelin: "OpenZeppelin",
    "react-usage": "React Usages"
  };
  if (specialFolders[name]) return specialFolders[name];
  name = name.replace(/[-_]/g, " ");
  return name.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function getSortOrder(name) {
  const match = name.match(/^(\d+)_/);
  return match ? parseInt(match[1]) : 999;
}
function scanFolder(folderPath) {
  const items = [];
  if (!fs.existsSync(folderPath)) return items;
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  entries.sort((a, b) => {
    const aOrder = getSortOrder(a.name);
    const bOrder = getSortOrder(b.name);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relativePath = path.relative(docsDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      const subItems = scanFolder(fullPath);
      if (subItems.length > 0) {
        items.push({
          text: smartParseFolderName(entry.name),
          collapsed: true,
          items: subItems
        });
      }
    } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
      const linkPath = "/" + relativePath.replace(/\.md$/, "");
      const title = extractTitle(fullPath);
      items.push({ text: title, link: linkPath });
    }
  }
  return items;
}
function scanChain(chainName) {
  const chainPath = path.join(docsDir, chainName);
  return scanFolder(chainPath);
}
function buildChainsSection(title, chains) {
  return {
    text: title,
    items: chains.map((c) => ({
      text: c.text,
      collapsed: true,
      icon: c.icon,
      badge: c.badge,
      badgeVariant: c.badgeVariant,
      items: scanChain(c.dir)
    }))
  };
}
function getSidebar() {
  const guide = [
    { text: "\u8D77\u6E90", link: "/guide/01_overview" },
    { text: "\u533A\u5757\u94FE\u539F\u7406", link: "/guide/02_basics/01_blockchain-principles" },
    { text: "\u5BC6\u7801\u5B66", link: "/guide/02_basics/02_cryptography" },
    { text: "\u5206\u5E03\u5F0F\u7CFB\u7EDF", link: "/guide/02_basics/03_distributed-systems" },
    { text: "IPFS", link: "/guide/03_ipfs" },
    {
      text: "\u667A\u80FD\u5408\u7EA6",
      items: [
        {
          text: "Solidity",
          collapsed: true,
          icon: "solidity.svg",
          items: scanChain("solidity")
        },
        {
          text: "Move",
          collapsed: true,
          icon: "move.svg",
          items: scanChain("move")
        }
      ]
    }
  ];
  const l1Chains = [
    { text: "Solana", icon: "solana.svg", dir: "solana" },
    { text: "Sui", icon: "sui.svg", dir: "sui" },
    { text: "Aptos", icon: "aptos.svg", dir: "aptos" }
  ];
  const evmChains = [
    { text: "Ethereum", icon: "ethereum.svg", dir: "ethereum" },
    {
      text: "Arbitrum",
      icon: "arbitrum.svg",
      dir: "arbitrum",
      badge: "Layer2",
      badgeVariant: "info"
    },
    {
      text: "Base",
      icon: "base.svg",
      dir: "base",
      badge: "Layer2",
      badgeVariant: "info"
    },
    { text: "VeChain", icon: "vet.svg", dir: "vechain" },
    { text: "Monad", icon: "monad.svg", dir: "monad" }
  ];
  return {
    "/": [
      ...guide,
      buildChainsSection("Layer 1", l1Chains),
      buildChainsSection("EVM\u94FE", evmChains)
    ]
  };
}

// .vitepress/config.mts
import {
  transformerTwoslash,
  defaultHoverInfoProcessor
} from "file:///C:/Users/dream/Documents/blockchain-docs/node_modules/@shikijs/vitepress-twoslash/dist/index.mjs";

// .vitepress/plugins/keywordTipPlugin.ts
function KeywordTipPlugin(md, options) {
  const keys = Object.keys(options.keywords);
  if (keys.length === 0) return;
  const regex = new RegExp(`\\b(${keys.join("|")})\\b`, "g");
  md.core.ruler.after("inline", "keyword-tip", (state) => {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type !== "inline") return;
      blockToken.children?.forEach((token, idx) => {
        if (token.type === "text") {
          const text = token.content;
          if (regex.test(text)) {
            const newTokens = [];
            let lastIndex = 0;
            text.replace(regex, (match, _p1, offset) => {
              const before = text.slice(lastIndex, offset);
              if (before) {
                newTokens.push({
                  type: "text",
                  content: before,
                  level: token.level
                });
              }
              const { file, lang } = options.keywords[match];
              newTokens.push({
                type: "html_inline",
                content: `<KeywordTip keyword="${match}" file="${file}" lang="${lang || "ts"}" />`,
                level: token.level
              });
              lastIndex = offset + match.length;
              return match;
            });
            const after = text.slice(lastIndex);
            if (after) {
              newTokens.push({
                type: "text",
                content: after,
                level: token.level
              });
            }
            blockToken.children = [
              ...blockToken.children.slice(0, idx),
              ...newTokens,
              ...blockToken.children.slice(idx + 1)
            ];
          }
        }
      });
    });
  });
}

// .vitepress/config.mts
import taskLists from "file:///C:/Users/dream/Documents/blockchain-docs/node_modules/markdown-it-task-lists/index.js";
import { withMermaid } from "file:///C:/Users/dream/Documents/blockchain-docs/node_modules/vitepress-plugin-mermaid/dist/vitepress-plugin-mermaid.es.mjs";
var __vite_injected_original_import_meta_url = "file:///C:/Users/dream/Documents/blockchain-docs/.vitepress/config.mts";
var base = "/blockchain-docs";
var config_default = withMermaid(
  defineConfig({
    mermaid: {
      securityLevel: "loose",
      theme: "default"
    },
    srcDir: "./docs",
    outDir: ".vitepress/dist",
    // 输出到根目录的 dist 文件夹
    cacheDir: ".vitepress/cache",
    lang: "zh",
    base,
    title: "\u533A\u5757\u94FE",
    cleanUrls: true,
    description: "\u533A\u5757\u94FE\u6700\u521D\u56E0\u6BD4\u7279\u5E01\u800C\u6D41\u884C\uFF0C\u76EE\u524D\u5DF2\u5E7F\u6CDB\u5E94\u7528\u4E8E\u52A0\u5BC6\u8D27\u5E01\u3001\u667A\u80FD\u5408\u7EA6\u3001\u53BB\u4E2D\u5FC3\u5316\u91D1\u878D\uFF08DeFi\uFF09\u3001NFT\u3001\u4F9B\u5E94\u94FE\u6EAF\u6E90\u7B49\u9886\u57DF\u3002",
    head: [["link", { rel: "icon", href: `/blockchain-docs/logo.svg` }]],
    themeConfig: {
      logo: "/logo.svg",
      sidebar: getSidebar(),
      outline: [2, 3],
      outlineTitle: "\u9875\u9762\u5BFC\u822A",
      lastUpdated: {
        text: "\u6700\u540E\u66F4\u65B0\u4E8E"
      },
      docFooter: {
        prev: "\u4E0A\u4E00\u7BC7",
        next: "\u4E0B\u4E00\u7BC7"
      },
      darkModeSwitchLabel: "\u5916\u89C2",
      returnToTopLabel: "\u8FD4\u56DE\u9876\u90E8",
      sidebarMenuLabel: "\u83DC\u5355",
      search: {
        provider: "local"
      },
      socialLinks: [
        { icon: "github", link: "https://github.com/nonfan/blockchain-docs" }
      ],
      editLink: {
        pattern: "https://github.com/nonfan/blockchain-docs/edit/main/:path",
        text: "\u5728 GitHub \u4E0A\u7F16\u8F91\u6B64\u9875\u9762"
      },
      footer: {
        message: "\u57FA\u4E8E MIT \u8BB8\u53EF\u53D1\u5E03",
        copyright: 'Copyright \xA9 2025-present <a href="https://github.com/nonfan">MOFAN</a>'
      }
    },
    vite: {
      resolve: {
        alias: [
          {
            find: /^.*\/VPSidebarItem\.vue$/,
            replacement: fileURLToPath(
              new URL("./theme/components/VPSidebarItem.vue", __vite_injected_original_import_meta_url)
            )
          }
        ]
      },
      optimizeDeps: {
        include: ["lodash-es", "dagre-d3-es"]
      }
    },
    markdown: {
      config: (md) => {
        md.use(taskLists, {
          label: true
          /* 在 <li> 中包 label，便于点击 */
        });
        md.use(KeywordTipPlugin, {
          keywords: {
            useAccount: { file: "useAccount.txt", lang: "tsx" }
          }
        });
      },
      code: {
        highlight: "shiki",
        shikiConfig: {
          themes: {
            light: "vitesse-light",
            dark: "vitesse-dark"
          },
          transformers: [
            transformerTwoslash({
              // 控制 Hover 的 tooltip 怎么显示
              processHoverInfo: defaultHoverInfoProcessor
            })
          ]
        }
      }
    }
  })
);
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLnZpdGVwcmVzcy9jb25maWcubXRzIiwgIi52aXRlcHJlc3Mvc2lkZWJhci50cyIsICIudml0ZXByZXNzL3BsdWdpbnMva2V5d29yZFRpcFBsdWdpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRyZWFtXFxcXERvY3VtZW50c1xcXFxibG9ja2NoYWluLWRvY3NcXFxcLnZpdGVwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZHJlYW1cXFxcRG9jdW1lbnRzXFxcXGJsb2NrY2hhaW4tZG9jc1xcXFwudml0ZXByZXNzXFxcXGNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RyZWFtL0RvY3VtZW50cy9ibG9ja2NoYWluLWRvY3MvLnZpdGVwcmVzcy9jb25maWcubXRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVwcmVzc1wiO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwibm9kZTp1cmxcIjtcclxuaW1wb3J0IHsgZ2V0U2lkZWJhciB9IGZyb20gXCIuL3NpZGViYXJcIjtcclxuaW1wb3J0IHtcclxuICB0cmFuc2Zvcm1lclR3b3NsYXNoLFxyXG4gIGRlZmF1bHRIb3ZlckluZm9Qcm9jZXNzb3IsXHJcbn0gZnJvbSBcIkBzaGlraWpzL3ZpdGVwcmVzcy10d29zbGFzaFwiO1xyXG5pbXBvcnQgS2V5d29yZFRpcFBsdWdpbiBmcm9tIFwiLi9wbHVnaW5zL2tleXdvcmRUaXBQbHVnaW5cIjtcclxuaW1wb3J0IHRhc2tMaXN0cyBmcm9tIFwibWFya2Rvd24taXQtdGFzay1saXN0c1wiO1xyXG5pbXBvcnQgeyB3aXRoTWVybWFpZCB9IGZyb20gXCJ2aXRlcHJlc3MtcGx1Z2luLW1lcm1haWRcIjtcclxuXHJcbi8vIFx1NjgzOVx1NjM2RVx1NzNBRlx1NTg4M1x1NTFCM1x1NUI5QSBiYXNlIFx1OERFRlx1NUY4NFxyXG5jb25zdCBiYXNlID0gXCIvYmxvY2tjaGFpbi1kb2NzXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCB3aXRoTWVybWFpZChcclxuICBkZWZpbmVDb25maWcoe1xyXG4gICAgbWVybWFpZDoge1xyXG4gICAgICBzZWN1cml0eUxldmVsOiBcImxvb3NlXCIsXHJcbiAgICAgIHRoZW1lOiBcImRlZmF1bHRcIixcclxuICAgIH0sXHJcbiAgICBzcmNEaXI6IFwiLi9kb2NzXCIsXHJcbiAgICBvdXREaXI6IFwiLnZpdGVwcmVzcy9kaXN0XCIsIC8vIFx1OEY5M1x1NTFGQVx1NTIzMFx1NjgzOVx1NzZFRVx1NUY1NVx1NzY4NCBkaXN0IFx1NjU4N1x1NEVGNlx1NTkzOVxyXG4gICAgY2FjaGVEaXI6IFwiLnZpdGVwcmVzcy9jYWNoZVwiLFxyXG4gICAgbGFuZzogXCJ6aFwiLFxyXG4gICAgYmFzZSxcclxuICAgIHRpdGxlOiBcIlx1NTMzQVx1NTc1N1x1OTRGRVwiLFxyXG4gICAgY2xlYW5VcmxzOiB0cnVlLFxyXG4gICAgZGVzY3JpcHRpb246XHJcbiAgICAgIFwiXHU1MzNBXHU1NzU3XHU5NEZFXHU2NzAwXHU1MjFEXHU1NkUwXHU2QkQ0XHU3Mjc5XHU1RTAxXHU4MDBDXHU2RDQxXHU4ODRDXHVGRjBDXHU3NkVFXHU1MjREXHU1REYyXHU1RTdGXHU2Q0RCXHU1RTk0XHU3NTI4XHU0RThFXHU1MkEwXHU1QkM2XHU4RDI3XHU1RTAxXHUzMDAxXHU2NjdBXHU4MEZEXHU1NDA4XHU3RUE2XHUzMDAxXHU1M0JCXHU0RTJEXHU1RkMzXHU1MzE2XHU5MUQxXHU4NzhEXHVGRjA4RGVGaVx1RkYwOVx1MzAwMU5GVFx1MzAwMVx1NEY5Qlx1NUU5NFx1OTRGRVx1NkVBRlx1NkU5MFx1N0I0OVx1OTg4Nlx1NTdERlx1MzAwMlwiLFxyXG4gICAgaGVhZDogW1tcImxpbmtcIiwgeyByZWw6IFwiaWNvblwiLCBocmVmOiBgL2Jsb2NrY2hhaW4tZG9jcy9sb2dvLnN2Z2AgfV1dLFxyXG4gICAgdGhlbWVDb25maWc6IHtcclxuICAgICAgbG9nbzogXCIvbG9nby5zdmdcIixcclxuICAgICAgc2lkZWJhcjogZ2V0U2lkZWJhcigpLFxyXG4gICAgICBvdXRsaW5lOiBbMiwgM10sXHJcbiAgICAgIG91dGxpbmVUaXRsZTogXCJcdTk4NzVcdTk3NjJcdTVCRkNcdTgyMkFcIixcclxuICAgICAgbGFzdFVwZGF0ZWQ6IHtcclxuICAgICAgICB0ZXh0OiBcIlx1NjcwMFx1NTQwRVx1NjZGNFx1NjVCMFx1NEU4RVwiLFxyXG4gICAgICB9LFxyXG4gICAgICBkb2NGb290ZXI6IHtcclxuICAgICAgICBwcmV2OiBcIlx1NEUwQVx1NEUwMFx1N0JDN1wiLFxyXG4gICAgICAgIG5leHQ6IFwiXHU0RTBCXHU0RTAwXHU3QkM3XCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGRhcmtNb2RlU3dpdGNoTGFiZWw6IFwiXHU1OTE2XHU4OUMyXCIsXHJcbiAgICAgIHJldHVyblRvVG9wTGFiZWw6IFwiXHU4RkQ0XHU1NkRFXHU5ODc2XHU5MEU4XCIsXHJcbiAgICAgIHNpZGViYXJNZW51TGFiZWw6IFwiXHU4M0RDXHU1MzU1XCIsXHJcbiAgICAgIHNlYXJjaDoge1xyXG4gICAgICAgIHByb3ZpZGVyOiBcImxvY2FsXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvY2lhbExpbmtzOiBbXHJcbiAgICAgICAgeyBpY29uOiBcImdpdGh1YlwiLCBsaW5rOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9ub25mYW4vYmxvY2tjaGFpbi1kb2NzXCIgfSxcclxuICAgICAgXSxcclxuICAgICAgZWRpdExpbms6IHtcclxuICAgICAgICBwYXR0ZXJuOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9ub25mYW4vYmxvY2tjaGFpbi1kb2NzL2VkaXQvbWFpbi86cGF0aFwiLFxyXG4gICAgICAgIHRleHQ6IFwiXHU1NzI4IEdpdEh1YiBcdTRFMEFcdTdGMTZcdThGOTFcdTZCNjRcdTk4NzVcdTk3NjJcIixcclxuICAgICAgfSxcclxuICAgICAgZm9vdGVyOiB7XHJcbiAgICAgICAgbWVzc2FnZTogXCJcdTU3RkFcdTRFOEUgTUlUIFx1OEJCOFx1NTNFRlx1NTNEMVx1NUUwM1wiLFxyXG4gICAgICAgIGNvcHlyaWdodDpcclxuICAgICAgICAgICdDb3B5cmlnaHQgXHUwMEE5IDIwMjUtcHJlc2VudCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL25vbmZhblwiPk1PRkFOPC9hPicsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgdml0ZToge1xyXG4gICAgICByZXNvbHZlOiB7XHJcbiAgICAgICAgYWxpYXM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgZmluZDogL14uKlxcL1ZQU2lkZWJhckl0ZW1cXC52dWUkLyxcclxuICAgICAgICAgICAgcmVwbGFjZW1lbnQ6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgICAgICAgbmV3IFVSTChcIi4vdGhlbWUvY29tcG9uZW50cy9WUFNpZGViYXJJdGVtLnZ1ZVwiLCBpbXBvcnQubWV0YS51cmwpXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICAgIGluY2x1ZGU6IFtcImxvZGFzaC1lc1wiLCBcImRhZ3JlLWQzLWVzXCJdLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIG1hcmtkb3duOiB7XHJcbiAgICAgIGNvbmZpZzogKG1kKSA9PiB7XHJcbiAgICAgICAgLy8gXHU2Q0U4XHU1MThDXHU1MTczXHU5NTJFXHU1QjU3XHU2NkZGXHU2MzYyXHU2M0QyXHU0RUY2XHJcbiAgICAgICAgbWQudXNlKHRhc2tMaXN0cywgeyBsYWJlbDogdHJ1ZSAvKiBcdTU3MjggPGxpPiBcdTRFMkRcdTUzMDUgbGFiZWxcdUZGMENcdTRGQkZcdTRFOEVcdTcwQjlcdTUxRkIgKi8gfSk7XHJcbiAgICAgICAgbWQudXNlKEtleXdvcmRUaXBQbHVnaW4sIHtcclxuICAgICAgICAgIGtleXdvcmRzOiB7XHJcbiAgICAgICAgICAgIHVzZUFjY291bnQ6IHsgZmlsZTogXCJ1c2VBY2NvdW50LnR4dFwiLCBsYW5nOiBcInRzeFwiIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgICBjb2RlOiB7XHJcbiAgICAgICAgaGlnaGxpZ2h0OiBcInNoaWtpXCIsXHJcbiAgICAgICAgc2hpa2lDb25maWc6IHtcclxuICAgICAgICAgIHRoZW1lczoge1xyXG4gICAgICAgICAgICBsaWdodDogXCJ2aXRlc3NlLWxpZ2h0XCIsXHJcbiAgICAgICAgICAgIGRhcms6IFwidml0ZXNzZS1kYXJrXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdHJhbnNmb3JtZXJzOiBbXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyVHdvc2xhc2goe1xyXG4gICAgICAgICAgICAgIC8vIFx1NjNBN1x1NTIzNiBIb3ZlciBcdTc2ODQgdG9vbHRpcCBcdTYwMEVcdTRFNDhcdTY2M0VcdTc5M0FcclxuICAgICAgICAgICAgICBwcm9jZXNzSG92ZXJJbmZvOiBkZWZhdWx0SG92ZXJJbmZvUHJvY2Vzc29yLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSlcclxuKTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkcmVhbVxcXFxEb2N1bWVudHNcXFxcYmxvY2tjaGFpbi1kb2NzXFxcXC52aXRlcHJlc3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRyZWFtXFxcXERvY3VtZW50c1xcXFxibG9ja2NoYWluLWRvY3NcXFxcLnZpdGVwcmVzc1xcXFxzaWRlYmFyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kcmVhbS9Eb2N1bWVudHMvYmxvY2tjaGFpbi1kb2NzLy52aXRlcHJlc3Mvc2lkZWJhci50c1wiO2ltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IG1hdHRlciBmcm9tIFwiZ3JheS1tYXR0ZXJcIjtcclxuXHJcbmludGVyZmFjZSBTaWRlYmFySXRlbSB7XHJcbiAgdGV4dDogc3RyaW5nO1xyXG4gIGNvbGxhcHNlZD86IGJvb2xlYW47XHJcbiAgaWNvbj86IHN0cmluZztcclxuICBpdGVtcz86IFNpZGViYXJJdGVtW107XHJcbiAgbGluaz86IHN0cmluZztcclxuICBiYWRnZT86IHN0cmluZztcclxuICBiYWRnZVZhcmlhbnQ/OiBcImRlZmF1bHRcIiB8IFwiaW5mb1wiIHwgXCJiZXRhXCIgfCBcImNhdXRpb25cIjtcclxufVxyXG5cclxuY29uc3QgZG9jc0RpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vZG9jc1wiKTtcclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RUaXRsZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgIGNvbnN0IHsgY29udGVudDogbWFya2Rvd24gfSA9IG1hdHRlcihjb250ZW50KTtcclxuICAgIGNvbnN0IG1hdGNoID0gbWFya2Rvd24ubWF0Y2goL14jXFxzKyguKykkL20pO1xyXG4gICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdKSByZXR1cm4gbWF0Y2hbMV07XHJcbiAgICBjb25zdCBmaWxlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgsIFwiLm1kXCIpO1xyXG4gICAgcmV0dXJuIHNtYXJ0UGFyc2VGaWxlbmFtZShmaWxlbmFtZSk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICBjb25zdCBmaWxlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgsIFwiLm1kXCIpO1xyXG4gICAgcmV0dXJuIHNtYXJ0UGFyc2VGaWxlbmFtZShmaWxlbmFtZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzbWFydFBhcnNlRmlsZW5hbWUoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgbGV0IG5hbWUgPSBmaWxlbmFtZS5yZXBsYWNlKC9eXFxkK18vLCBcIlwiKTtcclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bLV9dL2csIFwiIFwiKTtcclxuICByZXR1cm4gbmFtZVxyXG4gICAgLnNwbGl0KFwiIFwiKVxyXG4gICAgLm1hcCgod29yZCkgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpXHJcbiAgICAuam9pbihcIiBcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNtYXJ0UGFyc2VGb2xkZXJOYW1lKGZvbGRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgbGV0IG5hbWUgPSBmb2xkZXJOYW1lLnJlcGxhY2UoL15cXGQrXy8sIFwiXCIpO1xyXG4gIGNvbnN0IHNwZWNpYWxGb2xkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgc2RrczogXCJTREtzXCIsXHJcbiAgICBzZGs6IFwiU0RLXCIsXHJcbiAgICBlY29zeXN0ZW06IFwiXHU3NTFGXHU2MDAxXHU2ODA3XHU1MUM2XHU0RTBFXHU1REU1XHU1MTc3XHU5NEZFXCIsXHJcbiAgICBvcGVuemVwcGVsaW46IFwiT3BlblplcHBlbGluXCIsXHJcbiAgICBcInJlYWN0LXVzYWdlXCI6IFwiUmVhY3QgVXNhZ2VzXCIsXHJcbiAgfTtcclxuICBpZiAoc3BlY2lhbEZvbGRlcnNbbmFtZV0pIHJldHVybiBzcGVjaWFsRm9sZGVyc1tuYW1lXTtcclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bLV9dL2csIFwiIFwiKTtcclxuICByZXR1cm4gbmFtZVxyXG4gICAgLnNwbGl0KFwiIFwiKVxyXG4gICAgLm1hcCgod29yZCkgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpXHJcbiAgICAuam9pbihcIiBcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNvcnRPcmRlcihuYW1lOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIGNvbnN0IG1hdGNoID0gbmFtZS5tYXRjaCgvXihcXGQrKV8vKTtcclxuICByZXR1cm4gbWF0Y2ggPyBwYXJzZUludChtYXRjaFsxXSkgOiA5OTk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjYW5Gb2xkZXIoZm9sZGVyUGF0aDogc3RyaW5nKTogU2lkZWJhckl0ZW1bXSB7XHJcbiAgY29uc3QgaXRlbXM6IFNpZGViYXJJdGVtW10gPSBbXTtcclxuICBpZiAoIWZzLmV4aXN0c1N5bmMoZm9sZGVyUGF0aCkpIHJldHVybiBpdGVtcztcclxuICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZm9sZGVyUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xyXG4gIGVudHJpZXMuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgY29uc3QgYU9yZGVyID0gZ2V0U29ydE9yZGVyKGEubmFtZSk7XHJcbiAgICBjb25zdCBiT3JkZXIgPSBnZXRTb3J0T3JkZXIoYi5uYW1lKTtcclxuICAgIGlmIChhT3JkZXIgIT09IGJPcmRlcikgcmV0dXJuIGFPcmRlciAtIGJPcmRlcjtcclxuICAgIHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpO1xyXG4gIH0pO1xyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgZW50cnkubmFtZSk7XHJcbiAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBwYXRoLnJlbGF0aXZlKGRvY3NEaXIsIGZ1bGxQYXRoKS5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcclxuICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgIGNvbnN0IHN1Ykl0ZW1zID0gc2NhbkZvbGRlcihmdWxsUGF0aCk7XHJcbiAgICAgIGlmIChzdWJJdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgaXRlbXMucHVzaCh7XHJcbiAgICAgICAgICB0ZXh0OiBzbWFydFBhcnNlRm9sZGVyTmFtZShlbnRyeS5uYW1lKSxcclxuICAgICAgICAgIGNvbGxhcHNlZDogdHJ1ZSxcclxuICAgICAgICAgIGl0ZW1zOiBzdWJJdGVtcyxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5uYW1lLmVuZHNXaXRoKFwiLm1kXCIpICYmIGVudHJ5Lm5hbWUgIT09IFwiaW5kZXgubWRcIikge1xyXG4gICAgICBjb25zdCBsaW5rUGF0aCA9IFwiL1wiICsgcmVsYXRpdmVQYXRoLnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpO1xyXG4gICAgICBjb25zdCB0aXRsZSA9IGV4dHJhY3RUaXRsZShmdWxsUGF0aCk7XHJcbiAgICAgIGl0ZW1zLnB1c2goeyB0ZXh0OiB0aXRsZSwgbGluazogbGlua1BhdGggfSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBpdGVtcztcclxufVxyXG5cclxuZnVuY3Rpb24gc2NhbkNoYWluKGNoYWluTmFtZTogc3RyaW5nKTogU2lkZWJhckl0ZW1bXSB7XHJcbiAgY29uc3QgY2hhaW5QYXRoID0gcGF0aC5qb2luKGRvY3NEaXIsIGNoYWluTmFtZSk7XHJcbiAgcmV0dXJuIHNjYW5Gb2xkZXIoY2hhaW5QYXRoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRDaGFpbnNTZWN0aW9uKFxyXG4gIHRpdGxlOiBzdHJpbmcsXHJcbiAgY2hhaW5zOiBBcnJheTx7XHJcbiAgICB0ZXh0OiBzdHJpbmc7XHJcbiAgICBpY29uOiBzdHJpbmc7XHJcbiAgICBkaXI6IHN0cmluZztcclxuICAgIGJhZGdlPzogc3RyaW5nO1xyXG4gICAgYmFkZ2VWYXJpYW50PzogXCJkZWZhdWx0XCIgfCBcImluZm9cIiB8IFwiYmV0YVwiIHwgXCJjYXV0aW9uXCI7XHJcbiAgfT5cclxuKTogU2lkZWJhckl0ZW0ge1xyXG4gIHJldHVybiB7XHJcbiAgICB0ZXh0OiB0aXRsZSxcclxuICAgIGl0ZW1zOiBjaGFpbnMubWFwKChjKSA9PiAoe1xyXG4gICAgICB0ZXh0OiBjLnRleHQsXHJcbiAgICAgIGNvbGxhcHNlZDogdHJ1ZSxcclxuICAgICAgaWNvbjogYy5pY29uLFxyXG4gICAgICBiYWRnZTogYy5iYWRnZSxcclxuICAgICAgYmFkZ2VWYXJpYW50OiBjLmJhZGdlVmFyaWFudCxcclxuICAgICAgaXRlbXM6IHNjYW5DaGFpbihjLmRpciksXHJcbiAgICB9KSksXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNpZGViYXIoKTogUmVjb3JkPHN0cmluZywgU2lkZWJhckl0ZW1bXT4ge1xyXG4gIGNvbnN0IGd1aWRlOiBTaWRlYmFySXRlbVtdID0gW1xyXG4gICAgeyB0ZXh0OiBcIlx1OEQ3N1x1NkU5MFwiLCBsaW5rOiBcIi9ndWlkZS8wMV9vdmVydmlld1wiIH0sXHJcbiAgICB7IHRleHQ6IFwiXHU1MzNBXHU1NzU3XHU5NEZFXHU1MzlGXHU3NDA2XCIsIGxpbms6IFwiL2d1aWRlLzAyX2Jhc2ljcy8wMV9ibG9ja2NoYWluLXByaW5jaXBsZXNcIiB9LFxyXG4gICAgeyB0ZXh0OiBcIlx1NUJDNlx1NzgwMVx1NUI2NlwiLCBsaW5rOiBcIi9ndWlkZS8wMl9iYXNpY3MvMDJfY3J5cHRvZ3JhcGh5XCIgfSxcclxuICAgIHsgdGV4dDogXCJcdTUyMDZcdTVFMDNcdTVGMEZcdTdDRkJcdTdFREZcIiwgbGluazogXCIvZ3VpZGUvMDJfYmFzaWNzLzAzX2Rpc3RyaWJ1dGVkLXN5c3RlbXNcIiB9LFxyXG4gICAgeyB0ZXh0OiBcIklQRlNcIiwgbGluazogXCIvZ3VpZGUvMDNfaXBmc1wiIH0sXHJcbiAgICB7XHJcbiAgICAgIHRleHQ6IFwiXHU2NjdBXHU4MEZEXHU1NDA4XHU3RUE2XCIsXHJcbiAgICAgIGl0ZW1zOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdGV4dDogXCJTb2xpZGl0eVwiLFxyXG4gICAgICAgICAgY29sbGFwc2VkOiB0cnVlLFxyXG4gICAgICAgICAgaWNvbjogXCJzb2xpZGl0eS5zdmdcIixcclxuICAgICAgICAgIGl0ZW1zOiBzY2FuQ2hhaW4oXCJzb2xpZGl0eVwiKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHRleHQ6IFwiTW92ZVwiLFxyXG4gICAgICAgICAgY29sbGFwc2VkOiB0cnVlLFxyXG4gICAgICAgICAgaWNvbjogXCJtb3ZlLnN2Z1wiLFxyXG4gICAgICAgICAgaXRlbXM6IHNjYW5DaGFpbihcIm1vdmVcIiksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgXTtcclxuXHJcbiAgY29uc3QgbDFDaGFpbnMgPSBbXHJcbiAgICB7IHRleHQ6IFwiU29sYW5hXCIsIGljb246IFwic29sYW5hLnN2Z1wiLCBkaXI6IFwic29sYW5hXCIgfSxcclxuICAgIHsgdGV4dDogXCJTdWlcIiwgaWNvbjogXCJzdWkuc3ZnXCIsIGRpcjogXCJzdWlcIiB9LFxyXG4gICAgeyB0ZXh0OiBcIkFwdG9zXCIsIGljb246IFwiYXB0b3Muc3ZnXCIsIGRpcjogXCJhcHRvc1wiIH0sXHJcbiAgXTtcclxuXHJcbiAgY29uc3QgZXZtQ2hhaW5zID0gW1xyXG4gICAgeyB0ZXh0OiBcIkV0aGVyZXVtXCIsIGljb246IFwiZXRoZXJldW0uc3ZnXCIsIGRpcjogXCJldGhlcmV1bVwiIH0sXHJcbiAgICB7XHJcbiAgICAgIHRleHQ6IFwiQXJiaXRydW1cIixcclxuICAgICAgaWNvbjogXCJhcmJpdHJ1bS5zdmdcIixcclxuICAgICAgZGlyOiBcImFyYml0cnVtXCIsXHJcbiAgICAgIGJhZGdlOiBcIkxheWVyMlwiLFxyXG4gICAgICBiYWRnZVZhcmlhbnQ6IFwiaW5mb1wiLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgdGV4dDogXCJCYXNlXCIsXHJcbiAgICAgIGljb246IFwiYmFzZS5zdmdcIixcclxuICAgICAgZGlyOiBcImJhc2VcIixcclxuICAgICAgYmFkZ2U6IFwiTGF5ZXIyXCIsXHJcbiAgICAgIGJhZGdlVmFyaWFudDogXCJpbmZvXCIsXHJcbiAgICB9LFxyXG4gICAgeyB0ZXh0OiBcIlZlQ2hhaW5cIiwgaWNvbjogXCJ2ZXQuc3ZnXCIsIGRpcjogXCJ2ZWNoYWluXCIgfSxcclxuICAgIHsgdGV4dDogXCJNb25hZFwiLCBpY29uOiBcIm1vbmFkLnN2Z1wiLCBkaXI6IFwibW9uYWRcIiB9LFxyXG4gIF07XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBcIi9cIjogW1xyXG4gICAgICAuLi5ndWlkZSxcclxuICAgICAgYnVpbGRDaGFpbnNTZWN0aW9uKFwiTGF5ZXIgMVwiLCBsMUNoYWlucyksXHJcbiAgICAgIGJ1aWxkQ2hhaW5zU2VjdGlvbihcIkVWTVx1OTRGRVwiLCBldm1DaGFpbnMpLFxyXG4gICAgXSxcclxuICB9O1xyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZHJlYW1cXFxcRG9jdW1lbnRzXFxcXGJsb2NrY2hhaW4tZG9jc1xcXFwudml0ZXByZXNzXFxcXHBsdWdpbnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRyZWFtXFxcXERvY3VtZW50c1xcXFxibG9ja2NoYWluLWRvY3NcXFxcLnZpdGVwcmVzc1xcXFxwbHVnaW5zXFxcXGtleXdvcmRUaXBQbHVnaW4udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RyZWFtL0RvY3VtZW50cy9ibG9ja2NoYWluLWRvY3MvLnZpdGVwcmVzcy9wbHVnaW5zL2tleXdvcmRUaXBQbHVnaW4udHNcIjtpbXBvcnQgdHlwZSBNYXJrZG93bkl0IGZyb20gJ21hcmtkb3duLWl0J1xyXG5cclxuaW50ZXJmYWNlIE9wdGlvbnMge1xyXG4gIGtleXdvcmRzOiBSZWNvcmQ8c3RyaW5nLCB7IGZpbGU6IHN0cmluZzsgbGFuZz86IHN0cmluZyB9PlxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBLZXl3b3JkVGlwUGx1Z2luKG1kOiBNYXJrZG93bkl0LCBvcHRpb25zOiBPcHRpb25zKSB7XHJcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG9wdGlvbnMua2V5d29yZHMpXHJcblxyXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXHJcblxyXG4gIC8vIFx1NzUyOFx1NkI2M1x1NTIxOVx1NTMzOVx1OTE0RFx1NjI0MFx1NjcwOVx1NTE3M1x1OTUyRVx1NUI1N1xyXG4gIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXFxcXGIoJHtrZXlzLmpvaW4oJ3wnKX0pXFxcXGJgLCAnZycpXHJcblxyXG4gIG1kLmNvcmUucnVsZXIuYWZ0ZXIoJ2lubGluZScsICdrZXl3b3JkLXRpcCcsIChzdGF0ZSkgPT4ge1xyXG4gICAgc3RhdGUudG9rZW5zLmZvckVhY2goKGJsb2NrVG9rZW4pID0+IHtcclxuICAgICAgaWYgKGJsb2NrVG9rZW4udHlwZSAhPT0gJ2lubGluZScpIHJldHVyblxyXG4gICAgICBibG9ja1Rva2VuLmNoaWxkcmVuPy5mb3JFYWNoKCh0b2tlbiwgaWR4KSA9PiB7XHJcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICd0ZXh0Jykge1xyXG4gICAgICAgICAgY29uc3QgdGV4dCA9IHRva2VuLmNvbnRlbnRcclxuICAgICAgICAgIGlmIChyZWdleC50ZXN0KHRleHQpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1Rva2VuczogYW55W10gPSBbXVxyXG4gICAgICAgICAgICBsZXQgbGFzdEluZGV4ID0gMFxyXG4gICAgICAgICAgICB0ZXh0LnJlcGxhY2UocmVnZXgsIChtYXRjaCwgX3AxLCBvZmZzZXQpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBiZWZvcmUgPSB0ZXh0LnNsaWNlKGxhc3RJbmRleCwgb2Zmc2V0KVxyXG4gICAgICAgICAgICAgIGlmIChiZWZvcmUpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICBjb250ZW50OiBiZWZvcmUsXHJcbiAgICAgICAgICAgICAgICAgIGxldmVsOiB0b2tlbi5sZXZlbCxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBjb25zdCB7IGZpbGUsIGxhbmcgfSA9IG9wdGlvbnMua2V5d29yZHNbbWF0Y2hdXHJcblxyXG4gICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdodG1sX2lubGluZScsXHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiBgPEtleXdvcmRUaXAga2V5d29yZD1cIiR7bWF0Y2h9XCIgZmlsZT1cIiR7ZmlsZX1cIiBsYW5nPVwiJHtsYW5nIHx8ICd0cyd9XCIgLz5gLFxyXG4gICAgICAgICAgICAgICAgbGV2ZWw6IHRva2VuLmxldmVsLFxyXG4gICAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAgIGxhc3RJbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aFxyXG4gICAgICAgICAgICAgIHJldHVybiBtYXRjaFxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYWZ0ZXIgPSB0ZXh0LnNsaWNlKGxhc3RJbmRleClcclxuICAgICAgICAgICAgaWYgKGFmdGVyKSB7XHJcbiAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgY29udGVudDogYWZ0ZXIsXHJcbiAgICAgICAgICAgICAgICBsZXZlbDogdG9rZW4ubGV2ZWwsXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gXHU2NkZGXHU2MzYyXHU1RjUzXHU1MjREIHRva2VuXHJcbiAgICAgICAgICAgIGJsb2NrVG9rZW4uY2hpbGRyZW4gPSBbXHJcbiAgICAgICAgICAgICAgLi4uKGJsb2NrVG9rZW4uY2hpbGRyZW4gYXMgYW55KS5zbGljZSgwLCBpZHgpLFxyXG4gICAgICAgICAgICAgIC4uLm5ld1Rva2VucyxcclxuICAgICAgICAgICAgICAuLi4oYmxvY2tUb2tlbi5jaGlsZHJlbiBhcyBhbnkpLnNsaWNlKGlkeCArIDEpLFxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICB9KVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1UsU0FBUyxvQkFBb0I7QUFDNVcsU0FBUyxlQUFlLFdBQVc7OztBQ0Q0UyxPQUFPLFFBQVE7QUFDOVYsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sWUFBWTtBQUZuQixJQUFNLG1DQUFtQztBQWN6QyxJQUFNLFVBQVUsS0FBSyxLQUFLLGtDQUFXLFNBQVM7QUFFOUMsU0FBUyxhQUFhLFVBQTBCO0FBQzlDLE1BQUk7QUFDRixVQUFNLFVBQVUsR0FBRyxhQUFhLFVBQVUsT0FBTztBQUNqRCxVQUFNLEVBQUUsU0FBUyxTQUFTLElBQUksT0FBTyxPQUFPO0FBQzVDLFVBQU0sUUFBUSxTQUFTLE1BQU0sYUFBYTtBQUMxQyxRQUFJLFNBQVMsTUFBTSxDQUFDLEVBQUcsUUFBTyxNQUFNLENBQUM7QUFDckMsVUFBTSxXQUFXLEtBQUssU0FBUyxVQUFVLEtBQUs7QUFDOUMsV0FBTyxtQkFBbUIsUUFBUTtBQUFBLEVBQ3BD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

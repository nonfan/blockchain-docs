import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface SidebarItem {
  text: string;
  collapsed?: boolean;
  icon?: string;
  items?: SidebarItem[];
  link?: string;
}

const docsDir = path.join(__dirname, "../docs");

/**
 * 从文件中提取标题（优先级：H1 > 智能文件名解析）
 */
function extractTitle(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { content: markdown } = matter(content);

    // 尝试提取 H1 标题
    const match = markdown.match(/^#\s+(.+)$/m);
    if (match && match[1]) {
      return match[1];
    }

    // 回退到文件名智能解析
    const filename = path.basename(filePath, ".md");
    return smartParseFilename(filename);
  } catch {
    const filename = path.basename(filePath, ".md");
    return smartParseFilename(filename);
  }
}

/**
 * 智能解析文件名
 * 例如：01_quick-start → Quick Start
 */
function smartParseFilename(filename: string): string {
  // 移除数字前缀
  let name = filename.replace(/^\d+_/, "");

  // // 特殊词汇映射（保留少量核心的）
  // const specialCases: Record<string, string> = {
  //   intro: "公链概述",
  //   "contract-deploy": "合约部署升级",
  //   "self-signature": "自签名交易",
  //   ethers_js: "Ethers.js",
  //   "json-rpc": "JSON-RPC",
  // };

  // if (specialCases[name]) {
  //   return specialCases[name];
  // }

  // 将连字符和下划线替换为空格
  name = name.replace(/[-_]/g, " ");

  // 每个单词首字母大写
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 智能解析文件夹名称
 * 例如：03_move → Move
 */
function smartParseFolderName(folderName: string): string {
  // 移除数字前缀
  let name = folderName.replace(/^\d+_/, "");

  // 特殊文件夹映射
  const specialFolders: Record<string, string> = {
    sdks: "SDKs",
    sdk: "SDK",
    ecosystem: "生态标准与工具链",
    openzeppelin: "OpenZeppelin",
    "react-usage": "React Usages",
  };

  if (specialFolders[name]) {
    return specialFolders[name];
  }

  // 将连字符和下划线替换为空格
  name = name.replace(/[-_]/g, " ");

  // 每个单词首字母大写
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 从文件/文件夹名提取排序权重
 */
function getSortOrder(name: string): number {
  const match = name.match(/^(\d+)_/);
  return match ? parseInt(match[1]) : 999;
}

/**
 * 递归扫描文件夹生成 sidebar
 */
function scanFolder(folderPath: string, basePath: string): SidebarItem[] {
  const items: SidebarItem[] = [];

  if (!fs.existsSync(folderPath)) {
    return items;
  }

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  // 按数字前缀排序
  entries.sort((a, b) => {
    const aOrder = getSortOrder(a.name);
    const bOrder = getSortOrder(b.name);

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relativePath = path.relative(docsDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      // 递归处理子文件夹
      const subItems = scanFolder(fullPath, basePath);

      if (subItems.length > 0) {
        items.push({
          text: smartParseFolderName(entry.name),
          collapsed: true,
          items: subItems,
        });
      }
    } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
      // 处理 markdown 文件
      const linkPath = "/" + relativePath.replace(/\.md$/, "");
      const title = extractTitle(fullPath);

      items.push({
        text: title,
        link: linkPath,
      });
    }
  }

  return items;
}

/**
 * 扫描指定公链文件夹
 */
function scanChain(chainName: string): SidebarItem[] {
  const chainPath = path.join(docsDir, chainName);
  return scanFolder(chainPath, `/${chainName}`);
}

/**
 * 主 Sidebar 配置
 */
export function getSidebar(): Record<string, SidebarItem[]> {
  return {
    "/": [
      // ============ 基础章节 ============
      {
        text: "起源",
        link: "/guide/01_overview",
      },
      {
        text: "区块链原理",
        link: "/guide/02_basics/01_blockchain-principles",
      },
      {
        text: "密码学",
        link: "/guide/02_basics/02_cryptography",
      },
      {
        text: "分布式系统",
        link: "/guide/02_basics/03_distributed-systems",
      },
      {
        text: "IPFS",
        link: "/guide/03_ipfs",
      },
      {
        text: "智能合约",
        items: [
          {
            text: "Solidity",
            collapsed: true,
            icon: "solidity.svg",
            items: scanChain("solidity"),
          },
          {
            text: "Move",
            collapsed: true,
            icon: "move.svg",
            items: scanChain("move"),
          },
        ],
      },

      // ============ 公链章节（完全自动扫描）============
      {
        text: "Layer 1",
        items: [
          {
            text: "Solana",
            collapsed: true,
            icon: "solana.svg",
            items: scanChain("solana"),
          },
          {
            text: "Sui",
            collapsed: true,
            icon: "sui.svg",
            items: scanChain("sui"),
          },
          {
            text: "Aptos",
            collapsed: true,
            icon: "aptos.svg",
            items: scanChain("aptos"),
          },
        ],
      },

      // ============ EVM 链章节（完全自动扫描）============
      {
        text: "EVM链",
        items: [
          {
            text: "Ethereum",
            collapsed: true,
            icon: "ethereum.svg",
            items: scanChain("ethereum"),
          },
          {
            text: "VeChain",
            collapsed: true,
            icon: "vet.svg",
            items: scanChain("vechain"),
          },
          {
            text: "Monad",
            collapsed: true,
            icon: "monad.svg",
            items: scanChain("monad"),
          },
        ],
      },
    ],
  };
}

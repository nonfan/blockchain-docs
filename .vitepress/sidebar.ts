import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface SidebarItem {
  text: string;
  collapsed?: boolean;
  icon?: string;
  items?: SidebarItem[];
  link?: string;
  badge?: string;
  badgeVariant?: "default" | "info" | "beta" | "caution";
}

const docsDir = path.join(__dirname, "../docs");

function extractTitle(filePath: string): string {
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

function smartParseFilename(filename: string): string {
  let name = filename.replace(/^\d+_/, "");
  name = name.replace(/[-_]/g, " ");
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function smartParseFolderName(folderName: string): string {
  let name = folderName.replace(/^\d+_/, "");
  const specialFolders: Record<string, string> = {
    sdks: "SDKs",
    sdk: "SDK",
    ecosystem: "生态标准与工具链",
    openzeppelin: "OpenZeppelin",
    "react-usage": "React Usages",
  };
  if (specialFolders[name]) return specialFolders[name];
  name = name.replace(/[-_]/g, " ");
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSortOrder(name: string): number {
  const match = name.match(/^(\d+)_/);
  return match ? parseInt(match[1]) : 999;
}

function scanFolder(folderPath: string): SidebarItem[] {
  const items: SidebarItem[] = [];
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
          items: subItems,
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

function scanChain(chainName: string): SidebarItem[] {
  const chainPath = path.join(docsDir, chainName);
  return scanFolder(chainPath);
}

function buildChainsSection(
  title: string,
  chains: Array<{
    text: string;
    icon: string;
    dir: string;
    badge?: string;
    badgeVariant?: "default" | "info" | "beta" | "caution";
  }>
): SidebarItem {
  return {
    text: title,
    items: chains.map((c) => ({
      text: c.text,
      collapsed: true,
      icon: c.icon,
      badge: c.badge,
      badgeVariant: c.badgeVariant,
      items: scanChain(c.dir),
    })),
  };
}

export function getSidebar(): Record<string, SidebarItem[]> {
  const guide: SidebarItem[] = [
    { text: "起源", link: "/guide/01_overview" },
    { text: "区块链原理", link: "/guide/02_basics/01_blockchain-principles" },
    { text: "密码学", link: "/guide/02_basics/02_cryptography" },
    { text: "分布式系统", link: "/guide/02_basics/03_distributed-systems" },
    { text: "IPFS", link: "/guide/03_ipfs" },
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
  ];

  const l1Chains = [
    { text: "Solana", icon: "solana.svg", dir: "solana" },
    { text: "Sui", icon: "sui.svg", dir: "sui" },
    { text: "Aptos", icon: "aptos.svg", dir: "aptos" },
  ];

  const evmChains = [
    { text: "Ethereum", icon: "ethereum.svg", dir: "ethereum" },
    {
      text: "Arbitrum",
      icon: "arbitrum.svg",
      dir: "arbitrum",
      badge: "Layer2",
      badgeVariant: "info",
    },
    {
      text: "Base",
      icon: "base.svg",
      dir: "base",
      badge: "Layer2",
      badgeVariant: "info",
    },
    { text: "VeChain", icon: "vet.svg", dir: "vechain" },
    { text: "Monad", icon: "monad.svg", dir: "monad" },
  ];

  return {
    "/": [
      ...guide,
      buildChainsSection("Layer 1", l1Chains),
      buildChainsSection("EVM链", evmChains),
    ],
  };
}

import fs from 'fs'
import path from 'path'

interface SidebarItem {
  text: string
  collapsed?: boolean
  icon?: string
  items?: SidebarItem[]
  link?: string
}

const docsDir = path.join(__dirname, '../docs')

/**
 * 从 markdown 文件中提取标题
 */
function extractTitle(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

/**
 * 从文件名生成显示文本
 */
function generateTextFromFilename(filename: string): string {
  // 移除扩展名和数字前缀
  const name = filename.replace(/\.md$/, '').replace(/^\d+_/, '')

  // 特殊映射
  const textMap: Record<string, string> = {
    'intro': '公链概览',
    'ethers_js': 'Ethers.js',
    'json-rpc': 'JSON-RPC',
    'viem': 'Viem',
    'wagmi': 'Wagmi',
    'hardhat': 'Hardhat',
    'testing': 'Testing',
    'contract-deploy': '合约部署升级',
    'connex': 'Connex',
    'self-signature': '自签名交易',
    'thor-client': 'ThorClient',
    'clause': 'Clause',
    'transaction': 'Transaction',
    'contract': 'Contract',
    'utils': 'Utils',
    'wallet': 'Wallet'
  }

  return textMap[name] || name
}

/**
 * 递归扫描文件夹生成 sidebar
 */
function scanFolder(folderPath: string, basePath: string): SidebarItem[] {
  const items: SidebarItem[] = []

  if (!fs.existsSync(folderPath)) {
    return items
  }

  const entries = fs.readdirSync(folderPath, { withFileTypes: true })

  // 按文件名排序（数字前缀优先）
  entries.sort((a, b) => {
    const aMatch = a.name.match(/^(\d+)_/)
    const bMatch = b.name.match(/^(\d+)_/)

    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1])
    }
    if (aMatch) return -1
    if (bMatch) return 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name)
    const relativePath = path.relative(docsDir, fullPath).replace(/\\/g, '/')

    if (entry.isDirectory()) {
      // 递归处理子文件夹
      const subItems = scanFolder(fullPath, basePath)

      if (subItems.length > 0) {
        // 特殊文件夹名称映射
        const folderNameMap: Record<string, string> = {
          'sdks': 'SDKs',
          'sdk': 'SDK',
          'token': '代币',
          'ecosystem': '生态标准与工具链',
          'openzeppelin': 'OpenZeppelin',
          'react-usage': 'React Usages'
        }

        items.push({
          text: folderNameMap[entry.name] || entry.name,
          collapsed: true,
          items: subItems
        })
      }
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      // 处理 markdown 文件
      const linkPath = '/' + relativePath.replace(/\.md$/, '')
      const title = extractTitle(fullPath)
      const displayText = title || generateTextFromFilename(entry.name)

      items.push({
        text: displayText,
        link: linkPath
      })
    }
  }

  return items
}

/**
 * 扫描指定公链文件夹
 */
function scanChain(chainName: string): SidebarItem[] {
  const chainPath = path.join(docsDir, chainName)
  return scanFolder(chainPath, `/${chainName}`)
}

/**
 * 生成 Solidity 专用的 sidebar（带特殊结构）
 */
function generateSoliditySidebar(): SidebarItem[] {
  const solidityPath = path.join(docsDir, 'ethereum/solidity')
  const items: SidebarItem[] = []

  // 扫描主文件
  const mainFiles = fs.readdirSync(solidityPath)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/^(\d+)_/)?.[1] || '999')
      const bNum = parseInt(b.match(/^(\d+)_/)?.[1] || '999')
      return aNum - bNum
    })

  for (const file of mainFiles) {
    const filePath = path.join(solidityPath, file)
    const title = extractTitle(filePath)

    items.push({
      text: title || generateTextFromFilename(file),
      link: `/ethereum/solidity/${file.replace('.md', '')}`
    })
  }

  // 处理 ecosystem 文件夹
  const ecosystemPath = path.join(solidityPath, 'ecosystem')
  if (fs.existsSync(ecosystemPath)) {
    const ecosystemItems: SidebarItem[] = []

    // OpenZeppelin 文件夹
    const ozPath = path.join(ecosystemPath, 'openzeppelin')
    if (fs.existsSync(ozPath)) {
      const ozItems = fs.readdirSync(ozPath)
        .filter(f => f.endsWith('.md'))
        .sort()
        .map(file => {
          const filePath = path.join(ozPath, file)
          const title = extractTitle(filePath)
          return {
            text: title || generateTextFromFilename(file),
            link: `/ethereum/solidity/ecosystem/openzeppelin/${file.replace('.md', '')}`
          }
        })

      ecosystemItems.push({
        text: 'OpenZeppelin',
        collapsed: true,
        items: ozItems
      })
    }

    // 其他 ecosystem 文件
    const ecosystemFiles = fs.readdirSync(ecosystemPath)
      .filter(f => f.endsWith('.md'))

    for (const file of ecosystemFiles) {
      const filePath = path.join(ecosystemPath, file)
      const title = extractTitle(filePath)

      ecosystemItems.push({
        text: title || generateTextFromFilename(file),
        link: `/ethereum/solidity/ecosystem/${file.replace('.md', '')}`
      })
    }

    items.push({
      text: '生态标准与工具链',
      collapsed: true,
      items: ecosystemItems
    })
  }

  return items
}

/**
 * 生成 Ethereum SDKs sidebar
 */
function generateEthereumSDKsSidebar(): SidebarItem[] {
  const sdksPath = path.join(docsDir, 'ethereum/sdks')
  return scanFolder(sdksPath, '/ethereum/sdks')
}

/**
 * 主 Sidebar 配置
 */
export function getSidebar(): Record<string, SidebarItem[]> {
  return {
    '/': [
      // ============ 基础章节 ============
      {
        text: '起源',
        link: '/guide/overview'
      },
      {
        text: '区块链原理',
        link: '/guide/basics/blockchain-principles'
      },
      {
        text: '密码学',
        link: '/guide/basics/cryptography'
      },
      {
        text: '分布式系统',
        link: '/guide/basics/distributed-systems'
      },
      {
        text: 'IPFS',
        link: '/guide/ipfs'
      },

      // ============ 公链章节（自动扫描）============
      {
        text: 'Layer 1',
        items: [
          {
            text: 'Solana',
            collapsed: true,
            icon: 'solana.svg',
            items: scanChain('solana')
          },
          {
            text: 'Sui',
            collapsed: true,
            icon: 'sui.svg',
            items: scanChain('sui')
          }
        ]
      },

      // ============ EVM 链章节（自动扫描）============
      {
        text: 'EVM链',
        items: [
          {
            text: 'Ethereum',
            collapsed: true,
            icon: 'ethereum.svg',
            items: [
              {
                text: '公链概览',
                link: '/ethereum/intro'
              },
              {
                text: 'Solidity',
                collapsed: true,
                items: generateSoliditySidebar()
              },
              {
                text: 'SDKs',
                items: generateEthereumSDKsSidebar()
              }
            ]
          },
          {
            text: 'VeChain',
            collapsed: true,
            icon: 'vet.svg',
            items: scanChain('vechain')
          },
          {
            text: 'Monad',
            collapsed: true,
            icon: 'monad.svg',
            items: scanChain('monad')
          }
        ]
      }
    ]
  }
}

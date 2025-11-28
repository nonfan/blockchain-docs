# Sidebar 配置说明（自动扫描版）

本文档说明基于文件夹自动扫描的 `.vitepress/sidebar.ts` 配置方式。

## 📁 核心设计理念

新的 sidebar 采用**自动文件夹扫描**：
- ✅ 自动扫描 `docs/` 文件夹
- ✅ 根据文件名和文件夹结构生成菜单
- ✅ 自动提取 markdown 文件的一级标题作为显示文本
- ✅ 支持数字前缀排序（如 `01_basic.md`）
- ✅ 最小化手动配置

## 🎯 工作原理

### 1. 自动扫描机制

```typescript
// 自动扫描指定公链文件夹
const solanaItems = scanChain('solana')  // 扫描 docs/solana/
const vechainItems = scanChain('vechain') // 扫描 docs/vechain/
```

**扫描规则：**
1. 递归扫描所有子文件夹
2. 自动读取 `.md` 文件
3. 提取文件中的 `# 标题` 作为显示文本
4. 按数字前缀排序（`01_`、`02_`...）
5. 生成正确的链接路径

### 2. 文件命名规范

为了让自动扫描正常工作，请遵循以下命名规范：

```
docs/
├── solana/
│   ├── intro.md              # ✅ 文件名 → 自动映射为"公链概览"
│   ├── spl-token.md          # ✅ 提取文件内的一级标题
│   └── token/
│       ├── ft.md             # ✅ 自动映射为"同质化代币"
│       └── nft.md            # ✅ 自动映射为"非同质化代币"
│
├── ethereum/
│   └── solidity/
│       ├── 01_basic.md       # ✅ 01 开头，排第一位
│       ├── 02_structure.md   # ✅ 02 开头，排第二位
│       └── 03_interactions.md
```

**命名建议：**
- 使用数字前缀控制顺序：`01_`, `02_`, `03_`...
- 文件名使用英文和下划线：`contract-deploy.md`
- 一级标题使用中文：`# 合约部署升级`

## 🔧 核心函数说明

### extractTitle(filePath)

从 markdown 文件中提取一级标题：

```typescript
// 文件内容：
// # Proxy
//
// 合约可升级：在不改变地址的情况下升级逻辑

extractTitle('04_proxy.md')  // 返回 "Proxy"
```

### generateTextFromFilename(filename)

当文件没有标题时，从文件名生成显示文本：

```typescript
generateTextFromFilename('01_basic.md')      // 返回 "basic"
generateTextFromFilename('intro.md')         // 返回 "公链概览"（特殊映射）
generateTextFromFilename('contract-deploy.md') // 返回 "合约部署升级"（特殊映射）
```

**特殊映射表：**

| 文件名 | 显示文本 |
|--------|----------|
| `intro.md` | 公链概览 |
| `ethers_js.md` | Ethers.js |
| `json-rpc.md` | JSON-RPC |
| `ft.md` | 同质化代币 |
| `nft.md` | 非同质化代币 |
| `contract-deploy.md` | 合约部署升级 |

### scanFolder(folderPath, basePath)

递归扫描文件夹并生成 sidebar 结构：

```typescript
scanFolder('/docs/vechain', '/vechain')
// 返回：
// [
//   { text: '公链概览', link: '/vechain/intro' },
//   { text: '合约部署升级', link: '/vechain/contract-deploy' },
//   {
//     text: 'SDKs',
//     collapsed: true,
//     items: [
//       { text: 'Connex', link: '/vechain/sdks/connex' },
//       // ...
//     ]
//   }
// ]
```

**特殊文件夹映射：**

| 文件夹名 | 显示文本 |
|----------|----------|
| `sdks` | SDKs |
| `sdk` | SDK |
| `token` | 代币 |
| `ecosystem` | 生态标准与工具链 |
| `openzeppelin` | OpenZeppelin |
| `react-usage` | React Usages |

### scanChain(chainName)

便捷函数，扫描指定公链的完整文件夹：

```typescript
scanChain('solana')   // 扫描 docs/solana/
scanChain('vechain')  // 扫描 docs/vechain/
scanChain('sui')      // 扫描 docs/sui/
```

## 📝 常见修改场景

### 1️⃣ 新增一篇文章

**场景：** 在 Solana 文件夹下新增一篇关于 Anchor 的文章

**步骤：**
1. 创建文件：`docs/solana/anchor.md`
2. 在文件开头添加标题：
   ```markdown
   # Anchor 框架

   Anchor 是 Solana 的开发框架...
   ```
3. 刷新页面，sidebar 会自动显示"Anchor 框架"

**无需修改 sidebar.ts！**

### 2️⃣ 新增一个文件夹

**场景：** 在 VeChain 下新增 `tutorials` 文件夹

**步骤：**
1. 创建文件夹：`docs/vechain/tutorials/`
2. 添加文章：`docs/vechain/tutorials/getting-started.md`
3. 如果需要自定义文件夹显示名称，在 `sidebar.ts` 中添加映射：
   ```typescript
   const folderNameMap: Record<string, string> = {
     'sdks': 'SDKs',
     'sdk': 'SDK',
     'token': '代币',
     'tutorials': '教程指南',  // 新增映射
     // ...
   }
   ```

### 3️⃣ 控制文章顺序

**方法 1：使用数字前缀**（推荐）

```
docs/solana/
├── 01_intro.md       # 第一篇
├── 02_install.md     # 第二篇
├── 03_program.md     # 第三篇
```

**方法 2：修改文件名**

文件按字母顺序排列，可以通过调整文件名来控制顺序：
```
docs/solana/
├── a_intro.md
├── b_install.md
├── c_program.md
```

### 4️⃣ 新增一个公链

**场景：** 新增 Avalanche 公链

**步骤：**
1. 创建文件夹和文件：
   ```
   docs/avalanche/
   ├── intro.md
   └── subnet.md
   ```

2. 在 `sidebar.ts` 的 `getSidebar()` 中添加：
   ```typescript
   {
     text: '公链',
     items: [
       {
         text: 'Solana',
         collapsed: true,
         icon: 'solana.svg',
         items: scanChain('solana')
       },
       // ✅ 新增 Avalanche
       {
         text: 'Avalanche',
         collapsed: true,
         icon: 'avalanche.svg',  // 记得添加图标到 docs/public/
         items: scanChain('avalanche')  // 自动扫描 docs/avalanche/
       }
     ]
   }
   ```

### 5️⃣ 修改文件名映射

**场景：** 文件名 `staking.md` 希望显示为"质押机制"

**步骤：**

在 `sidebar.ts` 的 `generateTextFromFilename` 函数中添加：

```typescript
const textMap: Record<string, string> = {
  'intro': '公链概览',
  'staking': '质押机制',  // ✅ 新增映射
  // ...
}
```

### 6️⃣ 自定义复杂结构

**场景：** Ethereum Solidity 需要特殊的嵌套结构

对于特殊需求，创建专门的生成函数：

```typescript
function generateSoliditySidebar(): SidebarItem[] {
  // 自定义扫描逻辑
  const items: SidebarItem[] = []

  // 扫描主文件
  const mainFiles = scanMainFiles()
  items.push(...mainFiles)

  // 处理 ecosystem 文件夹
  const ecosystemItems = scanEcosystem()
  items.push({
    text: '生态标准与工具链',
    collapsed: true,
    items: ecosystemItems
  })

  return items
}
```

## 🌟 最佳实践

### 1. 文件一级标题规范

**每个 markdown 文件都应该有明确的一级标题：**

```markdown
✅ 正确：
# Proxy

合约可升级：在不改变地址的情况下升级逻辑

---

❌ 错误（缺少标题）：
合约可升级：在不改变地址的情况下升级逻辑
```

### 2. 文件命名规范

- ✅ 使用小写字母和连字符：`contract-deploy.md`
- ✅ 数字前缀用于排序：`01_basic.md`
- ❌ 避免中文文件名：~~`合约部署.md`~~
- ❌ 避免空格：~~`my file.md`~~

### 3. 文件夹结构规范

```
✅ 清晰的层次结构：
docs/vechain/
├── intro.md
├── contract-deploy.md
└── sdks/
    ├── connex.md
    └── sdk/
        ├── thor-client.md
        └── transaction.md

❌ 过深的嵌套（影响导航）：
docs/vechain/
└── advanced/
    └── topics/
        └── deep-dive/
            └── tutorial.md  # 太深了
```

### 4. 图标文件管理

所有图标应放在 `docs/public/` 目录：

```
docs/public/
├── ethereum.svg
├── solana.svg
├── sui.svg
├── vet.svg
└── monad.svg
```

## 🔍 故障排查

### 问题 1：文章没有显示在 sidebar

**可能原因：**
- 文件不在 `docs/` 目录下
- 文件名是 `index.md`（会被自动忽略）
- 文件扩展名不是 `.md`

**解决方案：**
1. 检查文件路径
2. 重命名文件
3. 刷新页面

### 问题 2：文章显示文本不正确

**可能原因：**
- 文件没有一级标题
- 文件名没有在映射表中

**解决方案：**
1. 在文件开头添加 `# 标题`
2. 或在 `generateTextFromFilename` 中添加映射

### 问题 3：文章顺序不对

**可能原因：**
- 文件按字母顺序排列
- 没有使用数字前缀

**解决方案：**
- 重命名文件添加数字前缀：`01_`, `02_`, `03_`...

### 问题 4：新增公链后不显示

**可能原因：**
- 忘记在 `getSidebar()` 中添加配置
- 文件夹路径错误

**解决方案：**
1. 检查 `getSidebar()` 是否添加了 `scanChain('chainName')`
2. 确认文件夹在 `docs/chainName/` 下

## 🚀 进阶技巧

### 1. 批量修改文件名映射

如果有大量文件需要映射，可以创建独立的配置文件：

```typescript
// sidebar-config.ts
export const TEXT_MAPPINGS = {
  'intro': '公链概览',
  'install': '安装与配置',
  'tutorial': '快速开始',
  // ... 100+ 映射
}

// sidebar.ts
import { TEXT_MAPPINGS } from './sidebar-config'

function generateTextFromFilename(filename: string): string {
  const name = filename.replace(/\.md$/, '').replace(/^\d+_/, '')
  return TEXT_MAPPINGS[name] || name
}
```

### 2. 动态生成多级嵌套

对于复杂的嵌套结构，可以使用递归扫描：

```typescript
function scanFolderRecursive(path: string, maxDepth: number = 3): SidebarItem[] {
  // 递归扫描，最多 3 层深度
  // ...
}
```

### 3. 添加排序权重

为文件夹添加优先级排序：

```typescript
const folderPriority: Record<string, number> = {
  'intro': 1,
  'tutorial': 2,
  'advanced': 3
}

// 排序时使用权重
entries.sort((a, b) => {
  const priorityA = folderPriority[a.name] || 999
  const priorityB = folderPriority[b.name] || 999
  return priorityA - priorityB
})
```

## 📚 总结

新的自动扫描系统的优势：

1. **维护简单** - 新增文章只需创建文件，无需手动配置
2. **自动排序** - 使用数字前缀自动排序
3. **标题提取** - 自动读取文件标题作为显示文本
4. **灵活配置** - 支持映射表和自定义函数
5. **易于扩展** - 新增公链只需一行 `scanChain('name')`

**维护者：** 项目团队
**最后更新：** 2025-01-28

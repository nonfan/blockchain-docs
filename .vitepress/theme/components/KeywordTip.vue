<template>
  <span
    class="keyword-tip"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <template v-if="!href">
      <slot>{{ keyword }}</slot>
    </template>
    <template v-else>
      <a :href="href" target="_blank">
        <slot>{{ keyword }}</slot>
      </a>
    </template>

    <transition name="fade">
      <div v-if="show" class="tooltip">
        <div class="tooltip-code" v-html="highlighted"></div>
      </div>
    </transition>
  </span>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { createHighlighter } from 'shiki'

// ✅ 复用一个高亮器实例
let highlighterPromise: Promise<any> | null = null
async function getHighlighterInstance() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'javascript',
        'typescript',
        'vue',
        'json',
        'markdown',
        'tsx',
        'jsx',
        'solidity'
      ]
    })
  }
  return await highlighterPromise
}

// Props
const { keyword, file, lang, href } = defineProps<{
  keyword?: string
  file: string
  lang?: string
  href?: string
}>()

const show = ref(false)
const code = ref('加载中...')
const highlighted = ref('')

// glob 导入代码片段
const modules = import.meta.glob(
  '../../src/snippets/**/*.{ts,tsx,txt,js,vue,sol,md,json}',
  { query: '?raw', import: 'default' }
)

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

async function loadCode(fileName: string) {
  const key = Object.keys(modules).find(k => k.endsWith(fileName))
  if (!key) {
    return
  }

  let raw = await modules[key]()
  if (fileName.endsWith('.md')) {
    const m = raw.match(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/)
    if (m) raw = m[2].trim()
  }

  code.value = raw
  const ext = (lang || fileName.split('.').pop() || 'javascript').toLowerCase()

  const highlighter = await getHighlighterInstance()
  const theme = isDarkMode() ? 'github-dark' : 'github-light'
  highlighted.value = highlighter.codeToHtml(code.value, { lang: ext, theme })

  await nextTick()
}

function onMouseEnter() {
  show.value = true
  if (code.value === '加载中...') loadCode(file)
}
function onMouseLeave() {
  show.value = false
}

onMounted(() => {
  const obs = new MutationObserver(() => {
    if (code.value !== '加载中...') loadCode(file)
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
</script>

<style>
.tooltip-code pre {
  margin: 0;
  padding: 10px;
}

.github-light {
  background-color: #f6f6f7 !important;
}

.dark .github-dark {
  background-color: #161618 !important;
}
</style>

<style scoped>
.keyword-tip {
  position: relative;
  cursor: pointer;
  font-weight: 500;
  color: #B07D48;
  border-bottom: 1px dashed #B07D48;
}

.dark .keyword-tip {
  color: #BD976A;
  border-bottom: 1px dashed #BD976A;
}

.keyword-tip a {
  text-decoration: none;
  color: inherit;
}

.tooltip {
  position: absolute;
  top: 1.5rem;
  left: 0;
  z-index: 50;
  border-radius: 8px;
  max-width: 520px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  overflow: hidden;
}

/* Shiki 渲染出来的 pre 样式补充 */
.tooltip-code pre {
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-x: auto;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* ✅ 加背景和边框，避免白色主题透明 */
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 白天模式 */
html:not(.dark) .tooltip-code pre {
  background: #ffffff;
  color: #2d2d2d;
}

/* 夜间模式 */
html.dark .tooltip-code pre {
  background: #1e1e1e;
  color: #e5e7eb;
  border: 1px solid #374151;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

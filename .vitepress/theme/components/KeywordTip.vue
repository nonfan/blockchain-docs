<template>
  <span
    :class="['keyword-tip', !!file ? 'active' : '']"
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
<!--      <Teleport to="body">-->
        <div v-if="show" class="tooltip">
        <button
          class="tooltip-btn"
          :class="{ 'copied': isCopied }"
          @click="onCopy"
        >
          <!-- 使用 SVG 图标（复制图标） -->
          <svg
            v-if="!isCopied"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            width="25"
            height="25"
            fill="currentColor"
          >
            <path
              d="M672 832 224 832c-52.928 0-96-43.072-96-96L128 160c0-52.928 43.072-96 96-96l448 0c52.928 0 96 43.072 96 96l0 576C768 788.928 724.928 832 672 832zM224 128C206.368 128 192 142.368 192 160l0 576c0 17.664 14.368 32 32 32l448 0c17.664 0 32-14.336 32-32L704 160c0-17.632-14.336-32-32-32L224 128z"
            ></path>
            <path
              d="M800 960 320 960c-17.664 0-32-14.304-32-32s14.336-32 32-32l480 0c17.664 0 32-14.336 32-32L832 256c0-17.664 14.304-32 32-32s32 14.336 32 32l0 608C896 916.928 852.928 960 800 960z"
            ></path>
            <path
              d="M544 320 288 320c-17.664 0-32-14.336-32-32s14.336-32 32-32l256 0c17.696 0 32 14.336 32 32S561.696 320 544 320z"
            ></path>
            <path
              d="M608 480 288.032 480c-17.664 0-32-14.336-32-32s14.336-32 32-32L608 416c17.696 0 32 14.336 32 32S625.696 480 608 480z"
            ></path>
            <path
              d="M608 640 288 640c-17.664 0-32-14.304-32-32s14.336-32 32-32l320 0c17.696 0 32 14.304 32 32S625.696 640 608 640z"
            ></path>
          </svg>
          <!-- 复制成功图标（对勾） -->
          <svg
            v-if="isCopied"
            class="is-copied"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            width="25"
            height="25"
          >
            <path
              d="M416 672L224 480l-64 64 256 256 512-512-64-64z"
              fill="currentColor"
            ></path>
          </svg>
        </button>
        <div class="tooltip-code" v-html="highlighted"></div>
      </div>
<!--      </Teleport>-->
    </transition>
  </span>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { createHighlighter } from 'shiki'

// 复用一个高亮器实例
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
const isCopied = ref(false) // 新增：跟踪复制状态
let timer: ReturnType<typeof setTimeout> | null = null
let copyTimer: ReturnType<typeof setTimeout> | null = null // 新增：复制状态定时器

// glob 导入代码片段
const modules = import.meta.glob(
  '../../src/snippets/**/*.{ts,tsx,txt,js,vue,sol,md,json}',
  { query: '?raw', import: 'default' }
)

function onCopy() {
  if (code.value) {
    navigator.clipboard.writeText(code.value)
    isCopied.value = true // 设置复制状态
    // 2秒后恢复原始样式
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

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
    const m = (raw as any).match(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/)
    if (m) raw = m[2].trim()
  }

  code.value = raw as any
  const ext = (lang || fileName.split('.').pop() || 'javascript').toLowerCase()

  const highlighter = await getHighlighterInstance()
  const theme = isDarkMode() ? 'github-dark' : 'github-light'
  highlighted.value = highlighter.codeToHtml(code.value, { lang: ext, theme })

  await nextTick()
}

function onMouseEnter() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  show.value = true
  if (code.value === '加载中...') loadCode(file)
}

function onMouseLeave() {
  timer = setTimeout(() => {
    show.value = false
  }, 200) // 延迟隐藏，允许鼠标移到 tooltip
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
  padding: 10px 30px 10px 10px;
  border-radius: 10px;
}
.github-light {
  background-color: #f6f6f7 !important;
}

.dark .github-dark {
  background-color: #161618 !important;
}

.dark .tooltip-btn {
  color: #2d2d2d !important;
}

.dark .tooltip-btn:hover {
  color: #98989F !important;
}

.dark .is-copied {
  color: #aab1f9 !important;
}
</style>

<style scoped>
.tooltip-btn {
  position: absolute;
  top: 6px;
  right: 2px;
  border: none;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease, transform 0.2s ease;
}

.tooltip-btn:hover {
  color: #2d2d2d;
}

.is-copied {
  color: #3a50ac;
}

.tooltip-btn.copied {
  transform: scale(1.1); /* 轻微放大效果 */
}

.keyword-tip.active  {
  position: relative;
  cursor: pointer;
  font-weight: 500;
  color: #B07D48;
  border-bottom: 1px dashed #B07D48;
}

.dark .keyword-tip.active {
  color: #BD976A;
  border-bottom: 1px dashed #BD976A;
}

.active a {
  text-decoration: none;
  color: inherit;
}

.tooltip {
  position: absolute;
  top: 1.5rem;
  left: 0;
  z-index: 50;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
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

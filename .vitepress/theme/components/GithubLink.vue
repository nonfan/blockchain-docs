<template>
  <a
    :href="link"
    class="link-card no-zoom"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="text"
    :title="text"
  >
    <div class="left">
      <div class="icon">
        <!-- 自定义 icon -->
        <slot name="icon">
          <!-- 默认 icon -->
          <span :class="iconClass ?? 'logo-github'" />
        </slot>
      </div>

      <div class="content">
        <div class="title">{{ text }}</div>
        <div v-if="desc" class="desc">{{ desc }}</div>
      </div>
    </div>

    <div class="right">
      <span class="arrow">→</span>
    </div>
  </a>
</template>

<script setup lang="ts">
defineProps<{
  link: string;
  text: string;
  desc?: string;
  iconClass?: string;
}>();
</script>

<style scoped>
.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);

  background: var(--vp-c-bg);
  color: inherit;
  text-decoration: none;

  transition: all 0.25s ease;
}

.link-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon {
  width: 40px;
  height: 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

/* 让 slot 里的 svg / img 自动适配 */
.icon :deep(svg),
.icon :deep(img) {
  width: 24px;
  height: 24px;
}

/* 默认 GitHub 图标，适配主题色 */
.gh,
.logo-github {
  width: 24px;
  height: 24px;
  background: currentColor;
  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 .5C5.73.5.86 5.37.86 11.64c0 4.89 3.17 9.04 7.57 10.5.55.1.75-.24.75-.54 0-.27-.01-1.16-.02-2.1-3.08 .67-3.73-1.31-3.73-1.31-.5-1.26-1.21-1.6-1.21-1.6-.99-.68 .08-.66 .08-.66 1.1 .08 1.68 1.13 1.68 1.13 .98 1.67 2.57 1.19 3.2 .91 .1-.71 .38-1.19 .69-1.46-2.46-.28-5.05-1.23-5.05-5.49 0-1.21 .43-2.2 1.13-2.97-.11-.28-.49-1.42 .11-2.96 0 0 .92-.3 3.02 1.13 .88-.24 1.83-.36 2.77-.36 .94 0 1.89 .12 2.77 .36 2.1-1.43 3.02-1.13 3.02-1.13 .6 1.54 .22 2.68 .11 2.96 .7 .77 1.13 1.76 1.13 2.97 0 4.27-2.6 5.21-5.08 5.48 .39 .34 .74 1 .74 2.02 0 1.46-.01 2.63-.01 2.99 0 .3 .2 .65 .76 .54 4.39-1.47 7.56-5.62 7.56-10.5C23.14 5.37 18.27 .5 12 .5z"/></svg>')
    no-repeat center / contain;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M12 .5C5.73.5.86 5.37.86 11.64c0 4.89 3.17 9.04 7.57 10.5.55.1.75-.24.75-.54 0-.27-.01-1.16-.02-2.1-3.08 .67-3.73-1.31-3.73-1.31-.5-1.26-1.21-1.6-1.21-1.6-.99-.68 .08-.66 .08-.66 1.1 .08 1.68 1.13 1.68 1.13 .98 1.67 2.57 1.19 3.2 .91 .1-.71 .38-1.19 .69-1.46-2.46-.28-5.05-1.23-5.05-5.49 0-1.21 .43-2.2 1.13-2.97-.11-.28-.49-1.42 .11-2.96 0 0 .92-.3 3.02 1.13 .88-.24 1.83-.36 2.77-.36 .94 0 1.89 .12 2.77 .36 2.1-1.43 3.02-1.13 3.02-1.13 .6 1.54 .22 2.68 .11 2.96 .7 .77 1.13 1.76 1.13 2.97 0 4.27-2.6 5.21-5.08 5.48 .39 .34 .74 1 .74 2.02 0 1.46-.01 2.63-.01 2.99 0 .3 .2 .65 .76 .54 4.39-1.47 7.56-5.62 7.56-10.5C23.14 5.37 18.27 .5 12 .5z"/></svg>')
    no-repeat center / contain;
}

/* GitLab 图标（主题自适应） */
.logo-gitlab {
  width: 24px;
  height: 24px;
  background: currentColor;
  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M22 12.9l-2.02-6.26c-.12-.37-.62-.37-.74 0l-1.93 5.41-2.06-5.41c-.14-.37-.65-.37-.78 0l-2.06 5.41-1.93-5.41c-.12-.37-.62-.37-.74 0L2 12.9l10 8.6 10-8.6z"/></svg>')
    no-repeat center / contain;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="black" d="M22 12.9l-2.02-6.26c-.12-.37-.62-.37-.74 0l-1.93 5.41-2.06-5.41c-.14-.37-.65-.37-.78 0l-2.06 5.41-1.93-5.41c-.12-.37-.62-.37-.74 0L2 12.9l10 8.6 10-8.6z"/></svg>')
    no-repeat center / contain;
}

/* 默认 icon */
.default-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(
    135deg,
    var(--vp-c-brand),
    var(--vp-c-brand-dark)
  );
}

.content {
  display: flex;
  flex-direction: column;
}

.title {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
}

.desc {
  margin-top: 2px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.right {
  display: flex;
  align-items: center;
}

.arrow {
  font-size: 18px;
  opacity: 0.5;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.link-card:hover .arrow {
  transform: translateX(4px);
  opacity: 1;
}
</style>

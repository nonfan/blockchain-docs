<template>
  <div class="deprecated-icon" title="此图标已弃用">
    <svg
      class="icon"
      viewBox="0 0 1026 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
    >
      <path
        d="M1004.657 801.716 602.263 91.599c-49.213-86.817-129.646-86.817-178.866 0L21.004 801.716c-49.207 86.906-8.949 157.798 89.388 157.798l804.877 0C1013.606 959.514 1053.825 888.622 1004.657 801.716zM544.635 832.216l-63.649 0 0-63.649 63.649 0L544.635 832.216zM544.635 641.27l-63.649 0L480.986 259.377l63.649 0L544.635 641.27z"
        :fill="color"
      ></path>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  size: {
    type: [Number, String],
    default: 25
  },
  color: {
    type: String,
    default: '#d81e06'
  }
})
</script>

<style scoped>
.deprecated-icon {
  display: inline-block;
  opacity: 0.4; /* 表示弃用的视觉提示 */
}
.deprecated-icon .icon {
  vertical-align: middle;
}
</style>

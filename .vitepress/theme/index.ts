// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import KeywordTip from "./components/KeywordTip.vue";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {

    })
  },
  enhanceApp({ app, router, siteData }) {
    app.component('KeywordTip', KeywordTip);
  }
} satisfies Theme

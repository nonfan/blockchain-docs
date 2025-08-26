// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import KeywordTip from "./components/KeywordTip.vue";
import DeprecatedIcon from "./components/DeprecatedIcon.vue";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {

    })
  },
  enhanceApp({ app, router, siteData }) {
    app.component('KeywordTip', KeywordTip);
    app.component('DeprecatedIcon', DeprecatedIcon);
  }
} satisfies Theme

import { h, nextTick } from 'vue';
import DefaultTheme from 'vitepress/theme';
import { createMermaidRenderer } from 'vitepress-mermaid-renderer';
import 'vitepress-mermaid-renderer/dist/style.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {});
  },
  enhanceApp({ app, router }) {
    const mermaidRenderer = createMermaidRenderer();
    mermaidRenderer.initialize();
    if (router) {
      router.onAfterRouteChange = () => {
        nextTick(() => mermaidRenderer.renderMermaidDiagrams());
      };
    }
  },
};
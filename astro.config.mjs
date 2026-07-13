import { defineConfig } from 'astro/config';

// 静态站点配置 — 适配 GitHub Pages / Netlify / Cloudflare Pages
export default defineConfig({
  site: 'https://orientalvibe1314.com',
  base: '/',
  build: {
    // 预渲染所有页面，零服务器成本
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  vite: {
    build: {
      cssMinify: 'esbuild',
    },
  },
});

import { defineConfig } from 'drizzle-kit';

// Drizzle Kit 仅用于本地生成 migration SQL 与本地 D1 开发建库
// Cloudflare Pages 运行时直接绑定 env.DB（D1 binding），不需要本文件
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './.wrangler/dev.db',
  },
  verbose: true,
  strict: true,
});

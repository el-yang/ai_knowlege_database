import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 构建产物直接输出到 Spring Boot 的静态资源目录，
// 这样 mvn package / spring-boot:run 都不需要额外的拷贝步骤。
const staticDir = fileURLToPath(new URL('../src/main/resources/static', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: staticDir,
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // 开发时把接口请求转发给本地 Spring Boot
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})

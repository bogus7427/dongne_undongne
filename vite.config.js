import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 의 값을 서버 쪽(process.env)에서도 읽을 수 있게 해 줘요. (DATA_GO_KR_KEY 등)
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [react(), localApi()],
  }
})

// 개발할 때(npm run dev)도 /api/... 서버리스 함수가 동작하게 해 주는 작은 플러그인
// 예: /api/vouchers?... → api/vouchers.js 실행
// 배포하면 Vercel이 api/ 폴더를 서버리스 함수로 자동 실행하므로 이 플러그인은 쓰이지 않아요.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const name = new URL(req.url, 'http://localhost').pathname.slice(1) // "vouchers"
        if (!/^[a-z][a-z-]*$/.test(name)) return next() // _lib 같은 내부 파일은 실행 안 함
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          await mod.default(req, res)
        } catch (err) {
          console.error(err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: '개발 서버에서 API 실행 중 오류가 났어요.' }))
        }
      })
    },
  }
}

# 02. Tailwind CSS & shadcn/ui セットアップ

TanStack Start に Tailwind CSS v4 と shadcn/ui を導入する手順。

---

## 1. Tailwind CSS v4 のインストール

Tailwind v4 は PostCSS ではなく **Vite プラグイン** で動作する。

```bash
npm install tailwindcss @tailwindcss/vite
```

---

## 2. `vite.config.ts` に Tailwind プラグインを追加

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
})
```

---

## 3. CSS ファイルの作成

`src/app.css` を作成して Tailwind を読み込む。

```css
/* src/app.css */
@import "tailwindcss";
```

`src/routes/__root.tsx` でこの CSS を import する。

```tsx
import '../app.css'
```

---

## 4. `tsconfig.json` にパスエイリアスを追加

shadcn/ui は `@/*` エイリアスを必要とする。

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

> `vite-tsconfig-paths` が導入済みのため、Vite 側への alias 設定は不要。

---

## 5. shadcn/ui の初期化

```bash
npx shadcn@latest init -t start
```

対話形式でスタイルやベースカラーを選択する。完了すると以下が生成される。

- `components.json` — shadcn の設定ファイル
- `src/lib/utils.ts` — `cn()` ユーティリティ
- `src/components/ui/` — コンポーネント置き場

---

## 6. コンポーネントの追加

```bash
npx shadcn@latest add button
```

`src/components/ui/button.tsx` が生成され、そのまま import して使える。

```tsx
import { Button } from '@/components/ui/button'

export function MyPage() {
  return <Button>クリック</Button>
}
```

---

## まとめ：セットアップ順序

| 順番 | 作業 |
|---|---|
| 1 | `npm install tailwindcss @tailwindcss/vite` |
| 2 | `vite.config.ts` に `tailwindcss()` プラグインを追加 |
| 3 | `src/app.css` を作成して `@import "tailwindcss"` を記述 |
| 4 | `__root.tsx` で `app.css` を import |
| 5 | `tsconfig.json` に `paths: { "@/*": ["./src/*"] }` を追加 |
| 6 | `npx shadcn@latest init -t start` |
| 7 | `npx shadcn@latest add <component>` でコンポーネントを追加 |

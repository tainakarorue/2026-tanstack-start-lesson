# 11. 静的ファイルと画像の扱い

## 静的ファイルの設置場所（Next.js の `public` フォルダ相当）

TanStack Start は Vite ベースのため、**プロジェクトルートの `public` フォルダ**が Next.js と同様の役割を果たす。

```
project-root/
├── public/
│   ├── images/
│   │   └── logo.png
│   └── favicon.ico
├── src/
└── vite.config.ts
```

`public/` に置いたファイルはビルド後もそのままコピーされ、ルートパスでアクセスできる。

```tsx
// public/images/logo.png → /images/logo.png としてアクセス
<img src="/images/logo.png" alt="Logo" />
```

### Next.js との比較

| | Next.js | TanStack Start (Vite) |
|---|---|---|
| フォルダ名 | `public/` | `public/` |
| アクセスパス | `/image.png` | `/image.png` |

---

## 画像コンポーネント（Next.js の `<Image>` 相当）

TanStack Start には Next.js の `<Image>` コンポーネントに相当する**公式コンポーネントはない**。

### 選択肢

#### 1. 通常の `<img>` タグ（最もシンプル）

```tsx
<img src="/images/logo.png" alt="Logo" width={200} height={100} loading="lazy" />
```

#### 2. `@unpic/react`（最も Next.js の Image に近い）

```bash
npm install @unpic/react
```

```tsx
import { Image } from '@unpic/react'

<Image
  src="/images/logo.png"
  width={800}
  height={600}
  alt="Logo"
  priority  // LCP画像に使用
/>
```

主な機能：
- 遅延読み込み（lazy loading）
- `width` / `height` 指定によるレイアウトシフト（CLS）防止
- `priority` でプリロード対応

#### 3. `vite-imagetools`（ビルド時に画像最適化）

```bash
npm install vite-imagetools
```

```tsx
import logo from './logo.png?w=200&format=webp'
<img src={logo} />
```

### 使い分け

| ユースケース | おすすめ |
|---|---|
| シンプルな静的サイト | `<img>` タグ + `loading="lazy"` |
| Next.js に近い体験が欲しい | `@unpic/react` |
| ビルド時に画像最適化したい | `vite-imagetools` |
| 本格的な画像配信 | CDN（Cloudflare Images、Cloudinary 等）と組み合わせ |

> TanStack Start はサーバーサイドの画像最適化（Next.js の `/_next/image` のようなリサイズ API）を持たないため、本格運用では CDN との組み合わせが推奨される。

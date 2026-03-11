## tanstack start

https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables

## shadcn

現状コマンドがドキュメントと違う 2026/03/09
npx shadcn@latest init -t start

---

## ルートファイル名の記法

### `$`（スプラットルート）

`trpc.$.ts` や `auth.$.ts` の `$` は、それ以降のすべてのパスにマッチするスプラットルートを意味する。

```
src/routes/api/trpc.$.ts  →  /api/trpc/* にマッチ
src/routes/api/auth.$.ts  →  /api/auth/* にマッチ
```

tRPC や Better Auth のように、サブパスを自分でハンドリングするライブラリに使う。

### `$param` vs `$`（スプラット）の違い

| 記法 | マッチ対象 | 例 |
|---|---|---|
| `$postId` | 単一セグメント（スラッシュなし） | `/posts/123` → `postId = "123"` |
| `$`（単独） | 残りの全セグメント（スラッシュ含む） | `/api/trpc/posts.list` → splat = `"posts.list"` |

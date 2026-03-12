# 10. サインイン・サインアップページ

Better Auth + react-hook-form + zod でサインイン・サインアップページを実装する。

---

## 1. パッケージのインストール

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## 2. ファイル構成

09 で解説した `_public` レイアウトパターンを使用する。

```
src/routes/
  _public.tsx            ← パブリックレイアウト（ログイン済みなら / へ）
  _public/
    sign-in.tsx          ← /sign-in
    sign-up.tsx          ← /sign-up
```

---

## 3. `src/routes/_public.tsx` — パブリックレイアウト

```tsx
// src/routes/_public.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireGuest } from '../lib/auth.server'

export const Route = createFileRoute('/_public')({
  beforeLoad: requireGuest,
  component: () => <Outlet />,
})
```

---

## 4. `src/routes/_public/sign-in.tsx` — サインインページ

### パターン解説

| 要素 | 役割 |
|---|---|
| `useForm` + `zodResolver` | バリデーション |
| `Field` + `data-invalid` | エラー時にラベル・枠を赤くする |
| `Input` + `aria-invalid` | エラー時に Input の枠・リングを赤くする |
| `FieldError errors={[...]}` | エラーメッセージ表示 |
| `signIn.email()` | Better Auth でサインイン実行 |

```tsx
// src/routes/_public/sign-in.tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '../../components/ui/field'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card'

export const Route = createFileRoute('/_public/sign-in')({
  component: SignInPage,
})

// ── スキーマ ──────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

type FormValues = z.infer<typeof schema>

// ── コンポーネント ────────────────────────────────────────
function SignInPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setError('root', { message: 'メールアドレスまたはパスワードが正しくありません' })
      return
    }

    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>サインイン</CardTitle>
          <CardDescription>アカウントにサインインしてください</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <FieldGroup>
              {/* メールアドレス */}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              {/* パスワード */}
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">パスワード</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              {/* サーバーエラー */}
              <FieldError errors={[errors.root]} />
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'サインイン中...' : 'サインイン'}
            </Button>
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link to="/sign-up" className="underline underline-offset-4 hover:text-primary">
                サインアップ
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

---

## 5. `src/routes/_public/sign-up.tsx` — サインアップページ

```tsx
// src/routes/_public/sign-up.tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '../../components/ui/field'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card'

export const Route = createFileRoute('/_public/sign-up')({
  component: SignUpPage,
})

// ── スキーマ ──────────────────────────────────────────────
const schema = z
  .object({
    name: z.string().min(1, '名前を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

// ── コンポーネント ────────────────────────────────────────
function SignUpPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    })

    if (error) {
      setError('root', { message: 'アカウントの作成に失敗しました。このメールアドレスは既に使用されている可能性があります。' })
      return
    }

    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>サインアップ</CardTitle>
          <CardDescription>新しいアカウントを作成してください</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <FieldGroup>
              {/* 名前 */}
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">名前</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="山田 太郎"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              {/* メールアドレス */}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              {/* パスワード */}
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">パスワード</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              {/* パスワード確認 */}
              <Field data-invalid={!!errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">パスワード（確認）</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                <FieldError errors={[errors.confirmPassword]} />
              </Field>

              {/* サーバーエラー */}
              <FieldError errors={[errors.root]} />
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '作成中...' : 'アカウントを作成'}
            </Button>
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちの方は{' '}
              <Link to="/sign-in" className="underline underline-offset-4 hover:text-primary">
                サインイン
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

---

## 6. バリデーションの仕組み

### Field + react-hook-form の連携パターン

shadcn の `Form` コンポーネントを使わず、`Field` + `FieldError` で同等のバリデーション表示を実現する。

```tsx
<Field data-invalid={!!errors.fieldName}>        {/* ← true でラベルが赤くなる */}
  <FieldLabel htmlFor="fieldName">ラベル</FieldLabel>
  <Input
    id="fieldName"
    aria-invalid={!!errors.fieldName}             {/* ← true で Input 枠が赤くなる */}
    {...register('fieldName')}
  />
  <FieldError errors={[errors.fieldName]} />      {/* ← エラーメッセージ表示 */}
</Field>
```

### サーバーエラーの扱い

Better Auth から返ってきたエラーは `setError('root', ...)` でフォーム全体のエラーとして設定し、
フォームの末尾に表示する。

```tsx
const { error } = await signIn.email({ ... })
if (error) {
  setError('root', { message: 'エラーメッセージ' })
}
```

```tsx
<FieldError errors={[errors.root]} />
```

### パスワード確認の cross-field バリデーション

`z.object().refine()` で2フィールドをまたいだバリデーションを実装する。
`path: ['confirmPassword']` で対象フィールドにエラーを割り当てる。

```ts
const schema = z
  .object({ password: z.string(), confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })
```

---

## 7. `auth.server.ts` の `/sign-in` を有効化

ページ作成後、`auth.server.ts` の `requireAuth` のリダイレクト先を `/sign-in` に戻す。

```ts
// src/lib/auth.server.ts
export async function requireAuth() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect({ to: '/sign-in' }) // ← ページ作成後に有効
  return { session }
}
```

---

## まとめ

```
1. npm install react-hook-form zod @hookform/resolvers

2. src/routes/_public.tsx を作成
   └── beforeLoad: requireGuest（ログイン済みなら / へ）

3. src/routes/_public/sign-in.tsx を作成
   └── signIn.email() で認証 → 成功したら / へ

4. src/routes/_public/sign-up.tsx を作成
   └── signUp.email() でアカウント作成 → 成功したら / へ

5. src/lib/auth.server.ts の requireAuth の redirect 先を /sign-in に戻す
```

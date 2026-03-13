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
| `Controller` | フィールドと form.control を接続 |
| `Field` + `data-invalid` | エラー時にラベル・枠を赤くする |
| `Input` + `aria-invalid` | エラー時に Input の枠・リングを赤くする |
| `FieldError errors={[...]}` | エラーメッセージ表示 |
| `useState` + `Alert` | サーバーエラーの表示 |
| `signIn.email()` + コールバック | Better Auth でサインイン実行 |

```tsx
// src/routes/_public/sign-in.tsx
import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { OctagonAlertIcon } from 'lucide-react'

export const Route = createFileRoute('/_public/sign-in')({
  component: SignInPage,
})

const Formschema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

type FormValues = z.infer<typeof Formschema>

function SignInPage() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(Formschema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    await signIn.email(
      {
        email: values.email,
        password: values.password,
        callbackURL: '/',
      },
      {
        onSuccess: () => {
          navigate({ to: '/' })
        },
        onError: ({ error }) => {
          setError(error.message)
        },
      },
    )
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>サインイン</CardTitle>
          <CardDescription>アカウントにサインインしてください</CardDescription>
        </CardHeader>

        <form id="sif-form" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sif-email">メールアドレス</FieldLabel>
                    <Input
                      {...field}
                      id="sif-email"
                      type="email"
                      placeholder="mail@example.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sif-password">パスワード</FieldLabel>
                    <Input
                      {...field}
                      id="sif-password"
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            {!!error && (
              <Alert className="bg-rose-100 border-none text-rose-500">
                <OctagonAlertIcon className="size-4" />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'サインイン中...' : 'サインイン'}
            </Button>
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link
                to="/sign-up"
                className="underline underline-offset-4 hover:text-primary"
              >
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
import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { OctagonAlertIcon } from 'lucide-react'

export const Route = createFileRoute('/_public/sign-up')({
  component: SignUpPage,
})

const Formschema = z
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

type FormValues = z.infer<typeof Formschema>

function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(Formschema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    await signUp.email(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        callbackURL: '/',
      },
      {
        onSuccess: () => {
          navigate({ to: '/' })
        },
        onError: ({ error }) => {
          setError(error.message)
        },
      },
    )
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>サインアップ</CardTitle>
          <CardDescription>新しいアカウントを作成してください</CardDescription>
        </CardHeader>

        <form id="suf-form" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="suf-name">名前</FieldLabel>
                    <Input
                      {...field}
                      id="suf-name"
                      type="text"
                      placeholder="John Due"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="suf-email">メールアドレス</FieldLabel>
                    <Input
                      {...field}
                      id="suf-email"
                      type="email"
                      placeholder="mail@example.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="suf-password">パスワード</FieldLabel>
                    <Input
                      {...field}
                      id="suf-password"
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="suf-confirm-password">
                      パスワード（確認）
                    </FieldLabel>
                    <Input
                      {...field}
                      id="suf-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            {!!error && (
              <Alert className="bg-rose-100 border-none text-rose-500">
                <OctagonAlertIcon className="size-4" />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '作成中...' : 'アカウントを作成'}
            </Button>
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちの方は{' '}
              <Link
                to="/sign-in"
                className="underline underline-offset-4 hover:text-primary"
              >
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

### Controller + react-hook-form の連携パターン

shadcn の `Form` コンポーネントを使わず、`Controller` + `Field` + `FieldError` で同等のバリデーション表示を実現する。

```tsx
<Controller
  name="fieldName"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>      {/* ← true でラベルが赤くなる */}
      <FieldLabel htmlFor="fieldName">ラベル</FieldLabel>
      <Input
        {...field}
        id="fieldName"
        aria-invalid={fieldState.invalid}           {/* ← true で Input 枠が赤くなる */}
      />
      {fieldState.invalid && (
        <FieldError errors={[fieldState.error]} />  {/* ← エラーメッセージ表示 */}
      )}
    </Field>
  )}
/>
```

### サーバーエラーの扱い

Better Auth のコールバック `onError` でエラーメッセージを `useState` に保存し、`Alert` コンポーネントで表示する。

```tsx
const [error, setError] = useState<string | null>(null)

await signIn.email(
  { email, password, callbackURL: '/' },
  {
    onSuccess: () => navigate({ to: '/' }),
    onError: ({ error }) => setError(error.message),
  },
)
```

```tsx
{!!error && (
  <Alert className="bg-rose-100 border-none text-rose-500">
    <OctagonAlertIcon className="size-4" />
    <AlertTitle>{error}</AlertTitle>
  </Alert>
)}
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

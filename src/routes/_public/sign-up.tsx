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

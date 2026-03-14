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

export const Route = createFileRoute('/_layout/_public/sign-in')({
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

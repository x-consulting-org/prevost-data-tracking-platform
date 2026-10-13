"use client";

import { Button, Form, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email("Adj meg egy érvényes e-mail címet."),
  password: z.string().min(1, "Add meg a jelszavad."),
});

type LoginValues = z.infer<typeof loginSchema>;

class SignInError extends Error {
  constructor(readonly status: number) {
    super(`Sign-in failed with HTTP ${status}`);
  }
}

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { error } = await signIn.email(values);
      if (error) {
        throw new SignInError(error.status);
      }
    },
    onSuccess: () => router.replace("/shipments"),
  });

  const { errors } = form.formState;

  return (
    <Form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Stack gap={6}>
        {mutation.isError ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="A belépés nem sikerült."
            subtitle={
              mutation.error instanceof SignInError && mutation.error.status === 401
                ? "Hibás e-mail cím vagy jelszó."
                : "Próbáld újra egy kicsit később."
            }
          />
        ) : null}
        <TextInput
          id="login-email"
          type="email"
          autoComplete="username"
          labelText="E-mail cím"
          invalid={errors.email !== undefined}
          invalidText={errors.email?.message}
          {...form.register("email")}
        />
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          labelText="Jelszó"
          showPasswordLabel="Jelszó mutatása"
          hidePasswordLabel="Jelszó elrejtése"
          invalid={errors.password !== undefined}
          invalidText={errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
          Belépés
        </Button>
      </Stack>
    </Form>
  );
}

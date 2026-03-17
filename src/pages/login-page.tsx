import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BoxesIcon, InfoIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type RedirectState = {
  from?: {
    pathname?: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const redirectTo =
    (location.state as RedirectState | null)?.from?.pathname ?? "/";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const nextSession = await api.login({
        email_id: email.trim(),
        password,
      });
      login(nextSession);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-md rounded-xl border p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
            <BoxesIcon className="size-3.5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Access the inventory operations workspace.
            </p>
            <div className="mt-3 flex w-full items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <InfoIcon className="size-4 shrink-0" />
              <p>Do not have an account? Contact your system admins for access.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@company.com"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                placeholder="Enter your password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </section>
    </div>
  );
}

import { LoginForm } from "@/features/auth/components/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

/** Login page. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/play";
  const initialError = params.error;

  return <LoginForm redirectTo={redirectTo} initialError={initialError} />;
}

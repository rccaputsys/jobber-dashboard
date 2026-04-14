import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;

  // Supabase password-reset + magic-link flows land here with ?code=<uuid>
  // when the allow-list strips deeper paths. Forward to /reset-password so
  // the PKCE exchange actually runs.
  const code = typeof sp.code === "string" ? sp.code : null;
  const type = typeof sp.type === "string" ? sp.type : null;
  if (code) {
    // type=recovery is the password-reset signal; otherwise treat as login.
    const target = type === "recovery" ? "/reset-password" : "/reset-password";
    redirect(`${target}?code=${encodeURIComponent(code)}`);
  }

  const user = await getUser();
  if (user) redirect("/jobber/dashboard");
  redirect("/login");
}

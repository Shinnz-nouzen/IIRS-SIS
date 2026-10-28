import { redirect } from "next/navigation";
import Image from "next/image";
import { getActiveStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const instant = false;

export default async function LoginPage() {
  const supabase = await createClient();
  const staff = await getActiveStaff(supabase);

  if (staff) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#0d0d11] px-4 py-12 text-slate-100 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/iirs-logo.jpg"
            alt="International Intellectual Resource School logo"
            width={84}
            height={84}
            priority
            className="mx-auto mb-4 size-[76px] rounded-full border border-white/15 object-cover"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-300">
            International Intellectual Resource School
          </p>
          <p className="mt-1 text-xs text-slate-500">School Information System</p>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#17171d] p-7 shadow-xl shadow-black/25 sm:p-9">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Staff sign in
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sign in with the staff account provided by your school
              administrator.
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs leading-5 text-slate-500">
            Access is limited to administrator-provisioned staff accounts.
            Contact your administrator if you need help.
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized school personnel only
        </p>
      </div>
    </main>
  );
}

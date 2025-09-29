// app/page.tsx  (NO "use client" here)
import { Suspense } from "react";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic"; // optional: ensure SSR, avoids static export issues

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { AdminLoginClient } from "@/components/admin/AdminLoginClient";

export const metadata: Metadata = {
  title: "Staff sign in — GoPlate",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}

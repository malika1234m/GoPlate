import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "Back office — GoPlate",
  // Staff-only tooling has no business in search results.
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}

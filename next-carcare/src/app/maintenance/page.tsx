import { redirect } from "next/navigation";

export default function MaintenanceIndexPage() {
  redirect("/maintenance/login");
}

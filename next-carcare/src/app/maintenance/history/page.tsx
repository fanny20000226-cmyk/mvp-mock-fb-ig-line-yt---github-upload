import { redirect } from "next/navigation";
import { hasMaintenanceSession } from "@/lib/maintenanceAuth";
import HistoryClient from "./HistoryClient";

export default function MaintenanceHistoryPage() {
  if (!hasMaintenanceSession()) redirect("/maintenance/login");
  return <HistoryClient />;
}

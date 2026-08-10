import Link from "next/link";
import { redirect } from "next/navigation";
import { hasMaintenanceSession } from "@/lib/maintenanceAuth";

const optimizeSections = [
  ["系統效能優化原理", "Monitor會重新整理狀態卡片、統計資料與異常列表，減少長時間開頁造成的顯示延遲。"],
  ["資料庫最佳化機制", "本平台只做SELECT讀取與結果整理，不執行INSERT、UPDATE或DELETE，避免影響營運資料。"],
  ["N8N同步穩定優化", "透過重新偵測同步日誌與回呼狀態，快速判斷通道是否延遲、假死或失敗。"],
  ["雲端同步優化流程", "Google試算表欄位對齊由N8N處理，Monitor只顯示最後同步時間、失敗數與提醒。"],
  ["頁面速度優化", "一鍵保養會清理維護平台本機暫存、刷新卡片資料與重新計算健康分數。"],
  ["長期維護週期", "建議每日營業前查看健康分數，每週匯出一次維護報告，每月檢查N8N同步紀錄。"]
];

export default function MaintenanceOptimizationGuidePage() {
  if (!hasMaintenanceSession()) redirect("/maintenance/login");

  return (
    <main className="min-h-screen bg-carcare-bg px-4 py-8 text-neutral-950">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Maintenance Document</p>
          <h1 className="mt-1 text-3xl font-black">系統優化說明文件</h1>
          <p className="mt-2 text-sm text-neutral-600">
            本文件記錄Monitor優化架構、同步穩定檢查與長期保養規範。優化不會重啟主系統，也不會中斷前台作業。
          </p>
          <Link className="secondary-btn mt-4 inline-flex" href="/maintenance/dashboard">
            返回監控看板
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {optimizeSections.map(([title, body], index) => (
            <article key={title} className="card">
              <p className="text-sm font-black text-carcare-yellow">OPT {index + 1}</p>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-700">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

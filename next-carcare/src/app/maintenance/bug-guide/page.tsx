import Link from "next/link";
import { redirect } from "next/navigation";
import { hasMaintenanceSession } from "@/lib/maintenanceAuth";

const bugSections = [
  ["N8N同步狀態異常", "同步通道可能因排程延遲、Webhook回傳未到或狀態快取殘留而顯示不一致。自動修復會重新整理通道偵測與顯示狀態，不改動正式資料。"],
  ["PDF產生失敗狀態殘留", "瀏覽器下載中斷或前端狀態未清除時，可能讓畫面仍顯示失敗。自動修復會清除殘留提示與重新整理報告輸出狀態。"],
  ["資料關聯斷裂標示", "監控平台只會列出疑似斷關聯單號，修復僅校正異常標示，不會自動改報價單、客戶或車輛資料。"],
  ["快取與渲染殘留", "頁面長時間開啟可能出現數字不同步或卡片未刷新。自動修復會清理維護平台暫存並重新讀取。"],
  ["權限狀態異常", "登入cookie或前端狀態過期時可能造成誤判。自動修復會提示重新登入與刷新維護狀態。"],
  ["時間與時區偏移", "不同服務回傳時間格式不同，監控平台統一以台灣時間顯示，避免判讀錯誤。"]
];

export default function MaintenanceBugGuidePage() {
  if (!hasMaintenanceSession()) redirect("/maintenance/login");

  return (
    <main className="min-h-screen bg-carcare-bg px-4 py-8 text-neutral-950">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Maintenance Document</p>
          <h1 className="mt-1 text-3xl font-black">BUG修復說明文件</h1>
          <p className="mt-2 text-sm text-neutral-600">
            本文件說明Monitor維護後台的安全自癒範圍。所有修復都只處理系統狀態、同步狀態、快取、顯示與報告，不修改門市營運資料。
          </p>
          <Link className="secondary-btn mt-4 inline-flex" href="/maintenance/dashboard">
            返回監控看板
          </Link>
        </div>

        <div className="grid gap-4">
          {bugSections.map(([title, body], index) => (
            <article key={title} className="card">
              <p className="text-sm font-black text-carcare-yellow">BUG {index + 1}</p>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-700">{body}</p>
              <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
                手動SOP：先回到主營運後台確認原始資料，再由Monitor重新整理狀態；若仍異常，匯出維護報告交由技術人員追查。
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

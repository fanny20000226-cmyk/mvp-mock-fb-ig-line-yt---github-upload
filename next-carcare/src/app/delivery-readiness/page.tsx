"use client";

import RequireAuth from "@/components/RequireAuth";

const readinessItems = [
  {
    group: "營運流程",
    items: [
      "登入後可進入工作台，左側選單與手機抽屜皆可正常切換。",
      "手機快速開單可建立客戶、車輛、報價資料，並回到標準報價頁接續作業。",
      "報價單可儲存、查詢歷史紀錄、轉施工單，施工單建立後工作台統計同步更新。",
      "施工前後照片、車輛相簿、圖片標註與 ZIP 下載入口需在正式驗收時逐筆確認。"
    ]
  },
  {
    group: "財務與薪資",
    items: [
      "收款、交易明細、收據、財務報表可完成查詢與匯出。",
      "人資可建員工資料、登錄出勤、建立薪資單與下載薪資 PDF。",
      "員工後台僅能查看本人資料、薪資與出勤，不可看到其他員工資訊。",
      "薪資雲端同步需以測試薪資單確認 Google 試算表欄位未錯位。"
    ]
  },
  {
    group: "N8N / Google Sheets",
    items: [
      "客戶、車輛、報價、預約、財務、人資、薪資、出勤資料需確認即時同步與每日 09:00 排程皆保留。",
      "N8N workflow 必須維持 Published，Google credential 有效，Webhook 安全金鑰一致。",
      "同步失敗不可阻擋主系統儲存，錯誤需留在同步紀錄或 N8N executions 中。",
      "正式交付前建議用測試客戶與測試薪資各跑一次完整鏈路。"
    ]
  },
  {
    group: "PDF 與報告",
    items: [
      "報價單 PDF、施工工單 PDF、收據 PDF、薪資單 PDF、維護報告 PDF 需確認中文不亂碼。",
      "PDF 需在電腦與手機下載測試，確認圖片、金額、頁面切割正常。",
      "維護報告應包含連線狀態、同步狀態、統計數字、異常清單與檢查時間。"
    ]
  }
];

const cleanupRules = [
  "測試資料必須使用固定前綴，例如 TEST_、測試客戶、測試車牌 TST- 開頭，方便查詢與清理。",
  "測試完成後先確認 Google 試算表已同步，再刪除或標記測試資料，避免正式資料被誤判。",
  "若測試資料已產生財務或薪資紀錄，需同步清理對應交易與薪資測試列。",
  "正式營運資料不得用手動 SQL 批次刪除，所有清理動作應先備份並確認篩選條件。"
];

const permissionMatrix = [
  {
    role: "總管理員",
    access: "全系統功能、權限、N8N、財務、人資、報表與維護查看。",
    note: "唯一可做跨門市設定與完整系統驗收。"
  },
  {
    role: "店長 / 副店長",
    access: "門市營運、報價、施工、預約、客戶、相簿、部分財務與人資查看。",
    note: "不應修改全域系統設定與其他門市資料。"
  },
  {
    role: "前台",
    access: "客戶建檔、快速開單、預約、照片上傳、PDF 匯出。",
    note: "不可調整價格、薪資、權限與完整財務報表。"
  },
  {
    role: "人資",
    access: "員工資料、出勤、薪資作業、員工資料變更審核。",
    note: "不需要操作報價單與施工計價邏輯。"
  },
  {
    role: "財務",
    access: "收款、交易明細、收據、財務報表。",
    note: "不可進入薪資個資與權限設定。"
  },
  {
    role: "一般員工 / 技師",
    access: "工作台、施工相關檢視、員工個人後台。",
    note: "只能看自己的薪資與資料，不可看其他員工。"
  }
];

const gapList = [
  "正式驗收時需保留一份測試帳號與測試資料命名規則，避免之後找不到測試紀錄。",
  "建議在 N8N 增加失敗通知管道，例如 Telegram 或 email，避免同步中斷沒人知道。",
  "建議每週固定匯出一次維護報告與財務報表，建立交付後維護節奏。",
  "正式使用前請確認 Supabase service role key 只放在 Vercel server-side 環境變數，不出現在前端。",
  "若 Google 試算表要給店長查看，建議建立只讀分享權限，不直接給編輯權。"
];

export default function DeliveryReadinessPage() {
  return (
    <RequireAuth allow={["admin", "shop_manager"]}>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">Delivery Readiness</p>
          <h1 className="mt-1 text-2xl font-black text-neutral-950">交付驗收中心</h1>
          <p className="mt-2 text-sm text-neutral-600">
            這裡整理正式交付前應確認的功能、測試資料清理規則、角色權限總表與仍可補強項目。此頁只做檢查與說明，不會改動營運資料。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {["營運流程", "雲端同步", "財務薪資", "PDF 報告"].map((title) => (
            <div key={title} className="card">
              <p className="text-sm text-neutral-500">{title}</p>
              <p className="mt-2 text-3xl font-black text-carcare-yellow">待驗收</p>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="text-xl font-black">正式交付驗收清單</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {readinessItems.map((group) => (
              <div key={group.group} className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="font-black text-neutral-950">{group.group}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-carcare-yellow" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="card">
            <h2 className="text-xl font-black">測試資料清理規則</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              {cleanupRules.map((rule, index) => (
                <p key={rule}>
                  <span className="font-black text-carcare-yellow">{index + 1}.</span> {rule}
                </p>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-black">目前建議補強項目</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              {gapList.map((gap) => (
                <p key={gap} className="rounded-xl bg-neutral-50 p-3">
                  {gap}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">角色權限總表</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-carcare-black text-white">
                <tr>
                  <th className="p-3">角色</th>
                  <th className="p-3">可使用功能</th>
                  <th className="p-3">交付注意事項</th>
                </tr>
              </thead>
              <tbody>
                {permissionMatrix.map((row) => (
                  <tr key={row.role} className="border-b border-neutral-200">
                    <td className="p-3 font-black">{row.role}</td>
                    <td className="p-3">{row.access}</td>
                    <td className="p-3 text-neutral-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

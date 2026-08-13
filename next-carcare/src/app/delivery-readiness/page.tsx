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

const environmentChecklist = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", purpose: "前端連線 Supabase 專案網址", owner: "Vercel 環境變數" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", purpose: "前端讀寫允許範圍內資料", owner: "Vercel 環境變數" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", purpose: "伺服器端執行轉單、歸檔、同步測試等管理動作", owner: "只可放 Vercel server-side" },
  { key: "N8N_WEBHOOK_URL", purpose: "系統送出即時同步事件到 N8N", owner: "Vercel 與 N8N 設定需一致" },
  { key: "N8N_WEBHOOK_SECRET", purpose: "N8N Webhook 安全驗證", owner: "Vercel 與 N8N 變數需一致" },
  { key: "GOOGLE_REPORT_SHEET_ID", purpose: "客戶、車輛、報價、預約、財務報表同步目標", owner: "N8N 變數" },
  { key: "GOOGLE_SALARY_SHEET_ID", purpose: "員工、人資、薪資、出勤同步目標", owner: "N8N 變數" }
];

const storageChecklist = [
  "Supabase Storage 必須存在 car-images bucket。",
  "施工前、施工後、車輛相簿、圖片標註都要能上傳與預覽。",
  "PDF 取用雲端照片時不能出現 404 或權限拒絕。",
  "正式使用前請用一張測試照片完成上傳、放大、刪除、PDF 匯出。"
];

const pdfChecklist = [
  "報價單 PDF：客戶車輛資訊、施工項目、照片、金額與總額框都要正常。",
  "施工工單 PDF：五大分類、施工前後圖片、簽名欄與日期欄正常。",
  "收據 PDF：門市資訊、稅額、含稅總金額、列印次數正常。",
  "薪資單 PDF：員工編號、薪資年月、應給、應扣、實領金額正常。",
  "維護報告 PDF：中文不亂碼，連線狀態、異常清單、同步時間可讀。"
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

const roleTestSteps = [
  "用總管理員登入，確認可進入權限、N8N、財務、人資、交付驗收中心。",
  "用店長登入，確認可處理門市營運與交付驗收，但不可越權管理全系統。",
  "用人資登入，確認可建員工、登出勤、建薪資，不可查看不必要的營運設定。",
  "用財務登入，確認可查看收款、交易、收據、報表，不可進入薪資個資。",
  "用一般員工登入，確認只能查看自身員工後台與允許的施工/行事曆資料。"
];

const onlineAcceptanceSteps = [
  "建立一筆 TEST_ 客戶與測試車牌，確認 customers、cars 與 Google 試算表客戶 / 車輛分頁都有資料。",
  "用手機快速開單建立測試報價，確認報價列表、工作台報價總數與 Google 報價分頁同步更新。",
  "把測試報價轉施工單，確認施工單列表與工作台施工訂單統計同步更新。",
  "建立一筆測試收款，確認 transaction_record 與 Google 財務分頁同步更新。",
  "建立一筆測試預約，確認行事曆、預約清單與 Google 預約分頁同步更新。",
  "建立一筆測試員工、出勤與薪資單，確認員工後台可查看，Google 薪資 / 出勤分頁同步更新。",
  "分別匯出報價 PDF、施工 PDF、收據 PDF、薪資 PDF 與維護報告 HTML，確認中文與金額可讀。",
  "測試完成後依測試資料前綴清理測試資料，並確認正式營運資料沒有被誤刪。"
];

const gapList = [
  "建議在 N8N 增加失敗通知管道，例如 Telegram 或 email，避免同步中斷沒人知道。",
  "建議每週固定匯出一次維護報告與財務報表，建立交付後維護節奏。",
  "正式使用前請確認 Supabase service role key 只放在 Vercel server-side 環境變數，不出現在前端。",
  "若 Google 試算表要給店長查看，建議建立只讀分享權限，不直接給編輯權。",
  "正式營運前請建立一組測試員工、一筆測試薪資、一筆測試報價，完成端到端驗收。"
];

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-neutral-700">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-carcare-yellow" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DeliveryReadinessPage() {
  return (
    <RequireAuth allow={["admin", "shop_manager"]}>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">Delivery Readiness</p>
          <h1 className="mt-1 text-2xl font-black text-neutral-950">交付驗收中心</h1>
          <p className="mt-2 text-sm text-neutral-600">
            這裡整理正式交付前應確認的功能、環境變數、Storage、PDF、測試資料清理規則、角色權限總表與仍可補強項目。此頁只做檢查與說明，不會改動營運資料。
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
                <div className="mt-3">
                  <CheckList items={group.items} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">環境變數核對表</h2>
          <p className="mt-2 text-sm text-neutral-500">
            下列值不應顯示在前端頁面，只需確認 Vercel 或 N8N 後台已設定。這裡只列名稱與用途，不存放金鑰內容。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-carcare-black text-white">
                <tr>
                  <th className="p-3">變數名稱</th>
                  <th className="p-3">用途</th>
                  <th className="p-3">設定位置</th>
                </tr>
              </thead>
              <tbody>
                {environmentChecklist.map((row) => (
                  <tr key={row.key} className="border-b border-neutral-200">
                    <td className="p-3 font-black">{row.key}</td>
                    <td className="p-3">{row.purpose}</td>
                    <td className="p-3 text-neutral-600">{row.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-black">Supabase Storage 檢查</h2>
            <div className="mt-4">
              <CheckList items={storageChecklist} />
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-black">PDF 實測清單</h2>
            <div className="mt-4">
              <CheckList items={pdfChecklist} />
            </div>
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

        <section className="card">
          <h2 className="text-xl font-black">角色登入實測步驟</h2>
          <div className="mt-4">
            <CheckList items={roleTestSteps} />
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">線上端到端驗收流程</h2>
          <p className="mt-2 text-sm text-neutral-500">
            正式交付前請用線上網址照順序跑一次。每筆測試資料都使用 TEST_ 或 TST- 前綴，方便後續清理。
          </p>
          <div className="mt-4">
            <CheckList items={onlineAcceptanceSteps} />
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

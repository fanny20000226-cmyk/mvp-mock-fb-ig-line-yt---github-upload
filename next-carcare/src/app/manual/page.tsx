"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";

const sections = [
  {
    id: "intro",
    title: "1. 系統簡介｜PEIWAY汽車門店ERM+CRM系統",
    body: [
      "本系統整合門市營運、客戶車輛檔案、報價施工單、預約行事曆、人資薪資、財務報表與N8N雲端同步。",
      "日常操作以左側黑色側欄切換模組；手機版則使用左上角漢堡選單開啟抽屜導航。",
      "所有資料以Supabase為主資料庫，Google試算表由N8N負責同步備份與報表整理。"
    ]
  },
  {
    id: "login-roles",
    title: "2. 後台登入與權限說明",
    body: [
      "管理員：可檢視與維護全系統功能，包含權限、人資、財務、N8N設定。",
      "店長：可管理門市營運資料、預約、報價施工單、門市財務與人員作業。",
      "前台：主要負責客戶接待、快速開單、預約建立、照片上傳與報價作業。",
      "一般員工：以檢視自身工作、施工資訊與員工後台為主，不可越權查看他人資料。",
      "人資：管理員工建檔、出勤紀錄、薪資演算與資料變更審核。",
      "財務：管理收款、交易流水、財務報表、收據紀錄與薪資相關帳務資料。"
    ]
  },
  {
    id: "quotation",
    title: "3. 報價單&施工方案單操作流程",
    body: [
      "進入「製作報價單」後，先填寫客戶姓名、電話、車牌、車型與門市資料。",
      "使用內裝清潔選項時，可點選地毯五區與座椅項目，系統會自動計算各項小計與總金額。",
      "確認金額後可儲存報價單，並於歷史報價紀錄中展開明細、轉施工單或匯出PDF。",
      "PDF匯出會帶入車主資料、施工項目、金額、備註與照片資訊。"
    ]
  },
  {
    id: "mobile-order",
    title: "4. 手機卡片式快速開單操作教學",
    body: [
      "從「現場作業 > 行動快速開單」進入手機優先頁面。",
      "依序完成客戶資訊、車輛資訊、施工項目分類、車內清潔選項與金額確認。",
      "車內清潔選項預設收合，需要地毯或座椅時再展開，避免手機畫面過度擁擠。",
      "點擊「儲存建立報價單」後，系統會建立正式報價單並跳轉到標準報價頁繼續作業。"
    ]
  },
  {
    id: "customers-cars",
    title: "5. 客戶與車輛檔案管理、客戶標籤分類",
    body: [
      "客戶資料查詢可用姓名、電話、車牌搜尋舊客戶，並查看名下車輛與歷史報價。",
      "車輛相簿依車牌與施工紀錄歸檔照片，方便查詢施工前後狀態。",
      "客戶標籤可用於標記新客、高價客、老客、潛在客等分類，協助門市快速判斷服務重點。",
      "標籤篩選可用於客戶查詢與預約辨識。"
    ]
  },
  {
    id: "appointments",
    title: "6. 預約系統使用｜行事曆、新增預約、衝突提示",
    body: [
      "預約管理支援行事曆檢視、清單篩選、新增預約、修改狀態與取消預約。",
      "新增預約時可選既有客戶或建立新客戶，再填寫車輛、日期、時段與服務內容。",
      "同一車輛或同一時段發生衝突時，系統會提示重疊資訊，避免重複安排。",
      "管理員與店長可完整CRUD預約；一般員工以檢視為主。"
    ]
  },
  {
    id: "hr",
    title: "7. 人資薪資模組",
    body: [
      "7-1 人資後台：可建立員工檔案、登錄出勤、輸入薪資加扣項、演算薪資並產生薪資單。",
      "薪資欄位包含本薪、津貼、獎金、加班費、扣款、出勤統計與實領金額。",
      "7-2 員工登入後台：員工可用編號與密碼登入，查詢個人資料、出勤紀錄、歷史薪資並下載個人薪資單PDF。",
      "員工資料若需修改，使用資料變更申請送交人資審核。"
    ]
  },
  {
    id: "finance",
    title: "8. 財務模組｜收支建立、毛利查看、財務報表PDF匯出",
    body: [
      "收款登記用於建立訂金、尾款、現金、刷卡、匯款等收款資料。",
      "交易流水可查詢收入、支出、關聯訂單與備註。",
      "財務報表用於查看營收、支出、毛利與期間統計，支援匯出報表。",
      "收據紀錄可查詢已開立收據與列印次數。"
    ]
  },
  {
    id: "n8n",
    title: "9. N8N＋Google試算表同步說明",
    body: [
      "N8N負責把Supabase資料同步到Google試算表，本系統不直接寫入Google API。",
      "同步範圍包含客戶主檔、車輛檔案、報價施工工單、預約紀錄、交易財務明細、員工人事、薪資與出勤資料。",
      "系統儲存資料優先，即使N8N暫時失敗，也不應阻擋門市原本開單、收款或建檔流程。",
      "可至「N8N聯動」相關頁面查看設定、測試與回呼紀錄。"
    ]
  },
  {
    id: "maintenance",
    title: "10. 日常維護SOP｜常見問題排除",
    body: [
      "若頁面沒有更新，先重新整理並確認Vercel最新Production部署是否Ready。",
      "若圖片上傳失敗，確認Supabase Storage bucket與環境變數是否正確。",
      "若Google試算表未同步，先查看N8N workflow是否Published、Webhook網址與安全金鑰是否一致。",
      "若權限無法進入頁面，確認登入角色是否被允許使用該功能。",
      "若PDF或金額異常，先確認報價單資料是否完整，再檢查瀏覽器是否阻擋下載。"
    ]
  }
];

function ScreenshotPlaceholder() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center text-sm font-black text-neutral-500">
      【此處插入對應截圖】
    </div>
  );
}

export default function ManualPage() {
  return (
    <RequireAuth allow={["admin", "shop_manager"]}>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">PEIWAY Manual</p>
          <h1 className="mt-1 text-2xl font-black text-neutral-950">系統操作手冊</h1>
          <p className="mt-2 text-sm text-neutral-600">
            後台日常操作、權限、報價施工、人資薪資、財務與N8N同步總覽。此頁僅提供教學說明，不會寫入或修改任何資料。
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-black text-neutral-950">章節快速跳轉</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-black text-neutral-800 transition duration-200 hover:border-carcare-yellow hover:bg-carcare-yellow/10"
              >
                {section.title}
              </Link>
            ))}
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="card scroll-mt-24">
            <h2 className="text-xl font-black text-neutral-950">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-700">
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <ScreenshotPlaceholder />
          </section>
        ))}
      </div>
    </RequireAuth>
  );
}

"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";

const sections = [
  {
    id: "intro",
    title: "1. 系統簡介｜PEIWAY 汽車門店 ERM + CRM 系統",
    body: [
      "本系統整合門市日常營運、客戶車輛資料、報價施工單、財務收支、人資薪資、預約行事曆與 N8N / Google 試算表同步。",
      "門市人員可從同一個後台完成開單、拍照、轉施工單、收款、查詢客戶與追蹤預約，管理者則可查看財務、人資與系統同步狀態。",
      "所有正式營運資料以 Supabase 為主資料庫，Google 試算表透過 N8N 做雲端報表備份與同步。"
    ]
  },
  {
    id: "login-roles",
    title: "2. 後台登入與權限說明",
    body: [
      "管理後台使用系統帳號登入，不同角色會看到不同功能入口。",
      "總管理員可查看全系統資料、權限管理、N8N 設定、財務、人資與所有營運模組。",
      "店長可管理自家門市營運、預約、報價、施工、客戶與部分財務人資資料。",
      "前台主要負責客戶建檔、快速開單、預約、照片上傳與報價匯出。",
      "一般員工與技師只保留必要的施工、行事曆與個人員工後台入口。",
      "人資與財務帳號依角色分流，只能進入自身職責需要的頁面。"
    ]
  },
  {
    id: "quotation",
    title: "3. 報價單與施工方案單操作流程",
    body: [
      "進入「製作報價單」後，先填寫車主姓名、電話、車牌、品牌與車型。",
      "依現場狀況選擇地毯、座椅、加購與手動補充項目，金額會即時加總。",
      "施工前與施工後照片分區上傳，圖片會綁定該車輛與單據，方便後續查詢與 PDF 匯出。",
      "儲存報價後可在歷史報價列表查看，也可以轉成施工單，轉單後工作台與施工單管理會同步更新。",
      "PDF 匯出使用 PEIWAY 品牌格式，含客戶車輛資訊、施工方案、照片區與金額明細。"
    ]
  },
  {
    id: "mobile-order",
    title: "4. 手機卡片式快速開單操作教學",
    body: [
      "手機快速開單入口適合門市現場使用，頁面採卡片式直向排版。",
      "先選既有客戶或快速新增客戶，再填入車輛品牌、車型與車牌。",
      "施工項目以分類卡片呈現，可勾選項目與輸入金額；內裝地毯與座椅選項可收合展開。",
      "確認金額後點擊「儲存建立報價單」，系統會建立正式報價資料，並可回到標準報價頁繼續編輯或匯出 PDF。"
    ]
  },
  {
    id: "customers-cars",
    title: "5. 客戶與車輛檔案管理、客戶標籤分類",
    body: [
      "客戶資料頁可依姓名、電話、車牌查詢客戶與車輛。",
      "一位客戶可綁定多台車，一台車可對應多筆報價、施工紀錄與相簿照片。",
      "客戶標籤可用於分類，例如新客、高價客、老客、潛在客、寵物車、異味嚴重等。",
      "標籤會顯示在客戶詳細資料與預約資訊中，方便門市快速辨識特殊需求。"
    ]
  },
  {
    id: "appointments",
    title: "6. 預約系統使用｜行事曆、新增預約、衝突提示",
    body: [
      "預約管理提供清單與行事曆檢視，可查看不同日期與時段的預約狀態。",
      "新增預約時可選既有客戶或建立新客戶，填入車輛、日期、時段、服務項目與備註。",
      "同一車輛同一時段重複預約會觸發警示；超過門市可承載量也會提示。",
      "管理員與店長可建立、編輯、取消、完成預約；一般員工只提供檢視權限。"
    ]
  },
  {
    id: "hr",
    title: "7. 人資薪資模組",
    body: [
      "人資後台可建立員工主檔、設定員工編號與登入密碼、登錄出勤紀錄並建立薪資單。",
      "薪資計算包含本薪、職務津貼、伙食津貼、全勤獎金、加班費、交通津貼、激勵獎金、外派支援津貼、應休未休、帶人金、績效獎金、業績獎金。",
      "扣款項包含勞保費、健保費、勞退自提、事病假扣款、預支與 KIP 未達標扣款。",
      "員工登入個人後台後，只能查看自己的資料、出勤與薪資紀錄，並下載自己的薪資單 PDF。",
      "員工資料若需修改，必須送出變更申請，由人資審核後才會更新正式資料。"
    ]
  },
  {
    id: "finance",
    title: "8. 財務模組｜收支建立、毛利查看、財務報表",
    body: [
      "財務頁可建立收款、訂金、尾款與支出紀錄，並關聯報價單或施工單。",
      "財務報表可依日期、門市、收款狀態與施工類型查詢。",
      "收據 PDF 可由單據頁匯出，並保留列印次數與稅額欄位。",
      "Google 試算表同步由 N8N 負責，本系統不直接寫入 Google API。"
    ]
  },
  {
    id: "n8n",
    title: "9. N8N + Google 試算表同步說明",
    body: [
      "系統資料先寫入 Supabase，再由 N8N 同步至 Google 試算表。",
      "目前同步範圍包含客戶主檔、車輛檔案、報價施工工單、預約紀錄、交易財務明細、人事薪資與出勤紀錄。",
      "即時同步用 Webhook 觸發，定時同步保留每日 09:00 排程。",
      "若 N8N 或 Google Sheets 暫時失敗，主系統仍會優先保存營運資料，失敗狀態會留在同步紀錄中供排查。"
    ]
  },
  {
    id: "maintenance",
    title: "10. 日常維護 SOP｜常見問題排除",
    body: [
      "若頁面資料未更新，先重新整理頁面並確認目前 Vercel 部署是否為 Production Ready。",
      "若圖片上傳失敗，檢查 Supabase Storage bucket 是否存在且權限設定正確。",
      "若 Google 試算表未同步，檢查 N8N workflow 是否 Published、Webhook URL 是否一致、Google credential 是否仍有效。",
      "若權限或選單異常，確認登入帳號角色是否正確，並檢查權限管理頁。",
      "若 PDF 文字或圖片異常，先確認使用最新部署版本，再重新匯出。"
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
            這份手冊整理門市日常作業、人資薪資、財務、N8N 同步與維護排查流程，方便新員工教育與正式交付驗收。
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-black text-neutral-950">章節索引</h2>
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

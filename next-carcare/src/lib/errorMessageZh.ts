const rules: Array<[RegExp, string]> = [
  [/customer_id.*not-null|customer_id.*null value|violates not-null.*customer_id/i, "缺少客戶資料，請先選取客戶。"],
  [/missing.*SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY.*missing/i, "系統環境設定遺漏，請通知維護人員。"],
  [/bucket not found/i, "儲存空間不存在，請通知維護人員。"],
  [/could not find.*table|could not find the table/i, "資料表異常，請通知維護人員。"],
  [/failed to fetch|networkerror|network request failed/i, "網路連線失敗，請確認網路後再試。"],
  [/jwt expired|invalid jwt|session.*expired/i, "登入狀態已失效，請重新登入。"],
  [/row-level security|violates row level security/i, "目前帳號沒有執行此操作的權限。"],
  [/duplicate key|already exists|unique constraint/i, "已有相同資料，請勿重複建立。"],
  [/foreign key constraint|violates foreign key/i, "關聯資料不存在或已被移除，請重新整理後再試。"],
  [/not-null constraint|null value in column/i, "必要欄位尚未填寫完整。"],
  [/permission denied|insufficient privilege/i, "目前帳號沒有執行此操作的權限。"],
  [/relation .* does not exist|table .* does not exist/i, "系統資料表尚未完成設定，請聯絡系統管理員。"],
  [/column .* does not exist/i, "系統欄位版本不一致，請聯絡系統管理員更新資料庫。"],
  [/timeout|timed out/i, "系統回應逾時，請稍後再試。"],
];

export function errorMessageZh(error: unknown, fallback = "操作失敗，請稍後再試。") {
  const source =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : typeof error === "string"
          ? error
          : "";

  if (!source) return fallback;
  const matched = rules.find(([pattern]) => pattern.test(source));
  if (matched) return matched[1];
  if (/[㐀-鿿]/.test(source)) return source;
  return `${fallback}（系統訊息：${source}）`;
}

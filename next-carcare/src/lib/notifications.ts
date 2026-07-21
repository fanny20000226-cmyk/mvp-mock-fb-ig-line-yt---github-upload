"use client";

import { supabase } from "./supabase";

export const defaultPickupTemplates = {
  first:
    "【PEIWAY汽車美容】您好，您的車輛已施工完畢，可前來取車，施工照片：{圖片連結}，如有問題可致電門市。",
  second:
    "【PEIWAY提醒】您的車輛已完工多日，請盡速至門市牽車，如有需求可預約到店時間。"
};

export type NotifyTemplateKey = keyof typeof defaultPickupTemplates;

export function renderNotifyTemplate(template: string, photoLink: string) {
  return template.replace(/\{圖片連結\}/g, photoLink || "尚無照片連結");
}

export function photoPreviewLink(photoUrls: string[]) {
  return photoUrls.filter(Boolean)[0] || "";
}

export async function createMockSmsNotification(input: {
  quotationId?: string | null;
  customerId?: string | null;
  storeId?: string | null;
  customerPhone?: string | null;
  content: string;
  photoLink?: string;
  remindInDays?: number;
}) {
  const remindDate = new Date();
  remindDate.setDate(remindDate.getDate() + (input.remindInDays || 2));

  const payload = {
    quotation_id: input.quotationId || null,
    customer_id: input.customerId || null,
    store_id: input.storeId || null,
    customer_phone: input.customerPhone || "",
    send_content: input.content,
    photo_link: input.photoLink || "",
    send_time: new Date().toISOString(),
    send_status: "成功",
    auto_remind_date: remindDate.toISOString()
  };

  const { error } = await supabase.from("notify_logs").insert(payload);
  if (error) throw error;

  if (input.quotationId) {
    await supabase.from("quotations").update({ notify_sent: true }).eq("id", input.quotationId);
  }
}

export async function createPickupSecondReminderIfNeeded(input: {
  quotationId?: string | null;
  customerId?: string | null;
  storeId?: string | null;
  customerPhone?: string | null;
  photoLink?: string;
  template?: string;
}) {
  const content = renderNotifyTemplate(input.template || defaultPickupTemplates.second, input.photoLink || "");
  return createMockSmsNotification({
    quotationId: input.quotationId,
    customerId: input.customerId,
    storeId: input.storeId,
    customerPhone: input.customerPhone,
    content,
    photoLink: input.photoLink,
    remindInDays: 0
  });
}

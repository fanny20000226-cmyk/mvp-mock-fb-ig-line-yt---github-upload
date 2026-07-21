"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import PdfExportButton from "@/components/PdfExportButton";
import { listCars, listQuotations } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type CarRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  updated_at?: string | null;
};

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number;
  final_amount: number;
  status: string;
  remark: string | null;
  created_at: string;
};

type AlbumPhoto = {
  id: string;
  car_id: string | null;
  image_url: string;
  annot_data: { type?: string; plate_no?: string; uploaded_at?: string; caption?: string } | null;
  created_at: string;
};

type CustomerGroup = {
  key: string;
  name: string;
  phone: string;
  cars: CarRow[];
  quotes: QuoteRow[];
  totalSpent: number;
  latestAt: string;
};

const statusText: Record<string, string> = {
  pending: "待客戶確認",
  confirmed: "已確認",
  converted: "已轉工單",
  void: "作廢"
};

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function dateText(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("zh-TW");
}

export default function CustomersPage() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [keyword, setKeyword] = useState("");
  const [expandedKey, setExpandedKey] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: carData }, { data: quoteData }, { data: photoData }] = await Promise.all([
      listCars(),
      listQuotations(),
      supabase
        .from("image_annotations")
        .select("id, car_id, image_url, annot_data, created_at")
        .order("created_at", { ascending: false })
    ]);
    setCars((carData || []) as CarRow[]);
    setQuotes((quoteData || []) as QuoteRow[]);
    setPhotos((photoData || []) as AlbumPhoto[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();

    cars.forEach((car) => {
      const key = normalize(car.customer_phone) || normalize(car.customer_name) || car.id;
      const existing = groups.get(key);
      if (existing) {
        existing.cars.push(car);
        existing.latestAt = latestDate(existing.latestAt, car.updated_at || "");
        return;
      }
      groups.set(key, {
        key,
        name: car.customer_name || "未命名客戶",
        phone: car.customer_phone || "",
        cars: [car],
        quotes: [],
        totalSpent: 0,
        latestAt: car.updated_at || ""
      });
    });

    quotes.forEach((quote) => {
      const matched = Array.from(groups.values()).find((group) => {
        const carPlates = group.cars.map((car) => normalize(car.plate_no));
        return (
          carPlates.includes(normalize(quote.plate_no)) ||
          (!!quote.customer_phone && normalize(group.phone) === normalize(quote.customer_phone)) ||
          (!!quote.customer_name && normalize(group.name) === normalize(quote.customer_name))
        );
      });

      const key = matched?.key || normalize(quote.customer_phone) || normalize(quote.customer_name) || quote.id;
      const group =
        matched ||
        groups.get(key) || {
          key,
          name: quote.customer_name || "未命名客戶",
          phone: quote.customer_phone || "",
          cars: [],
          quotes: [],
          totalSpent: 0,
          latestAt: ""
        };
      group.quotes.push(quote);
      group.totalSpent += Number(quote.final_amount || quote.total_amount || 0);
      group.latestAt = latestDate(group.latestAt, quote.created_at || "");
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => (b.latestAt || "").localeCompare(a.latestAt || ""));
  }, [cars, quotes]);

  const filteredGroups = useMemo(() => {
    const term = normalize(keyword);
    if (!term) return customerGroups;
    return customerGroups.filter((group) => {
      const carText = group.cars
        .map((car) => [car.plate_no, car.brand, car.model, car.color].filter(Boolean).join(" "))
        .join(" ");
      return normalize(`${group.name} ${group.phone} ${carText}`).includes(term);
    });
  }, [customerGroups, keyword]);

  function photosForCar(car: CarRow) {
    const plate = normalize(car.plate_no);
    return photos.filter((photo) => {
      const photoPlate = normalize(photo.annot_data?.plate_no);
      return photo.car_id === car.id || (!!plate && photoPlate === plate);
    });
  }

  function createNewQuoteDraft(car: CarRow) {
    window.localStorage.setItem(
      "peiway-interior-quote-draft-v3",
      JSON.stringify({
        customerName: car.customer_name || "",
        customerPhone: car.customer_phone || "",
        plateNo: car.plate_no || "",
        carType: "一般5人座轎車",
        savedAt: new Date().toISOString()
      })
    );
    window.location.href = "/operations/quotations";
  }

  async function deletePhoto(photoId: string) {
    const ok = window.confirm("確定要從相簿移除這張照片紀錄嗎？");
    if (!ok) return;
    const { error } = await supabase.from("image_annotations").delete().eq("id", photoId);
    if (error) return alert(error.message);
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">客戶資料查詢</p>
              <h1 className="text-2xl font-black">客戶 / 車輛 / 報價歸屬</h1>
              <p className="mt-1 text-sm text-neutral-500">
                用姓名、電話、車牌快速查詢客戶歷史報價與車輛相簿。
              </p>
            </div>
            <button type="button" className="secondary-btn" onClick={load}>
              {loading ? "更新中..." : "重新整理"}
            </button>
          </div>
          <input
            className="form-input mt-4"
            placeholder="搜尋車主姓名、手機號碼、車牌號碼"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const open = expandedKey === group.key;
            const targetId = `customer-archive-${encodeURIComponent(group.key).replace(/%/g, "")}`;
            return (
              <div key={group.key} className="card">
                <div id={targetId}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-black">{group.name}</h2>
                      <p className="mt-1 text-sm text-neutral-500">{group.phone || "未填電話"}</p>
                      <p className="mt-2 text-sm">
                        名下車輛：{group.cars.map((car) => car.plate_no || "未填車牌").join("、") || "尚無車輛"}
                      </p>
                    </div>
                    <div className="grid gap-2 text-right md:min-w-[12rem]">
                      <p className="text-sm text-neutral-500">累計消費金額</p>
                      <p className="text-3xl font-black text-carcare-yellow">{money(group.totalSpent)}</p>
                      <p className="text-xs text-neutral-500">最近施工 / 報價：{dateText(group.latestAt)}</p>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <h3 className="mb-3 text-lg font-black">車輛清單與雲端相簿</h3>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {group.cars.map((car) => {
                            const carPhotos = photosForCar(car);
                            const before = carPhotos.filter((photo) => String(photo.annot_data?.type || "").includes("before"));
                            const after = carPhotos.filter((photo) => String(photo.annot_data?.type || "").includes("after"));
                            const annotated = carPhotos.filter((photo) => String(photo.annot_data?.type || "").includes("annotated"));
                            return (
                              <div key={car.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <p className="text-lg font-black">{car.plate_no || "未填車牌"}</p>
                                    <p className="text-sm text-neutral-500">
                                      {[car.brand, car.model, car.year, car.color].filter(Boolean).join(" / ") || "未填車型"}
                                    </p>
                                  </div>
                                  <button type="button" className="primary-btn" onClick={() => createNewQuoteDraft(car)}>
                                    轉新報價單
                                  </button>
                                </div>
                                <PhotoStrip
                                  title="施工前照片"
                                  photos={before}
                                  plateNo={car.plate_no || ""}
                                  onPreview={setPreviewPhoto}
                                  onDelete={deletePhoto}
                                />
                                <PhotoStrip
                                  title="施工後照片"
                                  photos={after}
                                  plateNo={car.plate_no || ""}
                                  onPreview={setPreviewPhoto}
                                  onDelete={deletePhoto}
                                />
                                <PhotoStrip
                                  title="標註圖片"
                                  photos={annotated}
                                  plateNo={car.plate_no || ""}
                                  onPreview={setPreviewPhoto}
                                  onDelete={deletePhoto}
                                />
                                <PhotoStrip
                                  title="其他相簿照片"
                                  photos={carPhotos.filter(
                                    (photo) =>
                                      !String(photo.annot_data?.type || "").includes("before") &&
                                      !String(photo.annot_data?.type || "").includes("after") &&
                                      !String(photo.annot_data?.type || "").includes("annotated")
                                  )}
                                  plateNo={car.plate_no || ""}
                                  onPreview={setPreviewPhoto}
                                  onDelete={deletePhoto}
                                />
                              </div>
                            );
                          })}
                          {!group.cars.length ? (
                            <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-500">
                              目前尚無車輛主檔。
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>報價單號</th>
                              <th>車牌</th>
                              <th>金額</th>
                              <th>狀態</th>
                              <th>開單日期</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.quotes.map((quote) => (
                              <Fragment key={quote.id}>
                                <tr>
                                  <td>{quote.quote_no}</td>
                                  <td>{quote.plate_no || "-"}</td>
                                  <td>{money(Number(quote.final_amount || quote.total_amount || 0))}</td>
                                  <td>{statusText[quote.status] || quote.status}</td>
                                  <td>{dateText(quote.created_at)}</td>
                                  <td>
                                    <div className="flex min-w-72 flex-wrap gap-2">
                                      <Link className="secondary-btn" href={`/operations/quotations?quote=${quote.id}`}>
                                        開啟舊單
                                      </Link>
                                      <PdfExportButton targetId={targetId} filename={`${group.name || "客戶"}_報價施工資料.pdf`} />
                                      <Link className="primary-btn" href="/operations/construction">
                                        查看施工單
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                                {quote.remark ? (
                                  <tr>
                                    <td colSpan={6}>
                                      <pre className="whitespace-pre-wrap rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
                                        {quote.remark}
                                      </pre>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            ))}
                            {!group.quotes.length ? (
                              <tr>
                                <td colSpan={6} className="text-center text-neutral-500">
                                  尚無歷史報價。
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" className="secondary-btn" onClick={() => setExpandedKey(open ? "" : group.key)}>
                    {open ? "收合資料" : "展開客戶資料"}
                  </button>
                </div>
              </div>
            );
          })}
          {!filteredGroups.length ? (
            <div className="card text-center text-neutral-500">查無符合條件的客戶資料。</div>
          ) : null}
        </div>
      </section>
      {previewPhoto ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto("")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewPhoto} alt="車輛相簿照片" className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
        </button>
      ) : null}
    </RequireAuth>
  );
}

function latestDate(left: string, right: string) {
  return [left, right].filter(Boolean).sort().slice(-1)[0] || left || right || "";
}

function PhotoStrip({
  title,
  photos,
  plateNo,
  onPreview,
  onDelete
}: {
  title: string;
  photos: AlbumPhoto[];
  plateNo: string;
  onPreview: (url: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-black text-neutral-700">
        {title} <span className="text-carcare-yellow">{photos.length}</span>
      </p>
      {photos.length ? (
        <div className="grid grid-cols-4 gap-2">
          {photos.slice(0, 8).map((photo) => (
            <div key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt={title}
                loading="lazy"
                className="h-20 w-full cursor-zoom-in rounded-xl bg-neutral-100 object-cover"
                onClick={() => onPreview(photo.image_url)}
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs font-black text-white opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onDelete(photo.id)}
              >
                刪除
              </button>
              <Link
                href={`/annotations?image=${encodeURIComponent(photo.image_url)}&plate=${encodeURIComponent(plateNo)}`}
                className="absolute bottom-1 left-1 rounded-full bg-carcare-yellow px-2 py-1 text-xs font-black text-carcare-black opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                標註
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">
          尚無{title}
        </p>
      )}
    </div>
  );
}

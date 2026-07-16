"use client";

import { useMemo, useState } from "react";

type QuoteDraft = {
  custom_item: string;
  final_amount: string;
  note: string;
};

type Option = {
  id: string;
  label: string;
  price: number;
};

const carTypes = ["一般轎車 5 人座", "大型休旅 5 人座", "七人座 2-3-2", "九人座 / 商務車"];

const carpetOptions: Option[] = [
  { id: "driver", label: "駕駛座地毯", price: 600 },
  { id: "passenger", label: "副駕地毯", price: 600 },
  { id: "left", label: "左半邊地毯", price: 600 },
  { id: "right", label: "右半邊地毯", price: 600 },
  { id: "all", label: "全車地毯", price: 2200 }
];

const seatOptions: Option[] = [
  { id: "fabric", label: "布椅深層清潔", price: 1800 },
  { id: "leather", label: "皮椅清潔保養", price: 2200 },
  { id: "white", label: "白內裝重點處理", price: 2800 },
  { id: "odor", label: "煙味 / 異味處理", price: 1500 },
  { id: "pet", label: "寵物毛髮處理", price: 1200 }
];

export default function InteriorQuoteBuilder({
  onApply
}: {
  onApply: (draft: QuoteDraft) => void;
}) {
  const [carType, setCarType] = useState(carTypes[0]);
  const [carpets, setCarpets] = useState<string[]>([]);
  const [seats, setSeats] = useState<string[]>([]);
  const [basePlan, setBasePlan] = useState("內裝清潔評估");
  const [manualDiscount, setManualDiscount] = useState("");

  function toggleCarpet(value: string) {
    if (value === "all") {
      setCarpets(carpets.includes("all") ? [] : ["all"]);
      return;
    }
    setCarpets(
      carpets.includes(value)
        ? carpets.filter((item) => item !== value)
        : [...carpets.filter((item) => item !== "all"), value]
    );
  }

  function toggleSeat(value: string) {
    setSeats(seats.includes(value) ? seats.filter((item) => item !== value) : [...seats, value]);
  }

  const selectedCarpets = useMemo(
    () => carpetOptions.filter((item) => carpets.includes(item.id)),
    [carpets]
  );
  const selectedSeats = useMemo(() => seatOptions.filter((item) => seats.includes(item.id)), [seats]);

  const total = useMemo(() => {
    const selectedTotal = [...selectedCarpets, ...selectedSeats].reduce(
      (sum, item) => sum + item.price,
      0
    );
    return Math.max(0, selectedTotal - Number(manualDiscount || 0));
  }, [selectedCarpets, selectedSeats, manualDiscount]);

  function applyToQuotation() {
    const itemLines = [...selectedCarpets, ...selectedSeats].map(
      (item) => `${item.label} $${item.price.toLocaleString()}`
    );
    onApply({
      custom_item: `${basePlan} / ${carType}`,
      final_amount: String(total),
      note: [
        `車型：${carType}`,
        `報價方案：${basePlan}`,
        `地毯：${selectedCarpets.map((item) => item.label).join("、") || "未選"}`,
        `座椅 / 內裝：${selectedSeats.map((item) => item.label).join("、") || "未選"}`,
        `明細：${itemLines.join("；") || "未選項目"}`,
        manualDiscount ? `優惠折抵：$${Number(manualDiscount).toLocaleString()}` : "",
        `試算總額：$${total.toLocaleString()}`
      ]
        .filter(Boolean)
        .join("\n")
    });
  }

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black text-carcare-yellow">內裝報價工具</p>
          <h2 className="text-xl font-black">車型、地毯、座椅材質試算</h2>
          <p className="mt-1 text-sm text-neutral-500">
            選完後按「帶入報價單」，下方欄位會自動填好。
          </p>
        </div>
        <div className="text-3xl font-black text-carcare-yellow">
          ${total.toLocaleString()}
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <select className="form-input" value={carType} onChange={(e) => setCarType(e.target.value)}>
          {carTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="form-input"
          value={basePlan}
          onChange={(e) => setBasePlan(e.target.value)}
          placeholder="方案名稱"
        />
        <input
          className="form-input"
          value={manualDiscount}
          onChange={(e) => setManualDiscount(e.target.value)}
          placeholder="優惠折抵，可不填"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <h3 className="mb-3 font-black">地毯款式 / 範圍</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {carpetOptions.map((item) => {
              const active = carpets.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleCarpet(item.id)}
                  className={active ? "primary-btn" : "secondary-btn"}
                >
                  {item.label}
                  <span className="ml-2 text-xs">${item.price.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <h3 className="mb-3 font-black">內裝座椅材質 / 狀況</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {seatOptions.map((item) => {
              const active = seats.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSeat(item.id)}
                  className={active ? "primary-btn" : "secondary-btn"}
                >
                  {item.label}
                  <span className="ml-2 text-xs">${item.price.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button type="button" onClick={applyToQuotation} className="primary-btn mt-4 w-full">
        帶入報價單
      </button>
    </section>
  );
}

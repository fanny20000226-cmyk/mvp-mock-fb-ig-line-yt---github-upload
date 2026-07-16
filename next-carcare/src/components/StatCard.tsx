export default function StatCard({
  title,
  value,
  hint
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-neutral-500">{title}</p>
      <strong className="mt-2 block text-3xl font-black text-carcare-yellow">
        {value}
      </strong>
      {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
    </section>
  );
}


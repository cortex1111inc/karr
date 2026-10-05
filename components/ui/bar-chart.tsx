// Minimal vertical bar chart — CSS only, no chart library. The bars are
// decorative; the same numbers are exposed to screen readers as a table.
export function BarChart({
  data,
  label,
  format = (n) => n.toLocaleString("en-IN"),
  height = 140,
}: {
  data: { key: string; label: string; value: number }[];
  label: string;
  format?: (n: number) => string;
  height?: number;
}) {
  if (data.length === 0) return <p className="text-sm text-faint">No data in this period.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const showEvery = Math.ceil(data.length / 8);

  return (
    <figure>
      <div aria-hidden="true" className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.label}: ${format(d.value)}`}>
            <div
              className="rounded-t bg-accent transition-opacity group-hover:opacity-80"
              style={{ height: `${d.value > 0 ? Math.max(2, (d.value / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex gap-1">
        {data.map((d, i) => (
          <span key={d.key} className="min-w-0 flex-1 truncate text-center font-mono text-[10px] text-faint">
            {i % showEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.label}</th>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

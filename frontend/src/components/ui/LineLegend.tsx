interface LineLegendProps {
  items: { label: string; color: string }[];
}

export function LineLegend({ items }: LineLegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

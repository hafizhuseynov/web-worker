export default function processColumns(columns) {
  return columns.map((col) => ({
    dataKey: col.accessorKey,
    header: col.heaer,
    ...col,
  }));
}

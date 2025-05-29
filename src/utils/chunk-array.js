export default function chunkArray(data, size) {
  if (data?.length <= size) {
    return [data];
  }

  const chunks = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
}

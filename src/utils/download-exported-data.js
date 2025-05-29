import { saveAs } from "file-saver";
import JSZip from "jszip";

export default async function downloadExportedData(
  arrayBuffers,
  { onComplete, fileName }
) {
  if (arrayBuffers.length === 1) {
    const pdf = arrayBuffers[0];

    const saveFileName = fileName.endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    saveAs(pdf, saveFileName);
    onComplete();
    return;
  }

  const zip = new JSZip();
  arrayBuffers.forEach((arrayBuffer, index) => {
    zip.file(`chunk_${index + 1}.pdf`, arrayBuffer);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${fileName}.zip`);
  onComplete();
}

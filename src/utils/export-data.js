import chunkArray from "./chunk-array";
import { toPdfTable } from "./export-pdf";
import processColumns from "./process-columns";
import processExportData from "./process-export-data";

export default async function exportData({ data, columns, onError }) {
  let processedData = data;
  let processedColumns = columns;
  let chunkSize = 5000;

  try {
    processedColumns = processColumns(columns);

    processedData = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(processExportData(data, processedColumns));
      }, 1000);
    });
  } catch (e) {
    onError(e);
    return;
  }

  const dataChunks = chunkArray(processedData, chunkSize);
  const pdfArrays = [];

  try {
    // If there is only one chunk, generate a single PDF
    if (dataChunks.length === 1) {
      const doc = toPdfTable(dataChunks[0], processedColumns);

      const pdfArrayBuffer = doc.output("blob");

      return [pdfArrayBuffer];
    }

    // If there are multiple chunks, generate multiple PDFs
    for (const chunk of dataChunks) {
      const doc = toPdfTable(chunk, processedColumns);
      const pdfArrayBuffer = doc.output("arraybuffer");
      pdfArrays.push(pdfArrayBuffer);
    }

    return pdfArrays;
  } catch (error) {
    onError(error);
    return;
  }
}

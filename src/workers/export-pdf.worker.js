import chunkArray from "@/utils/chunk-array";
import { toPdfTable } from "@/utils/export-pdf";
import processExportData from "@/utils/process-export-data";

const chunkSize = 5000;

function processColumns(columns) {
  return columns.map((col) => ({
    dataKey: col.accessorKey,
    header: col.heaer,
    ...col,
  }));
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (e) => {
  const meta = e.data?.meta;
  const data = e.data?.data;
  const columns = e.data?.columns;

  postMessage({
    type: "data-process-start",
  });

  let processedData = data;

  const processedColumns = processColumns(columns);

  try {
    processedData = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(processExportData(data, processedColumns));
      }, 1000);
    });
  } catch (e) {
    console.error(e);

    postMessage({
      type: "data-process-error",
    });

    return;
  }

  postMessage({
    type: "data-export-start",
  });

  const dataChunks = chunkArray(processedData, chunkSize);
  const pdfArrays = [];

  try {
    // If there is only one chunk, generate a single PDF
    if (dataChunks.length === 1) {
      const doc = toPdfTable(dataChunks[0], {
        meta,
        columns: processedColumns,
      });

      const pdfArrayBuffer = doc.output("blob");

      postMessage({
        type: "data-export-done",
        data: [pdfArrayBuffer],
      });

      return;
    }

    // If there are multiple chunks, generate multiple PDFs
    for (const chunk of dataChunks) {
      const doc = toPdfTable(chunk, {
        meta,
        columns: processedColumns,
      });

      const pdfArrayBuffer = doc.output("arraybuffer");
      pdfArrays.push(pdfArrayBuffer);
    }

    postMessage({
      type: "data-export-done",
      data: pdfArrays,
    });
  } catch (error) {
    console.error(error);

    postMessage({
      type: "data-export-error",
    });

    return;
  }
};

// eslint-disable-next-line no-restricted-globals
self.onerror = (e) => {
  console.error(e);

  postMessage({
    type: "data-export-error",
  });
};

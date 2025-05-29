import React from "react";
import "./App.css";
import { makeData } from "./utils/make-data";
import { DataTable } from "./components/ui/DataTable";
import { Button } from "./components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import processExportData from "./utils/process-export-data";
import chunkArray from "./utils/chunk-array";
import { toPdfTable } from "./utils/export-pdf";

function processColumns(columns) {
  return columns.map((col) => ({
    dataKey: col.accessorKey,
    header: col.heaer,
    ...col,
  }));
}

const columns = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    header: "First Name",
    accessorKey: "firstName",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "visits",
    header: "Visits",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "progress",
    header: "Profile Progress",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    format: "date",
  },
];

function App() {
  const [data] = React.useState(() => makeData(100000));
  const [workerLoading, setWorkerLoading] = React.useState(false);

  function notifyWorkerStarted(message) {
    setWorkerLoading(true);
    console.log(message);
  }

  function notifyWorkerFailed(message) {
    setWorkerLoading(false);
    console.error(message);
  }

  function notifyWorkerFinished(message) {
    setWorkerLoading(false);
    console.log(message);
  }

  return (
    <main className="p-5 flex justify-center">
      <div className="w-2/3">
        <h1 class="mb-10 max-w-[500px] mx-auto text-center text-2xl font-extrabold leading-none tracking-tight text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
          Data Export Demo with Web Worker vs Main Thread
        </h1>
        <p class="mb-6 text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">
          This simple page demonstrates the difference between exporting large
          datasets using a Web Worker versus doing it on the main thread.
        </p>
        <div>
          <ul class="space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
            <li>
              Export with Web Worker: Runs the export in a background thread.
              The UI remains responsive, allowing users to continue interacting
              with the app.
            </li>
            <li>
              Export on Main Thread: Executes the export on the main UI thread,
              causing the interface to freeze until the operation completes.
            </li>
          </ul>

          <blockquote class="p-4 my-4 border-s-4 border-gray-300 bg-gray-50 dark:border-gray-500 dark:bg-gray-800">
            <p class="text-xl italic font-medium leading-relaxed text-gray-900 dark:text-white">
              💡 Try clicking the pagination buttons while the export is in
              progress to see the difference in responsiveness
            </p>
          </blockquote>
        </div>
        <div className="flex flex-col md:flex-row gap-2 justify-end items-center mb-3 mt-5">
          <Button
            onClick={async () => {
              let processedData = data;
              const fileName = "Export Data";
              const processedColumns = processColumns(columns);

              try {
                processedData = await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(processExportData(data, processedColumns));
                  }, 1000);
                });
              } catch (e) {
                console.error(e);

                return;
              }

              const dataChunks = chunkArray(processedData, 5000);
              const pdfArrays = [];

              try {
                // If there is only one chunk, generate a single PDF
                if (dataChunks.length === 1) {
                  const doc = toPdfTable(dataChunks[0], {
                    columns: processedColumns,
                  });

                  const pdfArrayBuffer = doc.output("blob");

                  const pdf = pdfArrayBuffer;

                  const saveFileName = fileName.endsWith(".pdf")
                    ? fileName
                    : `${fileName}.pdf`;

                  saveAs(pdf, saveFileName);

                  return;
                }

                // If there are multiple chunks, generate multiple PDFs
                for (const chunk of dataChunks) {
                  const doc = toPdfTable(chunk, {
                    columns: processedColumns,
                  });

                  const pdfArrayBuffer = doc.output("arraybuffer");
                  pdfArrays.push(pdfArrayBuffer);
                }

                const zip = new JSZip();
                pdfArrays.forEach((arrayBuffer, index) => {
                  zip.file(`chunk_${index + 1}.pdf`, arrayBuffer);
                });

                const zipBlob = await zip.generateAsync({ type: "blob" });
                saveAs(zipBlob, `${fileName}.zip`);
              } catch (error) {
                console.error(error);

                return;
              }
            }}
          >
            <ThumbsDown /> Export Single Thread
          </Button>
          <Button
            onClick={() => {
              try {
                const exportWorker = new Worker(
                  new URL("./workers/export-pdf.worker.js", import.meta.url),
                  { type: "module" }
                );

                exportWorker.postMessage({
                  data,
                  columns,
                });

                exportWorker.onmessage = async function (event) {
                  const data = event.data;

                  if (data.type === "data-process-error") {
                    notifyWorkerFailed("Error processing data");
                  } else if (data.type === "data-export-error") {
                    notifyWorkerFailed("Error exporting data");
                  } else if (data.type === "data-process-start") {
                    notifyWorkerStarted("Processing data...");
                  } else if (data.type === "data-export-start") {
                    notifyWorkerStarted("Exporting data...");
                  } else if (data.type === "data-export-done") {
                    const pdfArrays = event.data.data;

                    const fileName = "Export Data";

                    if (pdfArrays.length === 1) {
                      const pdf = pdfArrays[0];

                      const saveFileName = fileName.endsWith(".pdf")
                        ? fileName
                        : `${fileName}.pdf`;

                      saveAs(pdf, saveFileName);
                      exportWorker.terminate();
                      notifyWorkerFinished("Export finished");
                      return;
                    }

                    const zip = new JSZip();
                    pdfArrays.forEach((arrayBuffer, index) => {
                      zip.file(`chunk_${index + 1}.pdf`, arrayBuffer);
                    });

                    const zipBlob = await zip.generateAsync({ type: "blob" });
                    saveAs(zipBlob, `${fileName}.zip`);
                    exportWorker.terminate();
                    notifyWorkerFinished("Export finished");
                  }
                };

                exportWorker.onerror = function (error) {
                  console.error(error);
                  exportWorker.terminate();
                  notifyWorkerFailed("Worker failed");
                };
              } catch (error) {
                notifyWorkerFailed(error);
              }
            }}
          >
            {workerLoading ? <LoadingSpinner /> : <ThumbsUp />}
            Export with Worker
          </Button>
        </div>
        <DataTable data={data} columns={columns} />
      </div>
    </main>
  );
}

export default App;

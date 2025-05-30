import React from "react";
import "./App.css";
import { makeData } from "./utils/make-data";
import { DataTable } from "./components/ui/DataTable";
import { Button } from "./components/ui/button";
import { Github, ThumbsDown, ThumbsUp } from "lucide-react";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import exportData from "./utils/export-data";
import downloadExportedData from "./utils/download-exported-data";
import dayjs from "dayjs";

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

const fileName = "Document";

function App() {
  const [dataCount, setDataCount] = React.useState(10000);

  const [data, setData] = React.useState(() => makeData(10000));
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

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setData(makeData(dataCount));
    }, 500);

    return () => clearTimeout(handler);
  }, [dataCount]);

  return (
    <main className="p-2 md:p-5 flex justify-center">
      <div className="px-5 max-w-full">
        <h1 className="mb-5 max-w-[500px] mx-auto text-center text-xl font-extrabold leading-none tracking-tight text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
          Data Export Demo with Web Worker vs Main Thread
        </h1>
        <div className="flex justify-center mb-5">
          <Button asChild>
            <a
              href="https://github.com/hafizhuseynov/web-worker"
              target="_blank"
            >
              <Github /> Repository
            </a>
          </Button>
        </div>
        <p className="mb-6 text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">
          This simple page demonstrates the difference between exporting large
          datasets using a Web Worker versus doing it on the main thread.
        </p>
        <div>
          <ul className="space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
            <li>
              <span className="text-gray-800 font-medium">
                Export with Web Worker
              </span>
              : Runs the export in a background thread. The UI remains
              responsive, allowing users to continue interacting with the app.
            </li>
            <li>
              <span className="text-gray-800 font-medium">
                Export on Main Thread
              </span>
              : Executes the export on the main UI thread, causing the interface
              to freeze until the operation completes.
            </li>
          </ul>

          <blockquote className="p-4 my-4 border-s-4 border-gray-300 bg-gray-50 dark:border-gray-500 dark:bg-gray-800">
            <p className="text-md italic font-medium leading-relaxed text-gray-900 dark:text-white">
              💡 Try clicking the pagination buttons while the export is in
              progress to see the difference in responsiveness
            </p>
          </blockquote>
        </div>
        <div className="flex flex-col md:flex-row gap-2 justify-end md:items-end mb-3 mt-5">
          <div className="flex-1">
            <label className="whitespace-nowrap me-2 text-xs text-slate-700">
              Data (max. 1,000,000)
            </label>
            <input
              type="number"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-2.5 py-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={dataCount}
              max={1000000}
              onChange={(e) => {
                if (e.target.value > 1000000) {
                  return;
                }

                setDataCount(Number(e.target.value));
              }}
            />
          </div>
          <Button
            disabled={workerLoading}
            onClick={async () => {
              exportData({ data, columns, onError: console.error }).then(
                async (exportedData) => {
                  if (exportedData.length === 1) {
                    const pdf = exportedData[0];
                    saveAs(pdf, `Document.pdf`);
                  } else {
                    const zip = new JSZip();
                    exportedData.forEach((arrayBuffer, index) => {
                      zip.file(`chunk_${index + 1}.pdf`, arrayBuffer);
                    });

                    const zipBlob = await zip.generateAsync({ type: "blob" });
                    saveAs(zipBlob, `Document.zip`);
                  }
                }
              );
            }}
          >
            <ThumbsDown /> Export Single Thread
          </Button>
          <Button
            disabled={workerLoading}
            onClick={() => {
              if (workerLoading) return;

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
                  } else if (data.type === "data-export-done") {
                    const pdfArrays = event.data.data;

                    downloadExportedData(pdfArrays, {
                      fileName,
                      onComplete: () => {
                        exportWorker.terminate();
                        notifyWorkerFinished("Export finished");
                      },
                    });
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
        <div className="overflow-x-hidden max-w-full">
          <DataTable data={data} columns={columns} />
        </div>
      </div>
    </main>
  );
}

export default App;

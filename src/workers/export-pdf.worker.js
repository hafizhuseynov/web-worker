import exportData from "@/utils/export-data";

self.onmessage = async (e) => {
  const data = e.data?.data;
  const columns = e.data?.columns;

  postMessage({
    type: "data-process-start",
  });

  let exportedData = await exportData({
    data,
    columns,
    onError: () => {
      postMessage({
        type: "data-process-error",
      });
    },
  });

  postMessage({
    type: "data-export-done",
    data: exportedData,
  });
};

self.onerror = (e) => {
  console.error(e);

  postMessage({
    type: "data-export-error",
  });
};

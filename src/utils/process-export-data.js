import date from "dayjs";

export default function processExportData(data, columns) {
  return data.map((row) => {
    const processedRow = {};

    columns.forEach((column) => {
      const value = row?.[column.dataKey];

      if (value != null) {
        if (column.format) {
          if (column.format === "decimal") {
            processedRow[column.dataKey] = Number(value).toFixed(2);
          } else if (column.format === "date") {
            processedRow[column.dataKey] = date(value).format("DD.MM.YYYY");
          } else if (column.format?.date) {
            processedRow[column.dataKey] = date(value).format(
              column.format.date
            );
          } else if (column.format?.number) {
            processedRow[column.dataKey] = Number(value).toFixed(
              column.format.number?.toFixed ?? 2
            );
          } else {
            processedRow[column.dataKey] = value;
          }
        } else {
          processedRow[column.dataKey] = value;
        }
      } else {
        processedRow[column.dataKey] = "-";
      }
    });

    return processedRow;
  });
}

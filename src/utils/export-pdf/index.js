import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function toPdfTable(data, columns) {
  const doc = new jsPDF();
  autoTable(doc, {
    body: data,
    columns: columns,
    headStyles: {
      fillColor: "#6366F1",
    },
  });
  return doc;
}

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportToExcel(payload: any) {
  const { unitName, auditorName, financialYear, auditTotals } = payload.metadata;
  const gridData = payload.gridData;
  const checklistData = payload.checklistData;

  const filename = `${unitName || 'Unknown Unit'} AP & CL (${financialYear || 'Unknown FY'}).xlsx`;
  const wb = new ExcelJS.Workbook();

  const applyHeaderStyles = (ws: ExcelJS.Worksheet, numCols: number, startDate: string, endDate: string) => {
    ws.mergeCells(1, 1, 1, numCols);
    ws.mergeCells(2, 1, 2, numCols);
    ws.mergeCells(3, 1, 3, numCols);
    ws.mergeCells(4, 1, 4, numCols);

    const titleFont = { bold: true, size: 12 };
    ws.getCell('A1').value = `Institution/Unit Name: ${unitName}`;
    ws.getCell('A1').font = titleFont;
    ws.getCell('A2').value = `Auditor Name: ${auditorName}`;
    ws.getCell('A2').font = titleFont;
    ws.getCell('A3').value = `Financial Year: ${financialYear}`;
    ws.getCell('A3').font = titleFont;
    ws.getCell('A4').value = `Audit Period: ${startDate} to ${endDate}`;
    ws.getCell('A4').font = titleFont;

    for (let r = 1; r <= 4; r++) {
      ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' };
    }
  };

  const formatTable = (ws: ExcelJS.Worksheet, startRow: number, numCols: number) => {
    // Format Headers
    for (let col = 1; col <= numCols; col++) {
      const cell = ws.getCell(startRow, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
    
    // Format Data Rows
    for (let row = startRow + 1; row <= ws.rowCount; row++) {
      for (let col = 1; col <= numCols; col++) {
        const cell = ws.getCell(row, col);
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'top', wrapText: true };
        if (col === 1) cell.alignment = { horizontal: 'center', vertical: 'top' };
      }
    }
  };

  const fmt = (val: any) => (Number.isInteger(Number(val)) ? Number(val) : val);

  // --- 1st Sheet: Checklist ---
  const wsChecklist = wb.addWorksheet('Checklist');
  const startDate = auditTotals?.startDate || '';
  const endDate = auditTotals?.endDate || '';
  applyHeaderStyles(wsChecklist, 4, startDate, endDate);

  const tableStart = 6;
  wsChecklist.getCell(tableStart, 1).value = "No.";
  wsChecklist.getCell(tableStart, 2).value = "Text";
  wsChecklist.getCell(tableStart, 3).value = "Response";
  wsChecklist.getCell(tableStart, 4).value = "Remarks";

  let currentRow = tableStart + 1;

  const addBoldRow = (no: string, text: string, val: string = "") => {
    wsChecklist.getCell(currentRow, 1).value = no;
    wsChecklist.getCell(currentRow, 1).font = { bold: true };
    wsChecklist.getCell(currentRow, 2).value = text;
    wsChecklist.getCell(currentRow, 2).font = { bold: true };
    wsChecklist.getCell(currentRow, 3).value = val;
    currentRow++;
  };

  addBoldRow("1.", "Name of the Units/Institution", unitName);
  addBoldRow("2.", "Financial Year", financialYear);
  addBoldRow("3.", "Auditor", auditorName);

  let m = 3; let s = 0; let ss = 0;
  const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];
  const alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];

  const checklistItems = Array.isArray(checklistData) ? checklistData : (checklistData?.items || []);
  const formData = checklistData?.formData || {};

  checklistItems.forEach((item: any) => {
    let text = item.text || "";
    const level = item.level || 1;
    let dNum = "";
    let isBold = false;

    if (level === 1) {
      m++; s = 0; ss = 0;
      dNum = `${m}.`;
      isBold = true;
    } else if (level === 2) {
      s++; ss = 0;
      text = "  " + text;
      dNum = `${roman[(s - 1) % roman.length]}.`;
    } else if (level === 3) {
      ss++;
      text = "    " + text;
      dNum = `${alpha[(ss - 1) % alpha.length]})`;
    }

    const cell1 = wsChecklist.getCell(currentRow, 1);
    const cell2 = wsChecklist.getCell(currentRow, 2);
    cell1.value = dNum;
    cell2.value = text;
    if (isBold) {
      cell1.font = { bold: true };
      cell2.font = { bold: true };
    }
    wsChecklist.getCell(currentRow, 3).value = String(item.value || "");
    wsChecklist.getCell(currentRow, 4).value = String(item.remarks || "");
    currentRow++;
  });

  const nextMain = m + 1;
  addBoldRow(`${nextMain}.`, "Have you discussed the Financial position (Balance Sheet) with the concern authority and their view obtained.", formData.q5 || "");
  
  let q6Ans = formData.q6_status || "";
  if (q6Ans === 'Yes' && formData.q6_date) q6Ans += ` (${formData.q6_date})`;
  addBoldRow(`${nextMain + 1}.`, "Have you discussed the Draft Audit report with the concern authority and their view obtained", q6Ans);
  
  addBoldRow(`${nextMain + 2}.`, "When did You commenced the audit", auditTotals?.startDate || "");
  addBoldRow(`${nextMain + 3}.`, "When did you concluded the audit", auditTotals?.endDate || "");
  addBoldRow(`${nextMain + 4}.`, "Total Number of days", fmt(auditTotals?.totalCalendarDays || 0));
  addBoldRow(`${nextMain + 5}.`, "Actual Number of Working days", fmt(auditTotals?.actualWorkingDays || 0));
  
  const finalQ = "Do you have any suggestion for the next audit. If yes, state you suggestions in your register.";
  wsChecklist.getCell(currentRow, 1).value = `${nextMain + 6}.`;
  wsChecklist.getCell(currentRow, 1).font = { bold: true };
  wsChecklist.getCell(currentRow, 2).value = finalQ;
  wsChecklist.getCell(currentRow, 2).font = { bold: true };
  wsChecklist.getCell(currentRow, 3).value = formData.q11 || "";
  currentRow++;

  formatTable(wsChecklist, tableStart, 4);
  wsChecklist.getColumn(1).width = 6;
  wsChecklist.getColumn(2).width = 50;
  wsChecklist.getColumn(3).width = 15;
  wsChecklist.getColumn(4).width = 30;

  // --- 2nd Sheet: Audit Program ---
  const wsAp = wb.addWorksheet("Audit Program");
  applyHeaderStyles(wsAp, 9, startDate, endDate);

  const apHeaders = [
    "No.", "Procedure Name", "Approximate Days", "Day Taken", 
    "Start Date", "End Date", "Auto Non-Working Days", 
    "Manual Leave Days", "Remarks"
  ];
  apHeaders.forEach((text, i) => {
    wsAp.getCell(tableStart, i + 1).value = text;
  });

  let totalActual = 0;
  let totalAutoNw = 0;
  let totalManual = 0;
  let totalApprox = 0;

  currentRow = tableStart + 1;
  let mainIdx = 0;

  gridData.forEach((item: any) => {
    mainIdx++;
    const subs = item.subs || [];
    const mergeRmk = (auto: string, user: string) => [auto, user].filter(x => x).join(' | ');

    if (!subs.length) {
      totalActual += Number(item.actual_days || 0);
      totalAutoNw += Number(item.auto_nw_days || 0);
      totalManual += Number(item.manual_leave_days || 0);
      totalApprox += Number(item.approximate_days || 0);

      wsAp.getCell(currentRow, 1).value = `${mainIdx}.`;
      wsAp.getCell(currentRow, 2).value = item.procedure_name || "";
      wsAp.getCell(currentRow, 1).font = { bold: true };
      wsAp.getCell(currentRow, 2).font = { bold: true };

      wsAp.getCell(currentRow, 3).value = item.approximate_days || "";
      wsAp.getCell(currentRow, 4).value = item.actual_days || "";
      wsAp.getCell(currentRow, 5).value = item.start_date || "";
      wsAp.getCell(currentRow, 6).value = item.end_date || "";
      wsAp.getCell(currentRow, 7).value = item.auto_nw_days || "";
      wsAp.getCell(currentRow, 8).value = item.manual_leave_days || "";
      wsAp.getCell(currentRow, 9).value = mergeRmk(item.auto_remarks, item.user_remarks);
      currentRow++;
    } else {
      wsAp.getCell(currentRow, 1).value = `${mainIdx}.`;
      wsAp.getCell(currentRow, 2).value = item.procedure_name || "";
      wsAp.getCell(currentRow, 9).value = mergeRmk(item.auto_remarks, item.user_remarks);
      wsAp.getCell(currentRow, 1).font = { bold: true };
      wsAp.getCell(currentRow, 2).font = { bold: true };
      currentRow++;

      let subIdx = 0;
      subs.forEach((sub: any) => {
        subIdx++;
        totalActual += Number(sub.actual_days || 0);
        totalAutoNw += Number(sub.auto_nw_days || 0);
        totalManual += Number(sub.manual_leave_days || 0);
        totalApprox += Number(sub.approximate_days || 0);

        wsAp.getCell(currentRow, 1).value = `${roman[(subIdx - 1) % roman.length]}.`;
        wsAp.getCell(currentRow, 2).value = "  " + (sub.procedure_name || "");
        wsAp.getCell(currentRow, 3).value = sub.approximate_days || "";
        wsAp.getCell(currentRow, 4).value = sub.actual_days || "";
        wsAp.getCell(currentRow, 5).value = sub.start_date || "";
        wsAp.getCell(currentRow, 6).value = sub.end_date || "";
        wsAp.getCell(currentRow, 7).value = sub.auto_nw_days || "";
        wsAp.getCell(currentRow, 8).value = sub.manual_leave_days || "";
        wsAp.getCell(currentRow, 9).value = mergeRmk(sub.auto_remarks, sub.user_remarks);
        currentRow++;
      });
    }
  });

  // Total Row
  wsAp.getCell(currentRow, 2).value = "Total";
  wsAp.getCell(currentRow, 2).font = { bold: true };
  wsAp.getCell(currentRow, 3).value = fmt(totalApprox);
  wsAp.getCell(currentRow, 4).value = fmt(totalActual);
  wsAp.getCell(currentRow, 7).value = fmt(totalAutoNw);
  wsAp.getCell(currentRow, 8).value = fmt(totalManual);
  currentRow++;

  formatTable(wsAp, tableStart, 9);
  wsAp.getColumn(1).width = 6;
  wsAp.getColumn(2).width = 40;
  wsAp.getColumn(3).width = 16;
  wsAp.getColumn(4).width = 12;
  wsAp.getColumn(5).width = 14;
  wsAp.getColumn(6).width = 14;
  wsAp.getColumn(7).width = 18;
  wsAp.getColumn(8).width = 16;
  wsAp.getColumn(9).width = 30;

  // Add SUMMARY Block
  const summaryStart = currentRow + 1;
  wsAp.getCell(summaryStart, 2).value = "SUMMARY:";
  wsAp.getCell(summaryStart, 2).font = { bold: true };
  
  wsAp.getCell(summaryStart + 1, 2).value = "Total Number of days";
  wsAp.getCell(summaryStart + 1, 2).font = { bold: true };
  wsAp.getCell(summaryStart + 1, 3).value = fmt(auditTotals?.totalCalendarDays || 0);

  wsAp.getCell(summaryStart + 2, 2).value = "Automatic Holiday";
  wsAp.getCell(summaryStart + 2, 2).font = { bold: true };
  wsAp.getCell(summaryStart + 2, 3).value = fmt(totalAutoNw);

  wsAp.getCell(summaryStart + 3, 2).value = "Manual Leave/Holiday";
  wsAp.getCell(summaryStart + 3, 2).font = { bold: true };
  wsAp.getCell(summaryStart + 3, 3).value = fmt(totalManual);

  wsAp.getCell(summaryStart + 4, 2).value = "Actual Number of Working days";
  wsAp.getCell(summaryStart + 4, 2).font = { bold: true };
  wsAp.getCell(summaryStart + 4, 3).value = fmt(auditTotals?.actualWorkingDays || 0);

  for (let r = summaryStart + 1; r <= summaryStart + 4; r++) {
    for (let c = 2; c <= 3; c++) {
      wsAp.getCell(r, c).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
  }

  // Generate blob and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

export async function exportHandingTakingToExcel(headers: string[], rows: any[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Handing & Taking Book');

  // Add Headers
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' } // Light gray background
  };
  headerRow.border = {
    bottom: { style: 'thin' }
  };

  // Add Rows
  rows.forEach(r => ws.addRow(r));

  // Auto-fit columns
  ws.columns.forEach(column => {
    column.width = 20;
    column.alignment = { vertical: 'middle', wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, 'Handing_Taking_Book.xlsx');
}

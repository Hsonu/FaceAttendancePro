const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ─── Excel Report Generator ────────────────────────────────────────────────────
const generateExcel = async (records, { startDate, endDate } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  // ── Title Row ──
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Employee Attendance Report';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  sheet.getRow(1).height = 35;

  // ── Date Range Row ──
  sheet.mergeCells('A2:K2');
  const rangeCell = sheet.getCell('A2');
  rangeCell.value = startDate && endDate
    ? `Period: ${startDate}  to  ${endDate}`
    : `Generated: ${new Date().toLocaleDateString()}`;
  rangeCell.font = { italic: true, size: 11, color: { argb: 'FF555555' } };
  rangeCell.alignment = { horizontal: 'center' };
  rangeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFF8' } };
  sheet.getRow(2).height = 22;

  // ── Header Row ──
  const headers = [
    { header: '#', key: 'no', width: 6 },
    { header: 'Emp ID', key: 'empId', width: 12 },
    { header: 'Employee Name', key: 'name', width: 22 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Check In', key: 'checkIn', width: 14 },
    { header: 'Check Out', key: 'checkOut', width: 14 },
    { header: 'Work Hours', key: 'hours', width: 13 },
    { header: 'Overtime', key: 'overtime', width: 13 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Duration (min)', key: 'duration', width: 16 },
  ];

  sheet.columns = headers;

  // Style header row
  const headerRow = sheet.getRow(3);
  headerRow.values = headers.map((h) => h.header);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } },
    };
  });
  headerRow.height = 28;

  // ── Data Rows ──
  const statusColors = {
    present: 'FFD1FAE5',
    late: 'FFFEF3C7',
    'half-day': 'FFFDE8D0',
    absent: 'FFFEE2E2',
  };

  records.forEach((record, index) => {
    const rowIndex = index + 4; // rows 1-3 are title, range, header
    const row = sheet.getRow(rowIndex);

    const formatTime = (date) =>
      date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    row.values = [
      index + 1,
      record.employee?.employeeId || '-',
      record.employee?.name || '-',
      record.employee?.department || '-',
      record.date,
      formatTime(record.checkIn),
      formatTime(record.checkOut),
      record.workHours ? `${record.workHours}h` : '-',
      record.overtime ? `${record.overtime}h` : '0h',
      record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-',
      record.duration || 0,
    ];

    const bgColor = statusColors[record.status] || 'FFFFFFFF';
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
      // Color Overtime column if positive
      if (colNumber === 9 && record.overtime > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        cell.font = { bold: true, color: { argb: 'FF065F46' } };
      }
      // Color status column (now column 10)
      if (colNumber === 10) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { bold: true };
      }
    });

    row.height = 22;
  });

  // ── Summary Row ──
  const summaryRowIndex = records.length + 4;
  const summaryRow = sheet.getRow(summaryRowIndex);
  const totalHours = records.reduce((acc, r) => acc + (r.workHours || 0), 0);
  const totalOT = records.reduce((acc, r) => acc + (r.overtime || 0), 0);
  const totalPresent = records.filter(r => ['present', 'late', 'half-day'].includes(r.status)).length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;

  summaryRow.getCell(1).value = 'TOTAL';
  summaryRow.getCell(3).value = `Present: ${totalPresent}  |  Absent: ${totalAbsent}`;
  summaryRow.getCell(8).value = `${totalHours.toFixed(2)}h`;
  summaryRow.getCell(9).value = `${totalOT.toFixed(2)}h`;
  summaryRow.getCell(11).value = records.reduce((acc, r) => acc + (r.duration || 0), 0);
  summaryRow.font = { bold: true };
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFF8' } };

  // Auto-filter on header
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 11 },
  };

  // Freeze top 3 rows
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

// ─── PDF Report Generator ──────────────────────────────────────────────────────
const generatePDF = (records, res, { startDate, endDate, summaryOnly } = {}) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  const pageWidth = doc.page.width - 80; // 40px margin on each side

  // ── Compute stats ──
  const totalRecords = records.length;
  const totalPresent = records.filter(r => ['present', 'late', 'half-day'].includes(r.status)).length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;
  const totalWorkHours = records.reduce((acc, r) => acc + (r.workHours || 0), 0);
  const totalOvertime = records.reduce((acc, r) => acc + (r.overtime || 0), 0);

  // Compute per-employee summary
  const empSummaryMap = {};
  records.forEach(r => {
    if (r.employee) {
      const empIdStr = r.employee._id ? r.employee._id.toString() : r.employee.toString();
      const empName = r.employee.name || 'Unknown';
      const empCode = r.employee.employeeId || '-';
      const empDept = r.employee.department || 'General';
      if (!empSummaryMap[empIdStr]) {
        empSummaryMap[empIdStr] = {
          name: empName,
          employeeId: empCode,
          department: empDept,
          present: 0,
          absent: 0,
          workHours: 0,
          overtime: 0,
        };
      }
      const summary = empSummaryMap[empIdStr];
      if (['present', 'late', 'half-day'].includes(r.status)) {
        summary.present += 1;
      } else if (r.status === 'absent') {
        summary.absent += 1;
      }
      summary.workHours += r.workHours || 0;
      summary.overtime += r.overtime || 0;
    }
  });
  const employeeSummary = Object.values(empSummaryMap);

  // ── Executive Summary Header ──
  doc.rect(40, 40, pageWidth, 60).fill('#1E3A5F');
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold');
  doc.text('Employee Attendance Report Summary', 40, 52, { width: pageWidth, align: 'center' });
  doc.fontSize(11).font('Helvetica');
  const dateRange = startDate && endDate
    ? `Period: ${startDate}  to  ${endDate}`
    : `Generated: ${new Date().toLocaleDateString()}`;
  doc.text(dateRange, 40, 80, { width: pageWidth, align: 'center' });

  // ── Stats Cards ──
  const boxWidth = 142.8;
  const boxHeight = 50;
  const boxY = 120;
  const gap = 12;

  const cardData = [
    { label: 'Total Logs', value: String(totalRecords), color: '#2563EB', bgColor: '#EFF6FF' },
    { label: 'Present Days', value: String(totalPresent), color: '#059669', bgColor: '#ECFDF5' },
    { label: 'Absent Days', value: String(totalAbsent), color: '#DC2626', bgColor: '#FEF2F2' },
    { label: 'Total Hours', value: `${totalWorkHours.toFixed(1)}h`, color: '#4F46E5', bgColor: '#EEF2F6' },
    { label: 'Total Overtime', value: `${totalOvertime.toFixed(1)}h`, color: '#D97706', bgColor: '#FEF3C7' },
  ];

  cardData.forEach((card, i) => {
    const cardX = 40 + i * (boxWidth + gap);
    doc.rect(cardX, boxY, boxWidth, boxHeight).fill(card.bgColor);
    doc.rect(cardX, boxY, boxWidth, boxHeight).strokeColor('#E5E7EB').lineWidth(1).stroke();

    doc.fillColor('#4B5563').fontSize(8).font('Helvetica-Bold');
    doc.text(card.label.toUpperCase(), cardX + 8, boxY + 8, { width: boxWidth - 16 });

    doc.fillColor(card.color).fontSize(16).font('Helvetica-Bold');
    doc.text(card.value, cardX + 8, boxY + 22, { width: boxWidth - 16 });
  });

  // ── Employee Performance Table ──
  let currentY = 190;
  doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold');
  doc.text('Employee Summary Breakdown', 40, currentY);
  currentY += 18;

  const empCols = [
    { label: 'Employee Name', width: 180, align: 'left' },
    { label: 'Emp ID', width: 90, align: 'center' },
    { label: 'Department', width: 120, align: 'center' },
    { label: 'Present Days', width: 90, align: 'center' },
    { label: 'Absent Days', width: 90, align: 'center' },
    { label: 'Total Hours', width: 90, align: 'center' },
    { label: 'Overtime', width: 102, align: 'center' },
  ];

  doc.rect(40, currentY, pageWidth, 20).fill('#1E3A5F');
  doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');

  let empColX = 40;
  empCols.forEach((col) => {
    doc.text(col.label, empColX + 5, currentY + 6, { width: col.width - 10, align: col.align });
    empColX += col.width;
  });
  currentY += 20;

  employeeSummary.forEach((emp, index) => {
    if (currentY > doc.page.height - 60) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      currentY = 40;

      doc.rect(40, currentY, pageWidth, 20).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      let tmpColX = 40;
      empCols.forEach((col) => {
        doc.text(col.label, tmpColX + 5, currentY + 6, { width: col.width - 10, align: col.align });
        tmpColX += col.width;
      });
      currentY += 20;
    }

    const rowHeight = 18;
    const bgColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    doc.rect(40, currentY, pageWidth, rowHeight).fill(bgColor);

    doc.fontSize(8).font('Helvetica');

    let curX = 40;

    doc.fillColor('#111827').font('Helvetica-Bold').text(emp.name, curX + 5, currentY + 5, { width: empCols[0].width - 10, align: 'left' });
    curX += empCols[0].width;

    doc.fillColor('#4B5563').font('Helvetica').text(emp.employeeId, curX + 5, currentY + 5, { width: empCols[1].width - 10, align: 'center' });
    curX += empCols[1].width;

    doc.text(emp.department, curX + 5, currentY + 5, { width: empCols[2].width - 10, align: 'center' });
    curX += empCols[2].width;

    doc.fillColor('#059669').font('Helvetica-Bold').text(`${emp.present} days`, curX + 5, currentY + 5, { width: empCols[3].width - 10, align: 'center' });
    curX += empCols[3].width;

    const absentColor = emp.absent > 0 ? '#DC2626' : '#4B5563';
    doc.fillColor(absentColor).font('Helvetica-Bold').text(`${emp.absent} days`, curX + 5, currentY + 5, { width: empCols[4].width - 10, align: 'center' });
    curX += empCols[4].width;

    doc.fillColor('#111827').font('Helvetica').text(`${emp.workHours.toFixed(1)}h`, curX + 5, currentY + 5, { width: empCols[5].width - 10, align: 'center' });
    curX += empCols[5].width;

    const otColor = emp.overtime > 0 ? '#D97706' : '#4B5563';
    const otFont = emp.overtime > 0 ? 'Helvetica-Bold' : 'Helvetica';
    doc.fillColor(otColor).font(otFont).text(`${emp.overtime.toFixed(1)}h`, curX + 5, currentY + 5, { width: empCols[6].width - 10, align: 'center' });
    curX += empCols[6].width;

    doc.moveTo(40, currentY + rowHeight).lineTo(40 + pageWidth, currentY + rowHeight)
      .strokeColor('#E5E7EB').lineWidth(0.5).stroke();

    currentY += rowHeight;
  });

  if (summaryOnly) {
    doc.end();
    return;
  }

  // ── Page Break for Detailed Table ──
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });

  currentY = 40;
  doc.rect(40, currentY, pageWidth, 40).fill('#1E3A5F');
  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold');
  doc.text('Detailed Attendance Logs', 40, currentY + 12, { width: pageWidth, align: 'center' });
  currentY += 50;

  const cols = [
    { label: '#', width: 30 },
    { label: 'Emp ID', width: 65 },
    { label: 'Name', width: 120 },
    { label: 'Department', width: 90 },
    { label: 'Date', width: 75 },
    { label: 'Check In', width: 65 },
    { label: 'Check Out', width: 65 },
    { label: 'Hours', width: 55 },
    { label: 'Overtime', width: 55 },
    { label: 'Status', width: 70 },
  ];

  doc.rect(40, currentY, pageWidth, 24).fill('#2563EB');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

  let colX = 40;
  cols.forEach((col) => {
    doc.text(col.label, colX + 3, currentY + 8, { width: col.width - 6, align: 'center' });
    colX += col.width;
  });

  currentY += 24;

  const statusColors = {
    present: '#D1FAE5',
    late: '#FEF3C7',
    'half-day': '#FDE8D0',
    absent: '#FEE2E2',
  };
  const statusTextColors = {
    present: '#065F46',
    late: '#92400E',
    'half-day': '#9A3412',
    absent: '#991B1B',
  };

  const formatTime = (date) =>
    date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

  records.forEach((record, index) => {
    if (currentY > doc.page.height - 80) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      currentY = 40;

      doc.rect(40, currentY, pageWidth, 24).fill('#2563EB');
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

      let tmpX = 40;
      cols.forEach((col) => {
        doc.text(col.label, tmpX + 3, currentY + 8, { width: col.width - 6, align: 'center' });
        tmpX += col.width;
      });

      currentY += 24;
    }

    const rowHeight = 20;
    const bgColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    doc.rect(40, currentY, pageWidth, rowHeight).fill(bgColor);

    const rowData = [
      index + 1,
      record.employee?.employeeId || '-',
      record.employee?.name || '-',
      record.employee?.department || '-',
      record.date,
      formatTime(record.checkIn),
      formatTime(record.checkOut),
      record.workHours ? `${record.workHours}h` : '-',
      record.overtime ? `${record.overtime}h` : '0h',
      record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-',
    ];

    colX = 40;
    rowData.forEach((val, colIdx) => {
      const col = cols[colIdx];
      if (colIdx === 9 && record.status) {
        doc.rect(colX, currentY, col.width, rowHeight).fill(statusColors[record.status] || '#F9FAFB');
        doc.fillColor(statusTextColors[record.status] || '#111827').font('Helvetica-Bold');
      } else if (colIdx === 8 && record.overtime > 0) {
        doc.rect(colX, currentY, col.width, rowHeight).fill('#D1FAE5');
        doc.fillColor('#065F46').font('Helvetica-Bold');
      } else {
        doc.fillColor('#111827').font('Helvetica');
      }
      doc.fontSize(8).text(String(val), colX + 3, currentY + 6, {
        width: col.width - 6,
        align: 'center',
        lineBreak: false,
      });
      colX += col.width;
    });

    doc.moveTo(40, currentY + rowHeight).lineTo(40 + pageWidth, currentY + rowHeight)
      .strokeColor('#E5E7EB').lineWidth(0.5).stroke();

    currentY += rowHeight;
  });

  // Summary Footer
  currentY += 10;
  doc.rect(40, currentY, pageWidth, 24).fill('#E8EFF8');
  doc.fillColor('#1E3A5F').font('Helvetica-Bold').fontSize(10);
  doc.text(`Records: ${records.length}`, 45, currentY + 8);
  doc.text(`Present: ${totalPresent}`, 145, currentY + 8);
  doc.text(`Absent: ${totalAbsent}`, 245, currentY + 8);
  doc.text(`Work Hours: ${totalWorkHours.toFixed(2)}h`, 365, currentY + 8);
  doc.text(`Overtime: ${totalOvertime.toFixed(2)}h`, 525, currentY + 8);

  doc.end();
};

module.exports = { generateExcel, generatePDF };

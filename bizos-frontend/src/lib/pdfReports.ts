'use client';

// Dynamic import to avoid SSR issues
export async function generateProfitLossPDF(data: {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  tithe: number;
  available: number;
  expenseBreakdown?: { category: string; amount: number; percentage: number }[];
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const RED = [200, 16, 46] as [number, number, number];
  const DARK = [28, 23, 20] as [number, number, number];
  const GRAY = [100, 90, 80] as [number, number, number];

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  // Header bar
  doc.setFillColor(...RED);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('d-ash', 14, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DASH & CO. — DIGITAL & HARDWARE SOLUTIONS', 14, 19);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFIT & LOSS REPORT', 210 - 14, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${data.period}`, 210 - 14, 19, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}`, 210 - 14, 24, { align: 'right' });

  // Summary cards
  const cards = [
    { label: 'Total Revenue', value: fmt(data.revenue), color: [6, 122, 82] as [number, number, number] },
    { label: 'Total Expenses', value: fmt(data.expenses), color: RED },
    { label: 'Net Profit', value: fmt(data.profit), color: data.profit >= 0 ? [6, 122, 82] as [number, number, number] : RED },
    { label: 'Available Balance', value: fmt(data.available), color: [6, 100, 160] as [number, number, number] },
  ];

  let x = 14;
  cards.forEach((card) => {
    doc.setFillColor(248, 244, 238);
    doc.roundedRect(x, 34, 43, 20, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label.toUpperCase(), x + 4, 41);
    doc.setFontSize(11);
    doc.setTextColor(...card.color);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 4, 50);
    x += 46;
  });

  // P&L table
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Statement', 14, 64);

  autoTable(doc, {
    startY: 68,
    head: [['Item', 'Amount', 'Notes']],
    body: [
      ['Revenue', fmt(data.revenue), 'Repair jobs + Sales'],
      ['Cost of Goods / Parts', fmt(Math.max(0, data.expenses * 0.6)), 'Estimated parts cost'],
      ['Operating Expenses', fmt(Math.max(0, data.expenses * 0.4)), 'Overhead & other'],
      ['Total Expenses', fmt(data.expenses), ''],
      ['Gross Profit', fmt(data.profit), data.profit >= 0 ? 'Profit' : 'Loss'],
      ['Tithe (10%)', fmt(data.tithe), 'Give first'],
      ['Available Balance', fmt(data.available), 'After tithe'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', font: 'courier' },
      2: { textColor: [140, 126, 112] },
    },
    rowPageBreak: 'avoid',
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // Expense breakdown
  if (data.expenseBreakdown?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Expense Breakdown', 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Category', 'Amount', '%']],
      body: data.expenseBreakdown.map(e => [e.category, fmt(e.amount), `${e.percentage.toFixed(1)}%`]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [74, 64, 56], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 248, 244] },
      columnStyles: { 1: { halign: 'right', font: 'courier' }, 2: { halign: 'right' } },
    });
    finalY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer
  doc.setFillColor(...RED);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Dash & Co. — Confidential Business Report', 14, 292);
  doc.text(`Page 1 of 1`, 210 - 14, 292, { align: 'right' });

  doc.save(`dash-pnl-report-${data.period.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export async function generateRepairReceipt(job: {
  job_number: number;
  customer_name: string;
  customer_phone?: string;
  device_type: string;
  device_model?: string;
  fault_description?: string;
  labor_charge: number;
  total_charge: number;
  amount_paid: number;
  parts_cost: number;
  profit: number;
  status: string;
  received_at: string;
  delivered_at?: string;
  parts: { item_name: string; quantity: number; unit_cost: number; selling_price?: number; damaged: boolean }[];
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
  const RED = [200, 16, 46] as [number, number, number];
  const DARK = [28, 23, 20] as [number, number, number];
  const fmt = (n: number) => `N${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  const dateStr = (s: string) => new Date(s).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  let y = 8;

  // Header
  doc.setFillColor(...RED);
  doc.rect(0, 0, 80, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('d-ash', 40, 10, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('DASH & CO. DIGITAL & HARDWARE SOLUTIONS', 40, 16, { align: 'center' });
  doc.text('REPAIR RECEIPT', 40, 21, { align: 'center' });

  y = 28;

  // Job number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`JOB #${job.job_number}`, 40, y, { align: 'center' });
  y += 5;

  // Customer info
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 70, 60);
  doc.text(`Customer: ${job.customer_name}`, 6, y); y += 4;
  if (job.customer_phone) { doc.text(`Phone: ${job.customer_phone}`, 6, y); y += 4; }
  doc.text(`Device: ${job.device_type}${job.device_model ? ' — ' + job.device_model : ''}`, 6, y); y += 4;
  doc.text(`Received: ${dateStr(job.received_at)}`, 6, y); y += 4;
  if (job.delivered_at) { doc.text(`Delivered: ${dateStr(job.delivered_at)}`, 6, y); y += 4; }
  doc.text(`Status: ${job.status.replace('_', ' ').toUpperCase()}`, 6, y); y += 5;

  // Divider
  doc.setDrawColor(200, 190, 180);
  doc.setLineWidth(0.3);
  doc.line(6, y, 74, y);
  y += 4;

  // Parts table
  if (job.parts.length > 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('PARTS USED', 6, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Part', 'Qty', 'Price']],
      body: job.parts.map(p => [
        p.damaged ? `${p.item_name} (dmg)` : p.item_name,
        `x${p.quantity}`,
        fmt((p.selling_price || p.unit_cost) * p.quantity),
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 50, 45], textColor: [255, 255, 255], fontSize: 6.5 },
      alternateRowStyles: { fillColor: [250, 248, 244] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: 6, right: 6 },
      tableWidth: 68,
    });

    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Totals
  doc.setDrawColor(200, 190, 180);
  doc.line(6, y, 74, y);
  y += 4;

  // Customer-facing: show selling prices, not purchase costs
  const partsCharge = job.parts.reduce((sum, p) => sum + (p.selling_price || p.unit_cost) * p.quantity, 0);
  const totals = [
    { label: 'Labor Charge', value: fmt(job.labor_charge) },
    { label: 'Parts', value: fmt(partsCharge) },
  ];
  totals.forEach(({ label, value }) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 70, 60);
    doc.text(label, 6, y);
    doc.text(value, 74, y, { align: 'right' });
    y += 4;
  });

  doc.setDrawColor(200, 190, 180);
  doc.line(6, y, 74, y);
  y += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('TOTAL', 6, y);
  doc.text(fmt(job.total_charge), 74, y, { align: 'right' });
  y += 5;

  // Amount paid & balance
  const balance = job.total_charge - (job.amount_paid || 0);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 70, 60);
  doc.text('Amount Paid', 6, y);
  doc.text(fmt(job.amount_paid || 0), 74, y, { align: 'right' });
  y += 4;

  if (balance > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text('BALANCE OWING', 6, y);
    doc.text(fmt(balance), 74, y, { align: 'right' });
    y += 5;
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 122, 82);
    doc.text('PAID IN FULL', 40, y, { align: 'center' });
    y += 5;
  }
  y += 3;

  // Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 110, 100);
  doc.text('Thank you for choosing Dash & Co.!', 40, y, { align: 'center' });
  y += 4;
  doc.text('All repairs carry a 14-day warranty.', 40, y, { align: 'center' });
  y += 4;
  doc.text(`Printed: ${new Date().toLocaleDateString('en-NG')}`, 40, y, { align: 'center' });

  // Resize page to content
  doc.save(`receipt-job-${job.job_number}.pdf`);
}

export async function generateSaleReceipt(sale: {
  item_name: string;
  customer?: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  profit: number;
  sold_at: string;
}) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 140] });
  const RED = [200, 16, 46] as [number, number, number];
  const DARK = [28, 23, 20] as [number, number, number];
  const fmt = (n: number) => `N${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  // Header
  doc.setFillColor(...RED);
  doc.rect(0, 0, 80, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('d-ash', 40, 10, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('DASH & CO. DIGITAL & HARDWARE SOLUTIONS', 40, 16, { align: 'center' });
  doc.text('SALE RECEIPT', 40, 21, { align: 'center' });

  let y = 30;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 70, 60);

  const rows = [
    ['Date', new Date(sale.sold_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })],
    ...(sale.customer ? [['Customer', sale.customer]] : []),
    ['Item', sale.item_name],
    ['Qty', String(sale.quantity)],
    ['Unit Price', fmt(sale.selling_price)],
  ];

  rows.forEach(([label, value]) => {
    doc.setTextColor(120, 110, 100);
    doc.text(label, 6, y);
    doc.setTextColor(...DARK);
    doc.text(value, 74, y, { align: 'right' });
    y += 5;
  });

  doc.setDrawColor(200, 190, 180);
  doc.setLineWidth(0.3);
  doc.line(6, y, 74, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('TOTAL', 6, y);
  doc.text(fmt(sale.selling_price * sale.quantity), 74, y, { align: 'right' });
  y += 10;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 110, 100);
  doc.text('Thank you for shopping with Dash & Co.!', 40, y, { align: 'center' });
  y += 4;
  doc.text(`Printed: ${new Date().toLocaleDateString('en-NG')}`, 40, y, { align: 'center' });

  doc.save(`receipt-sale-${sale.item_name.replace(/\s+/g, '-').toLowerCase()}-${new Date(sale.sold_at).toISOString().slice(0, 10)}.pdf`);
}

export async function generateInventoryPDF(items: {
  name: string; category: string; sku?: string;
  quantity_in_stock: number; purchase_price: number; selling_price?: number;
}[]) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const RED = [200, 16, 46] as [number, number, number];

  doc.setFillColor(...RED);
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTORY REPORT — Dash & Co.', 10, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-NG')} · Total: ${items.length} items`, 297 - 10, 13, { align: 'right' });

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  const totalValue = items.reduce((s, i) => s + i.purchase_price * i.quantity_in_stock, 0);

  autoTable(doc, {
    startY: 24,
    head: [['Item Name', 'Category', 'SKU', 'Stock Qty', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status']],
    body: items.map(i => [
      i.name,
      i.category,
      i.sku ?? '—',
      i.quantity_in_stock,
      fmt(i.purchase_price),
      i.selling_price ? fmt(i.selling_price) : '—',
      fmt(i.purchase_price * i.quantity_in_stock),
      i.quantity_in_stock === 0 ? 'OUT' : i.quantity_in_stock <= 5 ? 'LOW' : 'OK',
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'right', font: 'courier' },
      5: { halign: 'right', font: 'courier' },
      6: { halign: 'right', font: 'courier' },
      7: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7) {
        const v = String(data.cell.raw);
        if (v === 'LOW') { data.cell.styles.textColor = [192, 120, 0]; data.cell.styles.fontStyle = 'bold'; }
        if (v === 'OUT') { data.cell.styles.textColor = [200, 16, 46]; data.cell.styles.fontStyle = 'bold'; }
        if (v === 'OK') { data.cell.styles.textColor = [6, 122, 82]; }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 23, 20);
  doc.text(`Total Inventory Value: ₦${totalValue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 10, finalY);

  doc.save(`dash-inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

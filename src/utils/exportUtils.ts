import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, InventoryMovement, Customer, Product, DebtPayment, PharmacySettings } from '../types/pharmacy';
import { formatCurrency, formatDateTime, formatDate, getExpiryStatus } from './formatters';

export interface MonthlyReportData {
  monthName: string;
  year: number;
  startDate: Date;
  endDate: Date;
  sales: Sale[];
  movements: InventoryMovement[];
  customers: Customer[];
  products: Product[];
  payments: DebtPayment[];
  settings: PharmacySettings;
}

export function exportMonthlyReportToExcel(data: MonthlyReportData) {
  const wb = XLSX.utils.book_new();

  // 1. Resumen General
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = data.sales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;
  const creditSales = data.sales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);
  const cashSales = totalSales - creditSales;
  const totalCollectedDebt = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalEntries = data.movements.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.totalValue, 0);
  const totalExits = data.movements.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.totalValue, 0);
  const totalCurrentDebt = data.customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const currentInventoryValue = data.products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);

  const summarySheetData = [
    ['REPORTE MENSUAL DE OPERACIONES FARMACÉUTICAS'],
    ['Farmacia:', data.settings.name],
    ['RFC:', data.settings.rfc],
    ['Período:', `${data.monthName} ${data.year}`],
    ['Fecha de Generación:', new Date().toLocaleString('es-MX')],
    [],
    ['MÉTRICA FINANCIERA', 'VALOR (MXN)'],
    ['Ventas Totales del Mes', totalSales],
    ['Costo Total de Mercancía Vendida', totalCost],
    ['Ganancia Bruta Estimada', grossProfit],
    ['Margen Bruto (%)', totalSales > 0 ? `${((grossProfit / totalSales) * 100).toFixed(1)}%` : '0%'],
    ['Ventas de Contado (Efectivo/Tarjeta)', cashSales],
    ['Ventas a Crédito / Fiado', creditSales],
    ['Cobranza de Deuda / Abonos Recibidos', totalCollectedDebt],
    ['Total Entradas de Inventario (Compras)', totalEntries],
    ['Total Salidas de Inventario (Mermas/Caducados)', totalExits],
    ['Saldo Total en Deuda por Cobrar', totalCurrentDebt],
    ['Valor Actual del Inventario (al costo)', currentInventoryValue],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');

  // 2. Detalle de Ventas
  const salesRows: any[] = [];
  data.sales.forEach(sale => {
    sale.items.forEach(item => {
      salesRows.push({
        'Folio Venta': sale.folio,
        'Fecha y Hora': formatDateTime(sale.date),
        'Producto': item.productName,
        'Presentación': item.presentation,
        'Cantidad': item.quantity,
        'Precio Unitario': item.unitPrice,
        'Costo Unitario': item.costPrice,
        'Descuento (%)': item.discountPercentage,
        'Subtotal Venta': item.subtotal,
        'Ganancia Item': (item.unitPrice - item.costPrice) * item.quantity,
        'Método Pago': sale.paymentMethod === 'credit' ? 'Crédito / Fiado' : sale.paymentMethod.toUpperCase(),
        'Cliente': sale.customerName || 'Público General',
        'Vendedor': sale.seller,
      });
    });
  });
  const wsSales = XLSX.utils.json_to_sheet(salesRows.length > 0 ? salesRows : [{ Mensaje: 'Sin ventas en este período' }]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Detalle de Ventas');

  // 3. Entradas y Salidas de Inventario
  const movRows: any[] = [];
  data.movements.forEach(mov => {
    mov.items.forEach(item => {
      movRows.push({
        'Folio Movimiento': mov.folio,
        'Tipo': mov.type === 'entry' ? 'ENTRADA' : 'SALIDA',
        'Motivo': mov.reason.toUpperCase(),
        'Fecha': formatDateTime(mov.date),
        'Producto': item.productName,
        'Cantidad': item.quantity,
        'Costo Unitario': item.costPrice,
        'Total Valor': item.subtotal,
        'Lote': item.batchNumber || '-',
        'Fecha Caducidad': item.expirationDate ? formatDate(item.expirationDate) : '-',
        'Proveedor / Destino': mov.supplierOrDestination || '-',
        'Factura / Referencia': mov.referenceInvoice || '-',
        'Responsable': mov.registeredBy,
        'Notas': mov.notes || '-',
      });
    });
  });
  const wsMov = XLSX.utils.json_to_sheet(movRows.length > 0 ? movRows : [{ Mensaje: 'Sin movimientos registrados' }]);
  XLSX.utils.book_append_sheet(wb, wsMov, 'Entradas y Salidas');

  // 4. Clientes y Cuentas de Deuda
  const custRows = data.customers.map(c => ({
    'Nombre del Cliente': c.name,
    'Teléfono': c.phone,
    'Identificación / RFC': c.idNumber || '-',
    'Límite de Crédito': c.creditLimit,
    'Deuda Actual': c.currentDebt,
    'Crédito Disponible': Math.max(0, c.creditLimit - c.currentDebt),
    'Estado de Cuenta': c.currentDebt > c.creditLimit ? 'Límite Excedido' : c.currentDebt > 0 ? 'Con Saldo Deudor' : 'Al Corriente',
    'Documentos Registrados': c.documents?.length || 0,
    'Notas': c.notes || '-',
  }));
  const wsCust = XLSX.utils.json_to_sheet(custRows);
  XLSX.utils.book_append_sheet(wb, wsCust, 'Deudores y Créditos');

  // 5. Abonos y Cobranza del Mes
  const payRows = data.payments.map(p => ({
    'Folio Abono': p.folio,
    'Fecha': formatDateTime(p.date),
    'Cliente': p.customerName,
    'Monto Abonado': p.amount,
    'Método': p.paymentMethod.toUpperCase(),
    'Saldo Anterior': p.previousDebt,
    'Saldo Restante': p.remainingDebt,
    'Registrado Por': p.registeredBy,
    'Notas': p.notes || '-',
  }));
  const wsPay = XLSX.utils.json_to_sheet(payRows.length > 0 ? payRows : [{ Mensaje: 'Sin abonos en este período' }]);
  XLSX.utils.book_append_sheet(wb, wsPay, 'Abonos Recibidos');

  // 6. Caducidades y Stock Crítico
  const criticalProducts = data.products
    .map(p => {
      const exp = getExpiryStatus(p.expirationDate);
      return {
        'Código': p.barcode,
        'Medicamento': p.name,
        'Sustancia Activa': p.activeIngredient || '-',
        'Presentación': p.presentation,
        'Categoría': p.category,
        'Stock Actual': p.stock,
        'Stock Mínimo': p.minStock,
        'Alerta Stock': p.stock <= p.minStock ? 'STOCK BAJO' : 'OK',
        'Lote': p.batchNumber || '-',
        'Fecha Caducidad': p.expirationDate || '-',
        'Estado Caducidad': exp.label,
        'Requiere Receta': p.prescriptionRequired ? 'SÍ' : 'NO',
        'Ubicación': p.location || '-',
      };
    });
  const wsCrit = XLSX.utils.json_to_sheet(criticalProducts);
  XLSX.utils.book_append_sheet(wb, wsCrit, 'Inventario y Caducidades');

  const fileName = `Reporte_Mensual_${data.monthName}_${data.year}_${data.settings.name.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportMonthlyReportToPDF(data: MonthlyReportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const primaryColor = [15, 118, 110]; // Teal 700

  // Header banner
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.settings.name.toUpperCase(), 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`RFC: ${data.settings.rfc} | Licencia Sanitaria: ${data.settings.licenseNumber}`, 14, 18);
  doc.text(`Dirección: ${data.settings.address}, ${data.settings.city} | Tel: ${data.settings.phone}`, 14, 23);

  // Title box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`INFORME MENSUAL DE OPERACIONES - ${data.monthName.toUpperCase()} ${data.year}`, 14, 38);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 43);

  // Summary KPI Cards
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = data.sales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;
  const creditSales = data.sales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);
  const cashSales = totalSales - creditSales;
  const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCurrentDebt = data.customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalEntries = data.movements.filter(m => m.type === 'entry').reduce((sum, m) => sum + m.totalValue, 0);
  const totalExits = data.movements.filter(m => m.type === 'exit').reduce((sum, m) => sum + m.totalValue, 0);

  const kpis = [
    { title: 'Ventas Totales', val: formatCurrency(totalSales), sub: `${data.sales.length} transacciones` },
    { title: 'Ganancia Bruta', val: formatCurrency(grossProfit), sub: totalSales > 0 ? `${((grossProfit/totalSales)*100).toFixed(1)}% margen` : '0%' },
    { title: 'Ventas Contado', val: formatCurrency(cashSales), sub: 'Efectivo / Tarjeta' },
    { title: 'Ventas a Crédito', val: formatCurrency(creditSales), sub: 'Pendiente de cobro' },
    { title: 'Abonos Cobrados', val: formatCurrency(totalPayments), sub: `${data.payments.length} recibos` },
    { title: 'Deuda Total Activa', val: formatCurrency(totalCurrentDebt), sub: 'Cuentas por cobrar' },
  ];

  let startY = 48;
  const cardW = 58;
  const cardH = 18;

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * 63;
    const y = startY + row * 22;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3, y + 5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3, y + 11);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, y + 15.5);
  });

  // Table 1: Detalle de Ventas Top / Recientes
  startY = 96;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('1. VENTAS REGISTRADAS EN EL PERÍODO', 14, startY);

  const salesTableBody = data.sales.map(s => [
    s.folio,
    formatDateTime(s.date),
    s.customerName || 'Público General',
    s.items.length.toString(),
    s.paymentMethod === 'credit' ? 'CRÉDITO' : s.paymentMethod.toUpperCase(),
    formatCurrency(s.total),
  ]);

  autoTable(doc, {
    startY: startY + 3,
    head: [['Folio', 'Fecha', 'Cliente', 'Items', 'Método', 'Total']],
    body: salesTableBody.length > 0 ? salesTableBody : [['-', '-', 'Sin ventas registradas', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Table 2: Movimientos de Inventario (Entradas y Salidas)
  const afterSalesY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('2. MOVIMIENTOS DE INVENTARIO (ENTRADAS / SALIDAS)', 14, afterSalesY);

  const movTableBody = data.movements.map(m => [
    m.folio,
    m.type === 'entry' ? 'ENTRADA' : 'SALIDA',
    m.reason.toUpperCase(),
    formatDateTime(m.date),
    m.supplierOrDestination || '-',
    m.items.length.toString(),
    formatCurrency(m.totalValue),
  ]);

  autoTable(doc, {
    startY: afterSalesY + 3,
    head: [['Folio', 'Tipo', 'Motivo', 'Fecha', 'Proveedor/Destino', 'Artículos', 'Valor']],
    body: movTableBody.length > 0 ? movTableBody : [['-', '-', 'Sin movimientos', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Table 3: Estado de Crédito y Deudores
  const afterMovY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('3. ESTADO DE CUENTAS POR COBRAR (DEUDORES Y CRÉDITO)', 14, afterMovY);

  const debtors = data.customers.filter(c => c.currentDebt > 0);
  const debtorTableBody = debtors.map(c => [
    c.name,
    c.phone,
    formatCurrency(c.creditLimit),
    formatCurrency(c.currentDebt),
    formatCurrency(Math.max(0, c.creditLimit - c.currentDebt)),
    c.documents?.length ? `${c.documents.length} doc(s)` : 'Sin doc',
  ]);

  autoTable(doc, {
    startY: afterMovY + 3,
    head: [['Cliente', 'Teléfono', 'Límite Crédito', 'Deuda Actual', 'Disponible', 'Expediente']],
    body: debtorTableBody.length > 0 ? debtorTableBody : [['Todos los clientes están al corriente', '-', '-', '$0.00', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [180, 83, 9], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} - FarmaControl POS & Sistema de Farmacia`, 14, 290);
    doc.text(`Documento generado para control interno y auditoría farmacéutica`, 110, 290);
  }

  const fileName = `Reporte_Farmacia_${data.monthName}_${data.year}.pdf`;
  doc.save(fileName);
}

export function exportCustomerAccountStatementPDF(
  customer: Customer,
  sales: Sale[],
  payments: DebtPayment[],
  settings: PharmacySettings
) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Header
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.name.toUpperCase(), 14, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`ESTADO DE CUENTA Y HISTORIAL DE CRÉDITO | ${settings.phone}`, 14, 16);

  // Customer details block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLIENTE: ${customer.name}`, 14, 33);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Teléfono: ${customer.phone} | Identificación: ${customer.idNumber || 'N/A'}`, 14, 38);
  doc.text(`Domicilio: ${customer.address || 'Sin domicilio registrado'}`, 14, 43);

  // Summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 47, 182, 20, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('LÍMITE DE CRÉDITO', 20, 53);
  doc.text('SALDO DEUDOR ACTUAL', 80, 53);
  doc.text('CRÉDITO DISPONIBLE', 145, 53);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(customer.creditLimit), 20, 61);
  doc.setTextColor(185, 28, 28);
  doc.text(formatCurrency(customer.currentDebt), 80, 61);
  doc.setTextColor(15, 118, 110);
  doc.text(formatCurrency(Math.max(0, customer.creditLimit - customer.currentDebt)), 145, 61);

  // Sales on credit
  const customerSales = sales.filter(s => s.customerId === customer.id);
  const salesData = customerSales.map(s => [
    s.folio,
    formatDateTime(s.date),
    s.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
    s.paymentMethod === 'credit' ? 'A CRÉDITO' : 'CONTADO',
    formatCurrency(s.total),
  ]);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('COMPRAS Y CARGOS REGISTRADOS', 14, 75);

  autoTable(doc, {
    startY: 78,
    head: [['Folio', 'Fecha', 'Detalle de Medicamentos', 'Tipo', 'Monto']],
    body: salesData.length > 0 ? salesData : [['-', '-', 'Sin compras registradas', '-', '-']],
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Abonos
  const customerPayments = payments.filter(p => p.customerId === customer.id);
  const paymentsData = customerPayments.map(p => [
    p.folio,
    formatDateTime(p.date),
    p.paymentMethod.toUpperCase(),
    formatCurrency(p.previousDebt),
    formatCurrency(p.amount),
    formatCurrency(p.remainingDebt),
    p.notes || '-',
  ]);

  const afterSalesY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('ABONOS Y PAGOS REALIZADOS', 14, afterSalesY);

  autoTable(doc, {
    startY: afterSalesY + 3,
    head: [['Folio', 'Fecha', 'Método', 'Saldo Anterior', 'Abono', 'Nuevo Saldo', 'Notas']],
    body: paymentsData.length > 0 ? paymentsData : [['-', '-', '-', '-', 'Sin abonos registrados', '-', '-']],
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Documents attached note
  const afterPaymentsY = (doc as any).lastAutoTable.finalY + 8;
  if (customer.documents && customer.documents.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Documentos y Expediente adjunto (${customer.documents.length}):`, 14, afterPaymentsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    customer.documents.forEach((d, idx) => {
      doc.text(`• [${d.category}] ${d.name} (Subido: ${formatDate(d.uploadDate)})`, 18, afterPaymentsY + 5 + (idx * 4));
    });
  }

  doc.save(`Estado_Cuenta_${customer.name.replace(/\s+/g, '_')}.pdf`);
}

export interface DailyReportData {
  date: Date;
  sales: Sale[];
  payments: DebtPayment[];
  movements: InventoryMovement[];
  settings: PharmacySettings;
}

export function exportDailyReportToExcel(data: DailyReportData) {
  const wb = XLSX.utils.book_new();
  const dateStr = data.date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = data.sales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;
  const cashSales = data.sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardSales = data.sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const transferSales = data.sales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0);
  const creditSales = data.sales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);
  const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);

  const summarySheet = [
    ['CORTE Y REPORTE DIARIO DE VENTAS'],
    ['Farmacia:', data.settings.name],
    ['Fecha:', dateStr],
    ['Generado el:', new Date().toLocaleString('es-MX')],
    [],
    ['CONCEPTO', 'MONTO (MXN)'],
    ['Ventas Totales del Día', totalSales],
    ['Ganancia Bruta Estimada', grossProfit],
    ['Margen Estimado (%)', totalSales > 0 ? `${((grossProfit / totalSales) * 100).toFixed(1)}%` : '0%'],
    ['Total Tickets / Ventas', data.sales.length],
    ['Ticket Promedio', data.sales.length > 0 ? (totalSales / data.sales.length) : 0],
    [],
    ['DESGLOSE DE CAJA Y FORMAS DE PAGO', 'MONTO (MXN)'],
    ['Efectivo por Ventas de Hoy', cashSales],
    ['Efectivo por Cobro de Abonos de Deuda', totalPayments],
    ['TOTAL EFECTIVO EN CAJA', cashSales + totalPayments],
    ['Tarjeta Débito / Crédito', cardSales],
    ['Transferencia SPEI', transferSales],
    ['Ventas a Crédito (Fiado del Día)', creditSales],
  ];

  const wsSum = XLSX.utils.aoa_to_sheet(summarySheet);
  XLSX.utils.book_append_sheet(wb, wsSum, 'Corte Diario');

  const salesRows: any[] = [];
  data.sales.forEach(sale => {
    sale.items.forEach(item => {
      salesRows.push({
        'Folio Venta': sale.folio,
        'Hora': new Date(sale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        'Cliente': sale.customerName || 'Público General',
        'Medicamento': item.productName,
        'Presentación': item.presentation,
        'Cantidad': item.quantity,
        'Precio Unitario': item.unitPrice,
        'Subtotal': item.subtotal,
        'Método Pago': sale.isCredit ? 'Crédito' : sale.paymentMethod.toUpperCase(),
        'Vendedor': sale.seller,
      });
    });
  });
  const wsSales = XLSX.utils.json_to_sheet(salesRows.length > 0 ? salesRows : [{ Mensaje: 'Sin ventas hoy' }]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Detalle de Ventas');

  const dateFileStr = data.date.toISOString().split('T')[0];
  XLSX.writeFile(wb, `Corte_Diario_${dateFileStr}_${data.settings.name.replace(/\s+/g, '_')}.xlsx`);
}

export function exportDailyReportToPDF(data: DailyReportData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = data.date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Header banner
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.settings.name.toUpperCase(), 14, 10);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`CORTE DE CAJA Y REPORTE DIARIO DE VENTAS | ${dateStr.toUpperCase()}`, 14, 17);

  // Title Box
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = data.sales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;
  const cashSales = data.sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardSales = data.sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const transferSales = data.sales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0);
  const creditSales = data.sales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);
  const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);

  // KPIs
  const kpis = [
    { title: 'Ventas Totales del Día', val: formatCurrency(totalSales), sub: `${data.sales.length} tickets emitidos` },
    { title: 'Ganancia Estimada', val: formatCurrency(grossProfit), sub: totalSales > 0 ? `${((grossProfit/totalSales)*100).toFixed(1)}% margen` : '0%' },
    { title: 'Efectivo en Caja', val: formatCurrency(cashSales + totalPayments), sub: `Ventas + ${data.payments.length} abonos` },
    { title: 'Tarjetas / SPEI', val: formatCurrency(cardSales + transferSales), sub: 'Terminal y Bancos' },
  ];

  let startY = 32;
  kpis.forEach((kpi, idx) => {
    const x = 14 + (idx * 46);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, 43, 18, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 2.5, startY + 4.5);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 2.5, startY + 11);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 2.5, startY + 15.5);
  });

  // Table of Sales
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('LISTADO DE VENTAS DEL DÍA', 14, 58);

  const salesTableBody = data.sales.map(s => [
    s.folio,
    new Date(s.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    s.customerName || 'Público General',
    s.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
    s.paymentMethod === 'credit' ? 'CRÉDITO' : s.paymentMethod.toUpperCase(),
    formatCurrency(s.total),
  ]);

  autoTable(doc, {
    startY: 61,
    head: [['Folio', 'Hora', 'Cliente', 'Medicamentos', 'Método', 'Total']],
    body: salesTableBody.length > 0 ? salesTableBody : [['-', '-', 'Sin ventas registradas', '-', '-', '$0.00']],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  const dateFileStr = data.date.toISOString().split('T')[0];
  doc.save(`Corte_Diario_${dateFileStr}.pdf`);
}

export interface WeeklyReportData {
  startDate: Date;
  endDate: Date;
  sales: Sale[];
  payments: DebtPayment[];
  settings: PharmacySettings;
}

export function exportWeeklyReportToExcel(data: WeeklyReportData) {
  const wb = XLSX.utils.book_new();
  const rangeStr = `${data.startDate.toLocaleDateString('es-MX')} al ${data.endDate.toLocaleDateString('es-MX')}`;
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = data.sales.reduce((sum, s) => sum + s.items.reduce((isum, it) => isum + (it.costPrice * it.quantity), 0), 0);
  const grossProfit = totalSales - totalCost;

  const summarySheet = [
    ['REPORTE SEMANAL DE VENTAS'],
    ['Farmacia:', data.settings.name],
    ['Semana:', rangeStr],
    ['Generado el:', new Date().toLocaleString('es-MX')],
    [],
    ['MÉTRICA', 'VALOR'],
    ['Ventas Totales Semanales', totalSales],
    ['Ganancia Bruta Semanal', grossProfit],
    ['Margen Estimado (%)', totalSales > 0 ? `${((grossProfit / totalSales) * 100).toFixed(1)}%` : '0%'],
    ['Total Tickets en la Semana', data.sales.length],
    ['Promedio Diario (7 días)', totalSales / 7],
  ];

  const wsSum = XLSX.utils.aoa_to_sheet(summarySheet);
  XLSX.utils.book_append_sheet(wb, wsSum, 'Resumen Semanal');

  const salesRows: any[] = [];
  data.sales.forEach(sale => {
    salesRows.push({
      'Folio': sale.folio,
      'Fecha y Hora': formatDateTime(sale.date),
      'Cliente': sale.customerName || 'Público General',
      'Artículos': sale.items.length,
      'Método': sale.isCredit ? 'Crédito' : sale.paymentMethod.toUpperCase(),
      'Total': sale.total,
      'Vendedor': sale.seller,
    });
  });
  const wsSales = XLSX.utils.json_to_sheet(salesRows.length > 0 ? salesRows : [{ Mensaje: 'Sin ventas en esta semana' }]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas Semanales');

  XLSX.writeFile(wb, `Reporte_Semanal_${data.startDate.toISOString().split('T')[0]}_${data.settings.name.replace(/\s+/g, '_')}.xlsx`);
}

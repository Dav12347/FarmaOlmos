import { Product, PharmacySettings, Sale, DebtPayment, CashCut, Customer } from '../types/pharmacy';
import { formatDate, formatDateTime, formatCurrency } from './formatters';

export interface WhatsAppAlertOptions {
  expiryDays?: number;
  includeOutOfStock?: boolean;
  includeLowStock?: boolean;
  includeExpired?: boolean;
  includeExpiring?: boolean;
}

export interface CategorizedAlerts {
  outOfStock: Product[];
  lowStock: Product[];
  expired: Product[];
  expiring: { product: Product; daysLeft: number }[];
  totalAlertsCount: number;
}

/**
 * Formats a phone number for WhatsApp URL.
 * Defaults to Mexico country code (52) if 10 digits are provided.
 */
export function getWhatsAppCleanPhone(phone: string, countryCode = '52'): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // If 10 digits (standard Mexican mobile like 5573501782), prepend countryCode
  if (digits.length === 10) {
    return `${countryCode}${digits}`;
  }

  // If starts with + or already includes country code
  return digits;
}

/**
 * Formats phone number for display (e.g., "+52 55 7350 1782")
 */
export function formatPhoneDisplay(phone: string, countryCode = '52'): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    return `+${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

/**
 * Categorizes all products in inventory for stock and expiration warnings.
 */
export function analyzeInventoryForAlerts(
  products: Product[],
  options?: WhatsAppAlertOptions
): CategorizedAlerts {
  const expiryThresholdDays = options?.expiryDays ?? 30;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const outOfStock: Product[] = [];
  const lowStock: Product[] = [];
  const expired: Product[] = [];
  const expiring: { product: Product; daysLeft: number }[] = [];

  for (const p of products) {
    // 1. Stock Evaluation
    if (p.stock <= 0) {
      outOfStock.push(p);
    } else if (p.stock <= (p.minStock ?? 5)) {
      lowStock.push(p);
    }

    // 2. Expiration Evaluation
    if (p.expirationDate) {
      const [year, month, day] = p.expirationDate.split('-').map(Number);
      if (year && month && day) {
        const expDate = new Date(year, month - 1, day);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          expired.push(p);
        } else if (diffDays <= expiryThresholdDays) {
          expiring.push({ product: p, daysLeft: diffDays });
        }
      }
    }
  }

  // Sort expiring by soonest
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);

  const totalAlertsCount = outOfStock.length + lowStock.length + expired.length + expiring.length;

  return {
    outOfStock,
    lowStock,
    expired,
    expiring,
    totalAlertsCount,
  };
}

/**
 * Builds the complete WhatsApp message ready to be sent to the pharmacist / owner.
 */
export function buildWhatsAppStockAlertMessage(
  products: Product[],
  settings: PharmacySettings,
  options?: WhatsAppAlertOptions
): string {
  const opts: Required<WhatsAppAlertOptions> = {
    expiryDays: options?.expiryDays ?? settings.whatsappAlertExpiryDays ?? 30,
    includeOutOfStock: options?.includeOutOfStock ?? settings.whatsappAlertIncludeOutOfStock ?? true,
    includeLowStock: options?.includeLowStock ?? settings.whatsappAlertIncludeLowStock ?? true,
    includeExpired: options?.includeExpired ?? settings.whatsappAlertIncludeExpired ?? true,
    includeExpiring: options?.includeExpiring ?? settings.whatsappAlertIncludeExpiring ?? true,
  };

  const { outOfStock, lowStock, expired, expiring, totalAlertsCount } = analyzeInventoryForAlerts(products, opts);

  const dateFormatted = new Date().toLocaleDateString('es-MX', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();

  const lines: string[] = [];
  lines.push(`🔔 *ALERTA DE CONTROL SANITARIO Y STOCK* 🔔`);
  lines.push(`🏥 *${pharmacyTitle}*`);
  lines.push(`📅 _Generado: ${dateFormatted}_`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (totalAlertsCount === 0) {
    lines.push(`✅ *TODO EN ORDEN:*`);
    lines.push(`No hay medicamentos agotados, con poco stock ni con riesgo de caducidad en los próximos ${opts.expiryDays} días.`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_FarmaControl POS - Sistema de Farmacia_`);
    return lines.join('\n');
  }

  // 1. OUT OF STOCK
  if (opts.includeOutOfStock && outOfStock.length > 0) {
    lines.push(`🚨 *MEDICAMENTOS AGOTADOS / SIN STOCK (${outOfStock.length}):*`);
    outOfStock.slice(0, 15).forEach(p => {
      lines.push(`• *${p.name}*`);
      lines.push(`  Stock: *0 pzas* (Mínimo: ${p.minStock ?? 5}) ${p.barcode ? `| Código: ${p.barcode}` : ''}`);
    });
    if (outOfStock.length > 15) {
      lines.push(`  _...y ${outOfStock.length - 15} productos más sin stock._`);
    }
    lines.push(``);
  }

  // 2. LOW STOCK
  if (opts.includeLowStock && lowStock.length > 0) {
    lines.push(`⚠️ *MEDICAMENTOS CON POCO STOCK (${lowStock.length}):*`);
    lowStock.slice(0, 15).forEach(p => {
      lines.push(`• *${p.name}*`);
      lines.push(`  Quedan: *${p.stock} pzas* (Mínimo: ${p.minStock ?? 5}) ${p.location ? `| Ubic: ${p.location}` : ''}`);
    });
    if (lowStock.length > 15) {
      lines.push(`  _...y ${lowStock.length - 15} productos más por agotarse._`);
    }
    lines.push(``);
  }

  // 3. EXPIRED MEDICATIONS
  if (opts.includeExpired && expired.length > 0) {
    lines.push(`⛔ *MEDICAMENTOS YA CADUCADOS (${expired.length}):*`);
    expired.slice(0, 15).forEach(p => {
      lines.push(`• *${p.name}*`);
      lines.push(`  Caducó: *${p.expirationDate ? formatDate(p.expirationDate) : 'S/F'}* | Lote: ${p.batchNumber || 'S/L'} | Stock: ${p.stock} pzas`);
    });
    if (expired.length > 15) {
      lines.push(`  _...y ${expired.length - 15} medicamentos más caducados._`);
    }
    lines.push(``);
  }

  // 4. EXPIRING SOON
  if (opts.includeExpiring && expiring.length > 0) {
    lines.push(`⏳ *MEDICAMENTOS PRÓXIMOS A CADUCAR (Menos de ${opts.expiryDays} días) (${expiring.length}):*`);
    expiring.slice(0, 15).forEach(({ product: p, daysLeft }) => {
      const urgency = daysLeft <= 7 ? '🔴' : daysLeft <= 15 ? '🟠' : '🟡';
      lines.push(`• ${urgency} *${p.name}*`);
      lines.push(`  Caduca en *${daysLeft} días* (${p.expirationDate ? formatDate(p.expirationDate) : 'S/F'}) | Lote: ${p.batchNumber || 'S/L'} | Stock: ${p.stock} pzas`);
    });
    if (expiring.length > 15) {
      lines.push(`  _...y ${expiring.length - 15} medicamentos más próximos a vencer._`);
    }
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📊 *RESUMEN TOTAL:* ${totalAlertsCount} artículos requieren atención.`);
  lines.push(`_Mensaje generado automáticamente desde FarmaControl POS_`);

  return lines.join('\n');
}

/**
 * Builds an individual alert message for a single medication
 */
export function buildSingleProductWhatsAppMessage(
  product: Product,
  settings: PharmacySettings,
  type: 'stock' | 'expiry'
): string {
  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();
  const lines: string[] = [];

  if (type === 'stock') {
    lines.push(`⚠️ *ALERTA DE STOCK: ${product.name.toUpperCase()}*`);
    lines.push(`🏥 *${pharmacyTitle}*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`• Medicamento: *${product.name}*`);
    lines.push(`• Presentación: ${product.presentation || '-'}`);
    lines.push(`• Stock actual: *${product.stock} piezas*`);
    lines.push(`• Stock mínimo: ${product.minStock || 5} piezas`);
    if (product.barcode) lines.push(`• Código/Barras: ${product.barcode}`);
    if (product.location) lines.push(`• Ubicación: ${product.location}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(product.stock === 0 ? `🚨 *ESTADO: AGOTADO TOTALMENTE*` : `⚠️ *ESTADO: STOCK CRÍTICO*`);
    lines.push(`_Favor de generar pedido o compra a proveedor._`);
  } else {
    lines.push(`⏳ *ALERTA DE CADUCIDAD: ${product.name.toUpperCase()}*`);
    lines.push(`🏥 *${pharmacyTitle}*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`• Medicamento: *${product.name}*`);
    lines.push(`• Fecha de caducidad: *${product.expirationDate ? formatDate(product.expirationDate) : 'S/F'}*`);
    lines.push(`• Lote: ${product.batchNumber || 'Sin Lote'}`);
    lines.push(`• Stock en existencia: *${product.stock} piezas*`);
    if (product.barcode) lines.push(`• Código/Barras: ${product.barcode}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_Revisar para venta prioritaria, devolución a proveedor o merma sanitaria._`);
  }

  return lines.join('\n');
}

/**
 * Builds a formatted WhatsApp Digital Ticket Receipt for a Sale
 */
export function buildWhatsAppTicketMessage(
  sale: Sale,
  settings: PharmacySettings,
  customer?: Customer | null
): string {
  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();
  const isCancelled = sale.status === 'cancelled';
  const isRefunded = sale.status === 'refunded';

  const lines: string[] = [];
  lines.push(`🧾 *COMPROBANTE DE VENTA DIGITAL*`);
  lines.push(`🏥 *${pharmacyTitle}*`);
  if (settings.phone) lines.push(`📞 Tel: ${settings.phone}`);
  if (settings.address) lines.push(`📍 ${settings.address}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (isCancelled) {
    lines.push(`🚫 *ESTADO: VENTA CANCELADA*`);
    if (sale.cancelledReason) lines.push(`• Motivo: ${sale.cancelledReason}`);
    if (sale.cancelledAt) lines.push(`• Fecha Cancelación: ${formatDateTime(sale.cancelledAt)}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  } else if (isRefunded) {
    lines.push(`⚠️ *ESTADO: DEVOLUCIÓN PARCIAL / TOTAL*`);
    if (sale.cancelledReason) lines.push(`• Motivo: ${sale.cancelledReason}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  }

  lines.push(`📋 *Folio:* ${sale.folio}`);
  lines.push(`📅 *Fecha:* ${formatDateTime(sale.date)}`);
  lines.push(`👤 *Cliente:* ${sale.customerName || 'Público General'}`);
  lines.push(`💳 *Método de Pago:* ${sale.paymentMethod === 'credit' ? 'Crédito (Fiado)' : sale.paymentMethod.toUpperCase()}`);
  lines.push(`👨‍💼 *Atendió:* ${sale.seller || 'Cajero'}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*PRODUCTOS:*`);

  sale.items.forEach(item => {
    const itemSub = formatCurrency(item.subtotal);
    lines.push(`• *${item.quantity}x* ${item.productName}`);
    lines.push(`   ${item.presentation || ''} (${formatCurrency(item.unitPrice)} c/u) = *${itemSub}*`);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  if (sale.discountTotal > 0) {
    lines.push(`• Subtotal: ${formatCurrency(sale.subtotal)}`);
    lines.push(`• Descuento: -${formatCurrency(sale.discountTotal)}`);
  }
  lines.push(`💰 *TOTAL A PAGAR:* *${formatCurrency(sale.total)}*`);

  if (sale.paymentMethod === 'cash') {
    lines.push(`💵 Efectivo Entregado: ${formatCurrency(sale.amountPaid)}`);
    lines.push(`🪙 Cambio: ${formatCurrency(sale.change)}`);
  } else if (sale.paymentMethod === 'credit') {
    lines.push(`⚠️ *Cargo aplicado a cuenta de crédito*`);
    if (customer) {
      lines.push(`📌 *Saldo deudor actual:* ${formatCurrency(customer.currentDebt)}`);
    }
  }

  if (settings.ticketMessage) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_${settings.ticketMessage}_`);
  }

  lines.push(`¡Gracias por su compra! 💊🩺`);
  return lines.join('\n');
}

/**
 * Builds a formatted WhatsApp Receipt for a Debt Payment (Abono)
 */
export function buildWhatsAppPaymentMessage(
  payment: DebtPayment,
  settings: PharmacySettings,
  customer?: Customer | null
): string {
  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();
  const lines: string[] = [];

  lines.push(`🧾 *RECIBO DE ABONO A CUENTA*`);
  lines.push(`🏥 *${pharmacyTitle}*`);
  if (settings.phone) lines.push(`📞 Tel: ${settings.phone}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 *Folio Abono:* ${payment.folio}`);
  lines.push(`📅 *Fecha:* ${formatDateTime(payment.date)}`);
  lines.push(`👤 *Cliente:* ${payment.customerName}`);
  lines.push(`💳 *Forma de Pago:* ${payment.paymentMethod.toUpperCase()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`• Saldo Anterior: ${formatCurrency(payment.previousDebt)}`);
  lines.push(`✅ *MONTO ABONADO:* *${formatCurrency(payment.amount)}*`);
  lines.push(`📌 *SALDO RESTANTE:* *${formatCurrency(payment.remainingDebt)}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👨‍💼 *Recibió:* ${payment.registeredBy || 'Cajero'}`);
  if (payment.notes) lines.push(`📝 *Notas:* ${payment.notes}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Comprobante emitido por FarmaControl POS_`);
  lines.push(`¡Gracias por su pronto pago! 🩺`);

  return lines.join('\n');
}

/**
 * Builds a formatted WhatsApp Summary for a Cash Cut (Corte de Caja)
 */
export function buildWhatsAppCashCutMessage(
  cut: CashCut,
  settings: PharmacySettings
): string {
  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();
  const diffStatus = cut.difference === 0 
    ? '✅ CUADRE EXACTO' 
    : cut.difference > 0 
      ? `🟢 SOBRANTE (+${formatCurrency(cut.difference)})` 
      : `🔴 FALTANTE (${formatCurrency(cut.difference)})`;

  const lines: string[] = [];
  lines.push(`📊 *REPORTE DE CORTE DE CAJA* 📊`);
  lines.push(`🏥 *${pharmacyTitle}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 *Folio de Corte:* ${cut.folio}`);
  lines.push(`👤 *Cajero Responsable:* ${cut.cashier}`);
  lines.push(`🕒 *Apertura:* ${formatDateTime(cut.openedAt)}`);
  lines.push(`🕒 *Cierre:* ${formatDateTime(cut.closedAt)}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*INGRESOS POR MÉTODO DE PAGO:*`);
  lines.push(`💵 Efectivo: *${formatCurrency(cut.cashSalesTotal)}* (${cut.totalSalesCount} ventas)`);
  lines.push(`💳 Tarjeta: *${formatCurrency(cut.cardSalesTotal)}*`);
  lines.push(`📱 Transferencia: *${formatCurrency(cut.transferSalesTotal)}*`);
  lines.push(`📝 Crédito (Fiado): *${formatCurrency(cut.creditSalesTotal)}*`);
  
  if (cut.debtPaymentsCashTotal > 0 || cut.debtPaymentsCardTotal > 0 || cut.debtPaymentsTransferTotal > 0) {
    lines.push(`📥 Abonos Cobrados: *${formatCurrency(cut.debtPaymentsCashTotal + cut.debtPaymentsCardTotal + cut.debtPaymentsTransferTotal)}* (Efectivo: ${formatCurrency(cut.debtPaymentsCashTotal)})`);
  }

  const grandTotal = cut.cashSalesTotal + cut.cardSalesTotal + cut.transferSalesTotal + cut.creditSalesTotal;
  lines.push(`💰 *VENTAS TOTALES:* *${formatCurrency(grandTotal)}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*ARQUEO DE CAJÓN (EFECTIVO):*`);
  lines.push(`• (+) Fondo Inicial: ${formatCurrency(cut.initialCash)}`);
  lines.push(`• (+) Ventas Efectivo: ${formatCurrency(cut.cashSalesTotal)}`);
  if (cut.cashInTotal > 0) lines.push(`• (+) Entradas Efectivo: ${formatCurrency(cut.cashInTotal)}`);
  if (cut.cashOutTotal > 0) lines.push(`• (-) Salidas / Gastos: -${formatCurrency(cut.cashOutTotal)}`);
  lines.push(`• (=) *Efectivo Esperado:* *${formatCurrency(cut.expectedCash)}*`);
  lines.push(`• (=) *Efectivo Contado Físico:* *${formatCurrency(cut.actualCashCount)}*`);
  lines.push(`• *Resultado Arqueo:* ${diffStatus}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💼 *RETIROS Y FONDO:*`);
  lines.push(`• Retiro de Efectivo: *${formatCurrency(cut.cashWithdrawal)}*`);
  lines.push(`• Fondo para Siguiente Turno: *${formatCurrency(cut.remainingCashForNextShift)}*`);
  
  if (cut.notes) {
    lines.push(`📝 *Notas:* ${cut.notes}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Reporte generado automáticamente desde FarmaControl POS_`);

  return lines.join('\n');
}

/**
 * Builds an Alert message when a sale is cancelled / refunded
 */
export function buildWhatsAppSaleCancellationMessage(
  sale: Sale,
  settings: PharmacySettings,
  cancelledBy?: string
): string {
  const pharmacyTitle = (settings.commercialName || settings.name || 'FarmaControl').toUpperCase();
  const lines: string[] = [];

  lines.push(`🚨 *ALERTA DE AUDITORÍA: VENTA CANCELADA* 🚨`);
  lines.push(`🏥 *${pharmacyTitle}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 *Folio de Ticket:* ${sale.folio}`);
  lines.push(`💰 *Monto Cancelado:* ${formatCurrency(sale.total)}`);
  lines.push(`💳 *Método de Pago Original:* ${sale.paymentMethod.toUpperCase()}`);
  lines.push(`👤 *Cliente:* ${sale.customerName || 'Público General'}`);
  lines.push(`👨‍💼 *Vendedor Original:* ${sale.seller}`);
  lines.push(`⏰ *Fecha/Hora Venta:* ${formatDateTime(sale.date)}`);
  lines.push(`⏰ *Fecha/Hora Cancelación:* ${formatDateTime(sale.cancelledAt || new Date().toISOString())}`);
  if (cancelledBy) lines.push(`🛡️ *Cancelado por:* ${cancelledBy}`);
  lines.push(`📝 *Motivo:* ${sale.cancelledReason || 'Cancelación de venta'}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*PRODUCTOS REINTEGRADOS AL STOCK:*`);
  sale.items.forEach(it => {
    lines.push(`• ${it.quantity}x ${it.productName} (${formatCurrency(it.subtotal)})`);
  });
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Notificación de seguridad FarmaControl POS_`);

  return lines.join('\n');
}

/**
 * Returns a direct WhatsApp Web / mobile URL for the message
 */
export function getWhatsAppUrl(phone: string, message: string, countryCode = '52'): string {
  const cleanPhone = getWhatsAppCleanPhone(phone, countryCode);
  const encodedText = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Dispatches the WhatsApp message in a new window/tab, with fallback anchor click
 */
export function openWhatsAppNotification(phone: string, message: string, countryCode = '52'): boolean {
  const url = getWhatsAppUrl(phone, message, countryCode);
  if (!url) return false;
  
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (e) {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return !!win;
  }
}


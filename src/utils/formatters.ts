export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${Number(amount || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getExpiryStatus(expirationDateStr?: string): {
  status: 'expired' | 'critical' | 'warning' | 'good' | 'unknown';
  daysLeft: number;
  label: string;
  badgeClass: string;
} {
  if (!expirationDateStr) {
    return {
      status: 'unknown',
      daysLeft: 9999,
      label: 'Sin fecha',
      badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: 'expired',
      daysLeft,
      label: `Vencido (${Math.abs(daysLeft)}d)`,
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold',
    };
  }

  if (daysLeft <= 30) {
    return {
      status: 'critical',
      daysLeft,
      label: `Vence en ${daysLeft}d`,
      badgeClass: 'bg-amber-100 text-amber-950 border border-amber-400 font-bold',
    };
  }

  if (daysLeft <= 90) {
    return {
      status: 'warning',
      daysLeft,
      label: `Vence en ${daysLeft}d`,
      badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold',
    };
  }

  return {
    status: 'good',
    daysLeft,
    label: `Vigente (${daysLeft}d)`,
    badgeClass: 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-semibold',
  };
}

export function generateFolio(prefix: string = 'FOL', count: number = Math.floor(1000 + Math.random() * 9000)): string {
  const pad = String(count + 1).padStart(5, '0');
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}${pad}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

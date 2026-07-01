function formatLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function formatMethod(method) {
  if (!method) return '—';
  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildReceiptHtml(fee, { portalName, school } = {}) {
  const payment = fee.payment || {};
  const breakdownRows = fee.breakdown
    ? Object.entries(fee.breakdown)
      .map(([key, amount]) => {
        const discount = key === 'discount';
        return `<tr>
          <td>${formatLabel(key)}</td>
          <td style="text-align:right;font-weight:${discount ? '600' : '500'};color:${discount ? '#059669' : 'inherit'}">
            ${discount ? '−' : ''}₹${Number(amount).toLocaleString('en-IN')}
          </td>
        </tr>`;
      })
      .join('')
    : '';

  const brand = getComputedStyle(document.documentElement).getPropertyValue('--sb-primary').trim() || '#1B2E4B';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--sb-secondary').trim() || '#0058BE';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Receipt ${payment.receiptNo || ''}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, sans-serif;
      color: #0b1c30;
      margin: 0;
      padding: 32px;
      background: #f8f9ff;
    }
    .receipt {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(9, 20, 38, 0.08);
    }
    .head {
      background: ${brand};
      color: #fff;
      padding: 24px 28px;
    }
    .head h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; }
    .head p { margin: 0; font-size: 13px; opacity: 0.85; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      padding: 20px 28px;
      border-bottom: 1px solid #eef0f4;
      font-size: 13px;
    }
    .meta dt { margin: 0 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7a8c; }
    .meta dd { margin: 0; font-weight: 600; color: ${brand}; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 28px; border-bottom: 1px solid #eef0f4; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7a8c; background: #fafbfe; }
    .total td { font-size: 16px; font-weight: 800; color: ${brand}; border-bottom: none; padding-top: 16px; }
    .foot {
      padding: 20px 28px 24px;
      font-size: 12px;
      color: #6b7a8c;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, ${accent} 12%, white);
      color: ${accent};
      font-size: 11px;
      font-weight: 700;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="head">
      <h1>${portalName || 'SchoolBridge'}</h1>
      <p>${school?.name || 'School'} · Fee Payment Receipt</p>
    </div>
    <dl class="meta">
      <div><dt>Receipt No.</dt><dd>${payment.receiptNo || '—'}</dd></div>
      <div><dt>Date</dt><dd>${formatDate(payment.verifiedAt || payment.submittedAt)}</dd></div>
      <div><dt>Student</dt><dd>${fee.studentName || '—'}</dd></div>
      <div><dt>Application</dt><dd>${fee.applicationNo || '—'}</dd></div>
      <div><dt>Class</dt><dd>${(fee.classApplying || '—').toString().toUpperCase()}</dd></div>
      <div><dt>Payment Method</dt><dd>${formatMethod(payment.method)}</dd></div>
      <div><dt>Transaction ID</dt><dd>${payment.transactionId || '—'}</dd></div>
      <div><dt>Verified By</dt><dd>${payment.verifiedBy || '—'}</dd></div>
    </dl>
    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${breakdownRows}
        <tr class="total">
          <td>Total Paid</td>
          <td style="text-align:right">₹${Number(fee.total || 0).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
    <div class="foot">
      This is a computer-generated receipt and does not require a signature.
      <span class="badge">Payment Verified</span>
      ${school?.address ? `<br /><br />${school.address}` : ''}
    </div>
  </div>
</body>
</html>`;
}

export function downloadFeeReceipt(fee, meta = {}) {
  if (!fee?.payment?.receiptNo) {
    throw new Error('Receipt is not available yet.');
  }

  const html = buildReceiptHtml(fee, meta);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `receipt-${fee.payment.receiptNo}.html`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

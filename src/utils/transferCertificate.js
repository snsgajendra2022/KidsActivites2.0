function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function buildTransferCertificateHtml(profile, { school, portalName } = {}) {
  const certificate = profile?.transferCertificate;
  if (!certificate?.certificateNumber) {
    throw new Error('Transfer certificate has not been issued.');
  }

  const brand = getComputedStyle(document.documentElement)
    .getPropertyValue('--sb-primary')
    .trim() || '#1B2E4B';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Transfer Certificate ${escapeHtml(certificate.certificateNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 36px; color: #172033; font-family: Georgia, serif; background: #f4f6fb; }
    .certificate { max-width: 800px; min-height: 1040px; margin: 0 auto; padding: 54px; background: #fff; border: 8px double ${brand}; }
    .school { text-align: center; color: ${brand}; }
    .school h1 { margin: 0; font-size: 30px; text-transform: uppercase; letter-spacing: .04em; }
    .school p { margin: 8px 0 0; font-family: Arial, sans-serif; font-size: 13px; color: #596579; }
    .title { margin: 48px 0 36px; text-align: center; }
    .title h2 { display: inline-block; margin: 0; padding-bottom: 6px; font-size: 25px; text-transform: uppercase; border-bottom: 2px solid ${brand}; }
    .number { margin-top: 12px; font: 600 13px Arial, sans-serif; color: #596579; }
    .body { font-size: 18px; line-height: 2; }
    .value { display: inline; padding: 0 5px 3px; font-weight: 700; border-bottom: 1px dotted #596579; }
    .details { width: 100%; margin-top: 26px; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; }
    .details td { padding: 12px; border: 1px solid #cfd5df; }
    .details td:first-child { width: 38%; font-weight: 700; color: #455168; background: #f7f8fb; }
    .signatures { display: flex; justify-content: space-between; gap: 60px; margin-top: 110px; font-family: Arial, sans-serif; font-size: 13px; text-align: center; }
    .signature { width: 220px; padding-top: 8px; border-top: 1px solid #172033; }
    .footer { margin-top: 48px; text-align: center; font: 12px Arial, sans-serif; color: #6b7485; }
    @media print {
      @page { size: A4; margin: 12mm; }
      body { padding: 0; background: #fff; }
      .certificate { min-height: 270mm; border-width: 5px; }
    }
  </style>
</head>
<body>
  <main class="certificate">
    <header class="school">
      <h1>${escapeHtml(school?.name || portalName || 'School')}</h1>
      <p>${escapeHtml(school?.address || '')}</p>
    </header>
    <section class="title">
      <h2>Transfer Certificate</h2>
      <div class="number">Certificate No. ${escapeHtml(certificate.certificateNumber)}</div>
    </section>
    <p class="body">
      This is to certify that <span class="value">${escapeHtml(profile.fullName)}</span>,
      admission number <span class="value">${escapeHtml(profile.admissionNumber)}</span>,
      was a student of this school and has been granted a transfer certificate on
      <span class="value">${escapeHtml(formatDate(certificate.issueDate))}</span>.
    </p>
    <table class="details">
      <tr><td>Date of birth</td><td>${escapeHtml(formatDate(profile.dateOfBirth))}</td></tr>
      <tr><td>Last class attended</td><td>${escapeHtml(certificate.lastClass || profile.classApplying || '—')}</td></tr>
      <tr><td>House / Group</td><td>${escapeHtml(profile.house || '—')}</td></tr>
      <tr><td>Reason for leaving</td><td>${escapeHtml(certificate.reason)}</td></tr>
      <tr><td>General conduct</td><td>${escapeHtml(certificate.conduct || 'Good')}</td></tr>
      <tr><td>Issue date</td><td>${escapeHtml(formatDate(certificate.issueDate))}</td></tr>
    </table>
    <div class="signatures">
      <div class="signature">Class Teacher</div>
      <div class="signature">Principal / Authorized Signatory</div>
    </div>
    <p class="footer">
      Computer-generated school record · Issued by ${escapeHtml(certificate.issuedBy)}
    </p>
  </main>
</body>
</html>`;
}

export function downloadTransferCertificate(profile, meta = {}) {
  const html = buildTransferCertificateHtml(profile, meta);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `transfer-certificate-${profile.transferCertificate.certificateNumber}.html`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

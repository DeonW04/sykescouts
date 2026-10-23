import { base44 } from '@/api/base44Client';
import ConsentPdfDocument from '@/components/consent/export/ConsentPdfDocument';
import { consentTime, consentFilename, responseText, hasSignature } from '@/components/consent/export/consentExportData';

async function signatureSource(submission) {
  let source = submission.signature_data_url;
  if (submission.signature_file_uri) source = (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: submission.signature_file_uri, expires_in: 300 })).signed_url;
  if (source.startsWith('data:image/')) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error('Unable to download a signature. Please try again.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Unable to read a signature.'));
    response.blob().then(blob => reader.readAsDataURL(blob), reject);
  });
}
export default async function exportConsentPdf(entries, title) {
  const pdf = new ConsentPdfDocument();
  for (const { submission: s, form, memberName } of entries) {
    pdf.start(`${form.title} - ${memberName}`);
    pdf.text(form.title, { size: 17, bold: true });
    pdf.text(`Event / meeting: ${title}`);
    pdf.text(`Member: ${memberName}`, { bold: true });
    pdf.text(`Parent / guardian: ${s.parent_name || 'Not recorded'}`);
    pdf.text(`Status: ${s.status} | Submitted: ${consentTime(s.submitted_at)}`);
    if (s.signed_via_app) pdf.text('Signed via SykeScouts App');
    if (form.description) pdf.text(form.description);
    for (const block of form.blocks || []) {
      if (block.type === 'text') { pdf.text(block.content || ''); continue; }
      pdf.text(block.label || block.id, { bold: true, size: block.type === 'heading' ? 12 : 10 });
      if (block.type !== 'heading') pdf.text(responseText(s.responses?.[block.id]));
    }
    for (const [key, value] of Object.entries(s.responses || {})) {
      if (!(form.blocks || []).some(b => b.id === key)) { pdf.text(`Additional response: ${key}`, { bold: true }); pdf.text(responseText(value)); }
    }
    if (form.terms_and_conditions) {
      pdf.text('Terms and conditions', { bold: true, size: 12 }); pdf.text(form.terms_and_conditions);
      pdf.text(`Terms accepted: ${s.tc_accepted ? 'Yes' : 'No'}`, { bold: true });
    }
    if (hasSignature(s)) {
      await pdf.signature(await signatureSource(s));
      pdf.text(`Signed by: ${s.parent_name || 'Not recorded'}`);
      pdf.text(`Signature date/time: ${consentTime(s.submitted_at)} (Europe/London)`);
    } else pdf.text('Signature: Not recorded');
  }
  pdf.save(`${consentFilename(title)} - completed consent forms.pdf`);
}
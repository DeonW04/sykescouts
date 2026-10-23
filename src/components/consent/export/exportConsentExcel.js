import createWorkbook from '@/components/consent/export/createWorkbook';
import { consentTime, hasSignature, responseText, saveDownload, consentFilename } from '@/components/consent/export/consentExportData';

export default function exportConsentExcel(entries, forms, title) {
  const sheets = forms.map(form => {
    const questions = (form.blocks || []).filter(b => !['heading', 'text'].includes(b.type));
    const relevant = entries.filter(e => e.form.id === form.id);
    const extraKeys = [...new Set(relevant.flatMap(e => Object.keys(e.submission.responses || {})))].filter(key => !questions.some(q => q.id === key));
    const headers = ['Event / meeting', 'Member', 'Parent / guardian', 'Status', 'Terms accepted', 'Signature provided', 'Signature date/time (Europe/London)', 'Submission date/time (Europe/London)', 'Signed via app', ...questions.map(q => q.label || q.id), ...extraKeys.map(key => `Additional response: ${key}`)];
    const rows = relevant.map(({ submission: s, memberName }) => [title, memberName, s.parent_name || '', s.status, s.tc_accepted ? 'Yes' : 'No', hasSignature(s) ? 'Yes' : 'No', hasSignature(s) ? consentTime(s.submitted_at) : '', consentTime(s.submitted_at), s.signed_via_app ? 'Yes' : 'No', ...questions.map(q => responseText(s.responses?.[q.id])), ...extraKeys.map(key => responseText(s.responses?.[key]))]);
    // Explicit string cells prevent responses being interpreted as spreadsheet formulas.
    return { name: form.title || 'Consent form', rows: [headers, ...rows] };
  });
  saveDownload(createWorkbook(sheets), `${consentFilename(title)} - consent responses.xlsx`);
}
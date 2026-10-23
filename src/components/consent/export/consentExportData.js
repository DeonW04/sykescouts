import { base44 } from '@/api/base44Client';

export const hasSignature = submission => !!(submission.signature_file_uri || submission.signature_data_url);
export const responseText = value => value == null || value === '' ? 'No response' : typeof value === 'object' ? JSON.stringify(value) : String(value);
export function consentTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Not recorded';
  return new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
}
async function allPages(entity, query) {
  const items = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort: 'created_date', limit: 100, ...(cursor ? { cursor } : {}) });
    items.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return items;
}
export async function loadConsentExport(programmeId, entityType, forms, completedOnly) {
  const query = { [entityType === 'event' ? 'event_id' : 'programme_id']: programmeId, form_id: { $in: forms.map(f => f.id) } };
  if (completedOnly) query.status = { $in: ['signed', 'complete'] };
  const submissions = await allPages(base44.entities.ConsentFormSubmission, query);
  if (!submissions.length) throw new Error(completedOnly ? 'There are no completed consent forms to download yet.' : 'There are no consent responses to export yet.');
  const ids = [...new Set(submissions.map(s => s.member_id))];
  const members = [];
  for (let i = 0; i < ids.length; i += 100) members.push(...await allPages(base44.entities.Member, { id: { $in: ids.slice(i, i + 100) } }));
  const names = new Map(members.map(m => [m.id, m.full_name || `${m.first_name || ''} ${m.surname || ''}`.trim()]));
  return submissions.map(submission => ({ submission, form: forms.find(f => f.id === submission.form_id), memberName: names.get(submission.member_id) || `Unavailable member (${submission.member_id})` })).sort((a, b) => a.memberName.localeCompare(b.memberName) || a.form.title.localeCompare(b.form.title));
}
export function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const consentFilename = title => (title || 'Consent forms').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 100) || 'Consent forms';
import React, { useState } from 'react';
import { FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadConsentExport } from '@/components/consent/export/consentExportData';

export default function ConsentExportButtons({ programmeId, entityType, forms, entityData }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const download = async type => {
    setBusy(type); setError('');
    try {
      const entries = await loadConsentExport(programmeId, entityType, forms, type === 'pdf');
      const title = entityData?.title || 'Consent forms';
      if (type === 'excel') {
        const { default: exportExcel } = await import('@/components/consent/export/exportConsentExcel');
        exportExcel(entries, forms, title);
      } else {
        const { default: exportPdf } = await import('@/components/consent/export/exportConsentPdf');
        await exportPdf(entries, title);
      }
    } catch (e) { setError(e.response?.data?.error || e.message || 'Unable to download consent forms. Please try again.'); }
    finally { setBusy(''); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={!!busy || !programmeId} onClick={() => download('excel')}>
        {busy === 'excel' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}{busy === 'excel' ? 'Preparing Excel…' : 'Export responses (Excel)'}
      </Button>
      <Button type="button" variant="outline" disabled={!!busy || !programmeId} onClick={() => download('pdf')}>
        {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <FileDown />}{busy === 'pdf' ? 'Preparing PDF…' : 'Download completed forms (PDF)'}
      </Button>
    </div>
    {busy && <p role="status" className="text-sm text-muted-foreground">Preparing all consent records for this {entityType === 'event' ? 'event' : 'meeting'}{busy === 'pdf' ? ', including signatures' : ''}…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
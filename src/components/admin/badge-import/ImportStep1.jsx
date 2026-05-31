import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function ImportStep1({ onNext }) {
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsError, setTermsError] = useState(null);

  const { data: appSections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const selectedSection = appSections.find(s => s.id === selectedSectionId);

  useEffect(() => {
    if (!selectedSection?.osm_section_id) return;
    setLoadingTerms(true);
    setTerms([]);
    setTermsError(null);
    setSelectedTermId('');
    base44.functions.invoke('getOSMTerms', { osm_section_id_override: selectedSection.osm_section_id })
      .then(res => {
        const t = res?.data?.terms || [];
        setTerms(t);
        if (t.length > 0) setSelectedTermId(t[0].termid);
      })
      .catch(() => setTermsError('Could not fetch terms from OSM.'))
      .finally(() => setLoadingTerms(false));
  }, [selectedSectionId]);

  const canProceed = selectedSection?.osm_section_id && selectedTermId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 — Select Section and Term</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Section</Label>
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a section..." />
            </SelectTrigger>
            <SelectContent>
              {appSections.map(s => (
                <SelectItem key={s.id} value={s.id} disabled={!s.osm_section_id}>
                  <span>{s.display_name}</span>
                  {!s.osm_section_id && (
                    <span className="ml-2 text-amber-500 text-xs">No OSM section ID</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSectionId && !selectedSection?.osm_section_id && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              This section has no OSM section ID. Go to Admin Settings to link it.
            </p>
          )}
        </div>

        {selectedSection?.osm_section_id && (
          <div className="space-y-2">
            <Label>Term</Label>
            {loadingTerms ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />Loading terms from OSM...
              </div>
            ) : termsError ? (
              <p className="text-sm text-red-500">{termsError}</p>
            ) : terms.length === 0 ? (
              <p className="text-sm text-gray-500">No terms found for this section.</p>
            ) : (
              <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a term..." />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(t => (
                    <SelectItem key={t.termid} value={t.termid}>
                      {t.name} ({t.startdate} to {t.enddate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            disabled={!canProceed}
            onClick={() => onNext(selectedSection, terms.find(t => t.termid === selectedTermId))}
            className="bg-[#7413dc] hover:bg-[#5c0fb0]"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
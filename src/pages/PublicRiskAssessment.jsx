import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle, FileText, Shield } from 'lucide-react';

const RISK_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  very_high: 'bg-red-100 text-red-800 border-red-200',
};

export default function PublicRiskAssessment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'meeting';
    if (!id) { setError('Invalid link — no session ID provided.'); setLoading(false); return; }

    base44.functions.invoke('getPublicRiskAssessments', { id, type })
      .then(res => {
        if (res.data?.error) setError(res.data.error);
        else setData(res.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading risk assessments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-800">Unable to load</h1>
          <p className="text-slate-500 mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { title, date, risk_assessments = [] } = data || {};
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#7413dc] text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="Syke Scouts"
              className="h-10 w-auto"
            />
            <span className="text-purple-200 text-sm font-medium">40th Rochdale (Syke) Scouts</span>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-7 h-7 text-purple-300 mt-0.5 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">Risk Assessments</h1>
              <p className="text-purple-200 text-sm mt-0.5">
                {title}{dateStr && ` — ${dateStr}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {risk_assessments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No risk assessments are attached to this session.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {risk_assessments.map((ra, i) => (
              <div key={ra.id || i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">{ra.title || `Risk Assessment ${i + 1}`}</h2>
                  {ra.activity && <p className="text-sm text-slate-500 mt-0.5">{ra.activity}</p>}
                  {ra.status && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">
                      {ra.status}
                    </span>
                  )}
                </div>

                {ra.hazards?.length > 0 && (
                  <div className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Hazards and Controls
                    </h3>
                    <div className="space-y-3">
                      {ra.hazards.map((h, j) => (
                        <div key={j} className={`rounded-lg border p-3 text-sm ${RISK_COLORS[h.risk_level?.toLowerCase()] || 'bg-slate-50 border-slate-200'}`}>
                          <p className="font-medium">{'⚠️'} {h.hazard}</p>
                          {h.who_affected && <p className="text-xs mt-0.5 opacity-75">Who: {h.who_affected}</p>}
                          {h.controls && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                              <p className="text-xs">{h.controls}</p>
                            </div>
                          )}
                          {(h.likelihood || h.severity || h.risk_level) && (
                            <p className="text-xs mt-1.5 opacity-60">
                              {[
                                h.likelihood && `Likelihood: ${h.likelihood}`,
                                h.severity && `Severity: ${h.severity}`,
                                h.risk_level && `Risk: ${h.risk_level}`
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ra.notes && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 italic">{ra.notes}</p>
                  </div>
                )}

                {ra.signed_off_by && (
                  <div className="px-5 pb-4 text-xs text-slate-400">
                    Signed off by {ra.signed_off_by}
                    {ra.signed_off_date && ` on ${new Date(ra.signed_off_date).toLocaleDateString('en-GB')}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            This is a public link — no sign-in required.
          </p>
          <p>40th Rochdale (Syke) Scouts</p>
        </div>
      </div>
    </div>
  );
}
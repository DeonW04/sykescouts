import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Pen } from 'lucide-react';
import SignatureCanvas from '@/components/parent/SignatureCanvas';

export default function SignaturePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (signature_data_url) => {
    setSubmitting(true);
    try {
      await base44.functions.invoke('submitSignature', { token, signature_data_url });
      setSubmitted(true);
    } catch (e) {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">Invalid signature link.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">Signature Submitted!</h1>
          <p className="text-green-600">Thank you. You can close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#004851] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Pen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sign Here</h1>
          <p className="text-sm text-gray-500 mt-1">Draw your signature in the box below using your finger</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <SignatureCanvas onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  );
}
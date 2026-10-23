import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ConsentSignatureViewer({ fileUri, children }) {
  const { data, error } = useQuery({ queryKey: ['consent-signature-file', fileUri], queryFn: async () => (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 300 })).signed_url, enabled: !!fileUri, staleTime: 240000 });
  if (error) return <p role="alert">Unable to load the signature.</p>;
  if (!data) return <p role="status">Loading signature…</p>;
  return children(data);
}
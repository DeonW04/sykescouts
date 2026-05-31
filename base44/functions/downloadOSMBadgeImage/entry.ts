import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { pictureUrl } = body;
  if (!pictureUrl) return Response.json({ error: 'pictureUrl required' }, { status: 400 });

  // Build full URL from OSM CDN
  const fullUrl = pictureUrl.startsWith('http')
    ? pictureUrl
    : `https://oymcdn.co.uk/${pictureUrl.replace(/^\/+/, '')}`;

  console.log('[downloadOSMBadgeImage] downloading:', fullUrl);

  const imageResp = await fetch(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!imageResp.ok) {
    return Response.json({ error: `Failed to fetch image from CDN: ${imageResp.status}` }, { status: 500 });
  }

  const contentType = imageResp.headers.get('content-type') || 'image/png';
  const arrayBuffer = await imageResp.arrayBuffer();
  const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
  const file = new File([arrayBuffer], `badge.${ext}`, { type: contentType });

  // Upload to Base44 storage
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  console.log('[downloadOSMBadgeImage] stored at:', file_url);

  return Response.json({ success: true, file_url });
});
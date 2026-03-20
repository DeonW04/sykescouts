import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin or leader
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      if (leaders.length === 0) {
        return Response.json({ error: 'Forbidden: Admin or Leader access required' }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const eventId = formData.get('event_id');
    const caption = formData.get('caption');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload full-size image
    const { file_url: fullSizeUrl } = await base44.integrations.Core.UploadFile({ file });
    
    // Create thumbnail (compressed version)
    // Fetch the uploaded image
    const imageResponse = await fetch(fullSizeUrl);
    const imageBlob = await imageResponse.blob();
    
    // Convert to base64 for compression
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = imageBlob.type;
    
    // Use AI to generate a compressed thumbnail (resize and compress)
    const thumbnailPrompt = `Create a compressed thumbnail version of this image. Resize to max 400px width while maintaining aspect ratio, and compress to reduce file size by at least 70%.`;
    
    // For now, we'll just upload the same image as thumbnail
    // In production, you'd want proper image processing
    const { file_url: thumbnailUrl } = await base44.integrations.Core.UploadFile({ file });
    
    return Response.json({ 
      full_size_url: fullSizeUrl,
      thumbnail_url: thumbnailUrl
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
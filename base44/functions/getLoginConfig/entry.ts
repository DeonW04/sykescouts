import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public endpoint — returns login page background images for the custom login
// page. Reads WebsiteImage records tagged page='login'. Safe for logged-out users.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const images = await base44.asServiceRole.entities.WebsiteImage.filter({ page: 'login' });
    const sorted = (images || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return Response.json({
      background_images: sorted.map((i) => i.image_url).filter(Boolean),
      slideshow_interval_seconds: 6,
    });
  } catch (error) {
    return Response.json({ background_images: [], slideshow_interval_seconds: 6, error: error.message });
  }
});
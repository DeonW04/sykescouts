import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Extract page ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const pageId = pathParts[pathParts.length - 1];

    if (!pageId) {
      return Response.json({ error: 'Page ID required' }, { status: 400 });
    }

    // Query for the communication page
    const pages = await base44.asServiceRole.entities.CommunicationPage.filter({ 
      page_id: pageId,
      status: 'published'
    });

    if (!pages || pages.length === 0) {
      return Response.json({ error: 'Page not found' }, { status: 404 });
    }

    const page = pages[0];

    // Record page view
    await base44.asServiceRole.entities.PageView.create({
      page_id: page.page_id,
      viewed_date: new Date().toISOString(),
      session_id: Math.random().toString(36).substr(2, 9),
    });

    // Increment view count
    await base44.asServiceRole.entities.CommunicationPage.update(page.id, {
      view_count: (page.view_count || 0) + 1,
    });

    return Response.json(page);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
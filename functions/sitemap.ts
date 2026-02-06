Deno.serve(async (req) => {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const pages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/About', priority: '0.8', changefreq: 'monthly' },
    { path: '/Sections', priority: '0.8', changefreq: 'monthly' },
    { path: '/Parents', priority: '0.8', changefreq: 'monthly' },
    { path: '/Gallery', priority: '0.7', changefreq: 'weekly' },
    { path: '/Contact', priority: '0.7', changefreq: 'monthly' },
    { path: '/Join', priority: '0.9', changefreq: 'monthly' },
    { path: '/Volunteer', priority: '0.9', changefreq: 'monthly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  });
});
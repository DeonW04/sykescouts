import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active badges
    const badges = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });
    
    // Get existing stock entries
    const existingStock = await base44.asServiceRole.entities.BadgeStock.list();
    const existingBadgeIds = new Set(existingStock.map(s => s.badge_id));
    
    // Create stock entries for badges that don't have one
    const badgesNeedingStock = badges.filter(badge => !existingBadgeIds.has(badge.id));
    
    if (badgesNeedingStock.length === 0) {
      return Response.json({ 
        message: 'All badges already have stock entries',
        count: 0
      });
    }
    
    const stockEntries = badgesNeedingStock.map(badge => ({
      badge_id: badge.id,
      current_stock: 0,
      last_updated: new Date().toISOString(),
    }));
    
    // Bulk create stock entries
    await base44.asServiceRole.entities.BadgeStock.bulkCreate(stockEntries);
    
    return Response.json({ 
      message: `Created stock entries for ${badgesNeedingStock.length} badges`,
      count: badgesNeedingStock.length,
      badges: badgesNeedingStock.map(b => b.name)
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
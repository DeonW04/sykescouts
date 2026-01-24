import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Package, ShoppingCart, Plus, Minus, Download, Check, AlertTriangle, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import LeaderNav from '../components/leader/LeaderNav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

export default function BadgeStockManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingStock, setEditingStock] = useState({});
  const [bulkAddDialog, setBulkAddDialog] = useState(false);
  const [bulkAddQuantities, setBulkAddQuantities] = useState({});
  const [additionalBadges, setAdditionalBadges] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['badge-stock'],
    queryFn: () => base44.entities.BadgeStock.list(),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: pendingAwards = [] } = useQuery({
    queryKey: ['pending-awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ award_status: 'pending' }),
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['terms'],
    queryFn: () => base44.entities.Term.filter({ active: true }),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: async () => {
      const today = new Date();
      const allProgs = await base44.entities.Programme.list();
      // Filter programmes within current terms
      return allProgs.filter(prog => {
        const progDate = new Date(prog.date);
        return terms.some(term => {
          const termStart = new Date(term.start_date);
          const termEnd = new Date(term.end_date);
          return progDate >= termStart && progDate <= termEnd && progDate >= today;
        });
      });
    },
    enabled: terms.length > 0,
  });

  const { data: programmeBadges = [] } = useQuery({
    queryKey: ['programme-badges'],
    queryFn: () => base44.entities.ProgrammeBadgeCriteria.list(),
    enabled: programmes.length > 0,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.list(),
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ badgeId, newStock }) => {
      const existing = stock.find(s => s.badge_id === badgeId);
      if (existing) {
        return base44.entities.BadgeStock.update(existing.id, {
          current_stock: newStock,
          last_updated: new Date().toISOString(),
        });
      } else {
        return base44.entities.BadgeStock.create({
          badge_id: badgeId,
          current_stock: newStock,
          last_updated: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      toast.success('Stock updated');
    },
  });

  const bulkAddStockMutation = useMutation({
    mutationFn: async (quantities) => {
      const promises = Object.entries(quantities).map(([badgeId, qty]) => {
        if (qty > 0) {
          const existing = stock.find(s => s.badge_id === badgeId);
          const currentStock = existing?.current_stock || 0;
          const newStock = currentStock + qty;
          
          if (existing) {
            return base44.entities.BadgeStock.update(existing.id, {
              current_stock: newStock,
              last_updated: new Date().toISOString(),
            });
          } else {
            return base44.entities.BadgeStock.create({
              badge_id: badgeId,
              current_stock: newStock,
              last_updated: new Date().toISOString(),
            });
          }
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      toast.success('Stock added successfully');
      setBulkAddDialog(false);
      setBulkAddQuantities({});
      setAdditionalBadges([]);
    },
  });

  const getStockForBadge = (badgeId) => {
    return stock.find(s => s.badge_id === badgeId)?.current_stock || 0;
  };

  const getBadgesNeeded = () => {
    const needed = {};

    // 1. Pending awards
    pendingAwards.forEach(award => {
      needed[award.badge_id] = (needed[award.badge_id] || 0) + 1;
    });

    // 2. Badges that will be completed in current term
    programmeBadges.forEach(progBadge => {
      const prog = programmes.find(p => p.id === progBadge.programme_id);
      if (prog) {
        // Find members who are close to completing this badge
        const membersInProgress = badgeProgress.filter(
          bp => bp.badge_id === progBadge.badge_id && bp.status === 'in_progress'
        );
        
        // Add to needed count (conservative estimate)
        membersInProgress.forEach(bp => {
          needed[progBadge.badge_id] = (needed[progBadge.badge_id] || 0) + 1;
        });
      }
    });

    return needed;
  };

  const badgesNeeded = getBadgesNeeded();

  const getOrderList = () => {
    return badges.map(badge => {
      const currentStock = getStockForBadge(badge.id);
      const needed = badgesNeeded[badge.id] || 0;
      const deficit = Math.max(0, needed - currentStock);
      
      return {
        badge,
        currentStock,
        needed,
        deficit,
        shouldOrder: deficit > 0,
      };
    }).filter(item => item.shouldOrder);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const orderList = getOrderList();

    doc.setFontSize(20);
    doc.text('Badge Shopping List', 20, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Items to Order: ${orderList.length}`, 20, 36);

    doc.setFontSize(12);
    doc.text('Badge', 20, 50);
    doc.text('Section', 90, 50);
    doc.text('Current', 130, 50);
    doc.text('Needed', 160, 50);
    doc.text('Order', 190, 50);

    doc.line(20, 52, 200, 52);

    let y = 60;
    orderList.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.text(item.badge.name.substring(0, 30), 20, y);
      doc.text(
        sections.find(s => s.name === item.badge.section)?.display_name || 'All',
        90,
        y
      );
      doc.text(String(item.currentStock), 130, y);
      doc.text(String(item.needed), 160, y);
      doc.text(String(item.deficit), 190, y);
      y += 8;
    });

    // Summary
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y += 10;
    doc.line(20, y, 200, y);
    y += 8;
    doc.setFontSize(12);
    const totalToOrder = orderList.reduce((sum, item) => sum + item.deficit, 0);
    doc.text(`Total Badges to Order: ${totalToOrder}`, 20, y);

    doc.save(`badge-shopping-list-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Shopping list downloaded');
  };

  const handleStockEdit = (badgeId, value) => {
    setEditingStock({ ...editingStock, [badgeId]: value });
  };

  const saveStockEdit = (badgeId) => {
    const newStock = parseInt(editingStock[badgeId]);
    if (!isNaN(newStock) && newStock >= 0) {
      updateStockMutation.mutate({ badgeId, newStock });
      const newEditing = { ...editingStock };
      delete newEditing[badgeId];
      setEditingStock(newEditing);
    }
  };

  const handleBulkAddChange = (badgeId, value) => {
    setBulkAddQuantities({ ...bulkAddQuantities, [badgeId]: parseInt(value) || 0 });
  };

  const handleAddBadge = (badgeId) => {
    if (!additionalBadges.includes(badgeId)) {
      setAdditionalBadges([...additionalBadges, badgeId]);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleRemoveAdditional = (badgeId) => {
    setAdditionalBadges(additionalBadges.filter(id => id !== badgeId));
    const newQuantities = { ...bulkAddQuantities };
    delete newQuantities[badgeId];
    setBulkAddQuantities(newQuantities);
  };

  const orderList = getOrderList();
  const availableBadges = badges.filter(b => 
    !orderList.some(item => item.badge.id === b.id) &&
    !additionalBadges.includes(b.id)
  );

  const filteredAndSortedBadges = useMemo(() => {
    let filtered = badges;

    // Apply search filter
    if (stockSearchQuery.trim()) {
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(badge => badge.category === categoryFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'stock') {
        const stockA = getStockForBadge(a.id);
        const stockB = getStockForBadge(b.id);
        return stockA - stockB;
      } else if (sortBy === 'needed') {
        const neededA = badgesNeeded[a.id] || 0;
        const neededB = badgesNeeded[b.id] || 0;
        return neededB - neededA;
      } else if (sortBy === 'section') {
        return a.section.localeCompare(b.section);
      }
      return 0;
    });

    return sorted;
  }, [badges, stockSearchQuery, categoryFilter, sortBy, badgesNeeded]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LeaderNav />
      
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Badge Stock Management</h1>
              <p className="text-lg text-white/90 mt-2">Track inventory and generate shopping lists</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => setBulkAddDialog(true)}
            disabled={orderList.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stock from Shopping
          </Button>
          <Button
            onClick={generatePDF}
            disabled={orderList.length === 0}
            variant="outline"
            className="border-blue-600 text-blue-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Shopping List PDF
          </Button>
        </div>

        {/* Order Summary */}
        {orderList.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <ShoppingCart className="w-5 h-5" />
                Badges to Order
              </CardTitle>
              <CardDescription className="text-orange-700">
                Based on pending awards and upcoming term activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderList.map(item => (
                  <div key={item.badge.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={item.badge.image_url} alt={item.badge.name} className="w-10 h-10 object-contain" />
                      <div>
                        <div className="font-semibold text-gray-900">{item.badge.name}</div>
                        <div className="text-sm text-gray-500">
                          {sections.find(s => s.name === item.badge.section)?.display_name || 'All Sections'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-gray-600">
                        Stock: <span className="font-semibold">{item.currentStock}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Needed: <span className="font-semibold">{item.needed}</span>
                      </div>
                      <Badge className="bg-orange-600 text-white">
                        Order: {item.deficit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Badges Stock */}
        <Card>
          <CardHeader>
            <CardTitle>All Badge Stock Levels</CardTitle>
            <CardDescription>View and manually adjust stock for each badge</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search badges..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="needed">Needed Most</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              {filteredAndSortedBadges.map(badge => {
                const currentStock = getStockForBadge(badge.id);
                const needed = badgesNeeded[badge.id] || 0;
                const isLow = currentStock < needed;
                const isEditing = editingStock[badge.id] !== undefined;

                return (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isLow ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain" />
                      <div>
                        <div className="font-semibold text-gray-900">{badge.name}</div>
                        <div className="text-sm text-gray-500">
                          {sections.find(s => s.name === badge.section)?.display_name || 'All Sections'}
                        </div>
                      </div>
                      {isLow && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {needed > 0 && (
                        <div className="text-sm text-gray-600">
                          Needed: <span className="font-semibold text-orange-600">{needed}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min="0"
                              value={editingStock[badge.id]}
                              onChange={(e) => handleStockEdit(badge.id, e.target.value)}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              onClick={() => saveStockEdit(badge.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-gray-900 w-16 text-right">
                              {currentStock}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStock({ ...editingStock, [badge.id]: currentStock })}
                            >
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkAddDialog} onOpenChange={setBulkAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stock from Shopping Trip</DialogTitle>
            <DialogDescription>
              Enter the quantities purchased for each badge on your shopping list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {orderList.map(item => (
              <div key={item.badge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={item.badge.image_url} alt={item.badge.name} className="w-10 h-10 object-contain" />
                  <div>
                    <div className="font-semibold text-gray-900">{item.badge.name}</div>
                    <div className="text-sm text-gray-500">Need to order: {item.deficit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAddChange(item.badge.id, (bulkAddQuantities[item.badge.id] || 0) - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={bulkAddQuantities[item.badge.id] || 0}
                    onChange={(e) => handleBulkAddChange(item.badge.id, e.target.value)}
                    className="w-20 text-center"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAddChange(item.badge.id, (bulkAddQuantities[item.badge.id] || 0) + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {additionalBadges.map(badgeId => {
              const badge = badges.find(b => b.id === badgeId);
              if (!badge) return null;
              return (
                <div key={badgeId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-3">
                    <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain" />
                    <div>
                      <div className="font-semibold text-gray-900">{badge.name}</div>
                      <div className="text-sm text-blue-600">Additional badge</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveAdditional(badgeId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAddChange(badgeId, (bulkAddQuantities[badgeId] || 0) - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      value={bulkAddQuantities[badgeId] || 0}
                      onChange={(e) => handleBulkAddChange(badgeId, e.target.value)}
                      className="w-20 text-center"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAddChange(badgeId, (bulkAddQuantities[badgeId] || 0) + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Popover open={showSearch} onOpenChange={setShowSearch}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Badge
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search badges..." />
                  <CommandList>
                    <CommandEmpty>No badges found.</CommandEmpty>
                    <CommandGroup>
                      {availableBadges.map(badge => (
                        <CommandItem
                          key={badge.id}
                          onSelect={() => handleAddBadge(badge.id)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <img src={badge.image_url} alt={badge.name} className="w-8 h-8 object-contain" />
                          <div>
                            <div className="font-medium">{badge.name}</div>
                            <div className="text-xs text-gray-500">
                              {sections.find(s => s.name === badge.section)?.display_name || 'All Sections'}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setBulkAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkAddStockMutation.mutate(bulkAddQuantities)}
              className="bg-green-600 hover:bg-green-700"
            >
              Add to Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
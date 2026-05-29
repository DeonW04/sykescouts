import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { useSectionContext } from '../components/leader/SectionContext';
import DashboardTab from '../components/accounting/DashboardTab';
import SubscriptionsTab from '../components/accounting/SubscriptionsTab';
import PaymentTrackerTab from '../components/accounting/PaymentTrackerTab';
import ReceiptsTab from '../components/accounting/ReceiptsTab';

export default function SectionAccounting() {
  const { selectedSectionId } = useSectionContext();

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });
  const section = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />

      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Section Accounting</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>
            {section?.display_name || 'All Sections'} — Financial Overview
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payment-tracker">Payment Tracker</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab selectedSectionId={selectedSectionId} />
          </TabsContent>
          <TabsContent value="subscriptions">
            <SubscriptionsTab selectedSectionId={selectedSectionId} />
          </TabsContent>
          <TabsContent value="payment-tracker">
            <PaymentTrackerTab selectedSectionId={selectedSectionId} />
          </TabsContent>
          <TabsContent value="receipts">
            <ReceiptsTab selectedSectionId={selectedSectionId} section={section} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
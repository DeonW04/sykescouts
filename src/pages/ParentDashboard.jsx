import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, FileText, CreditCard, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParentDashboard() {
  const [user, setUser] = useState(null);
  const [parent, setParent] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    const parents = await base44.entities.Parent.filter({ user_id: currentUser.id });
    if (parents.length > 0) {
      setParent(parents[0]);
    }
  };

  const { data: children = [] } = useQuery({
    queryKey: ['children', parent?.id],
    queryFn: async () => {
      if (!parent) return [];
      const members = await base44.entities.Member.filter({});
      return members.filter(m => m.parent_ids?.includes(parent.id));
    },
    enabled: !!parent,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const sectionIds = [...new Set(children.map(c => c.section_id))];
      const events = await base44.entities.Event.filter({ published: true });
      return events.filter(e => 
        e.section_ids?.some(sid => sectionIds.includes(sid))
      ).slice(0, 5);
    },
    enabled: children.length > 0,
  });

  if (!user || !parent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Users, label: 'View Children', count: children.length },
    { icon: Calendar, label: 'Upcoming Events', count: upcomingEvents.length },
    { icon: Award, label: 'Badge Progress', count: 0 },
    { icon: FileText, label: 'Forms', count: 0 },
    { icon: CreditCard, label: 'Payments', count: 0 },
    { icon: Bell, label: 'Notifications', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Parent Portal</h1>
          <p className="mt-2 text-white/80">Welcome back, {user.full_name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto bg-[#7413dc]/10 rounded-full flex items-center justify-center mb-3">
                    <action.icon className="w-6 h-6 text-[#7413dc]" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">{action.label}</h3>
                  {action.count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{action.count} items</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Children Overview */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Children
              </CardTitle>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <p className="text-gray-500">No children registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{child.full_name}</p>
                        <p className="text-sm text-gray-500">
                          Age {new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500">No upcoming events.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(event.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">More Features Coming Soon!</h3>
            <p className="text-blue-700 text-sm">
              We're building out badge tracking, payment management, attendance history, 
              and more. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
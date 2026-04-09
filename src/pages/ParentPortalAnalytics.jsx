import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LeaderNav from '../components/leader/LeaderNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { subDays, format, startOfDay, parseISO, isAfter } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { Users, Smartphone, Monitor, Wifi, TrendingUp, Clock, Eye, Activity, ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['#7413dc', '#004851', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444'];

const PLATFORM_LABELS = { pwa: 'Mobile App (PWA)', mobile_web: 'Mobile Browser', desktop_web: 'Desktop Web' };
const PLATFORM_ICONS = { pwa: Smartphone, mobile_web: Wifi, desktop_web: Monitor };
const PLATFORM_COLORS = { pwa: '#7413dc', mobile_web: '#3b82f6', desktop_web: '#004851' };

function StatCard({ title, value, subtitle, icon: Icon, color = '#7413dc' }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentPortalAnalytics() {
  const [dateRange, setDateRange] = useState(30);
  const [expandedParent, setExpandedParent] = useState(null);

  const since = subDays(new Date(), dateRange);

  const { data: allActivity = [], isLoading } = useQuery({
    queryKey: ['parent-activity-all'],
    queryFn: () => base44.entities.ParentActivity.list('-timestamp', 5000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users-analytics'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['all-parents-analytics'],
    queryFn: () => base44.entities.Parent.filter({}),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-analytics'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  // Filter activity to selected range
  const activity = useMemo(() =>
    allActivity.filter(a => isAfter(parseISO(a.timestamp), since)),
    [allActivity, dateRange]
  );

  // Identify parent users
  const parentUserIds = useMemo(() => new Set(parents.map(p => p.user_id)), [parents]);
  const parentUsers = useMemo(() =>
    users.filter(u => parentUserIds.has(u.id)),
    [users, parentUserIds]
  );

  // Per-parent stats
  const perParent = useMemo(() => {
    return parentUsers.map(user => {
      const userActivity = activity.filter(a => a.user_id === user.id);
      const allUserActivity = allActivity.filter(a => a.user_id === user.id);
      const lastSeen = allUserActivity.length > 0
        ? allUserActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.timestamp
        : null;

      // Unique session days
      const sessionDays = new Set(userActivity.map(a => a.session_date)).size;

      // Platform breakdown
      const platformCounts = { pwa: 0, mobile_web: 0, desktop_web: 0 };
      userActivity.forEach(a => { if (platformCounts[a.platform] !== undefined) platformCounts[a.platform]++; });
      const dominantPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      // Top pages
      const pageCounts = {};
      userActivity.forEach(a => { pageCounts[a.page_name] = (pageCounts[a.page_name] || 0) + 1; });
      const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Linked members
      const linkedMembers = members.filter(m =>
        m.parent_one_email === user.email || m.parent_two_email === user.email
      );

      return {
        user,
        pageViews: userActivity.length,
        sessionDays,
        lastSeen,
        dominantPlatform,
        platformCounts,
        topPages,
        linkedMembers,
      };
    }).sort((a, b) => b.pageViews - a.pageViews);
  }, [parentUsers, activity, allActivity, members]);

  // Aggregate stats
  const activeParents = perParent.filter(p => p.pageViews > 0).length;
  const totalPageViews = activity.length;

  // Platform breakdown
  const platformData = useMemo(() => {
    const counts = { pwa: 0, mobile_web: 0, desktop_web: 0 };
    activity.forEach(a => { if (counts[a.platform] !== undefined) counts[a.platform]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: PLATFORM_LABELS[k], value: v, key: k }));
  }, [activity]);

  // Top pages
  const topPagesData = useMemo(() => {
    const counts = {};
    activity.forEach(a => { counts[a.page_name] = (counts[a.page_name] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, views]) => ({ name, views }));
  }, [activity]);

  // Daily activity (last 14 days always shown)
  const dailyData = useMemo(() => {
    const days = Array.from({ length: Math.min(dateRange, 30) }, (_, i) => {
      const d = subDays(new Date(), Math.min(dateRange, 30) - 1 - i);
      return format(d, 'yyyy-MM-dd');
    });
    return days.map(date => {
      const dayActivity = activity.filter(a => a.session_date === date);
      return {
        date: format(parseISO(date), 'd MMM'),
        views: dayActivity.length,
        users: new Set(dayActivity.map(a => a.user_id)).size,
      };
    });
  }, [activity, dateRange]);

  // Inactive parents (registered but 0 views in period)
  const inactiveParents = perParent.filter(p => p.pageViews === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />

      <div className="bg-gradient-to-r from-[#7413dc] to-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Parent Portal Analytics</h1>
                <p className="text-white/70 mt-1">Track how parents are using the app</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDateRange(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === d ? 'bg-white text-[#7413dc]' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Registered Parents" value={parentUsers.length} subtitle="with portal accounts" icon={Users} color="#004851" />
          <StatCard title="Active (last period)" value={activeParents} subtitle={`of ${parentUsers.length} parents`} icon={TrendingUp} color="#7413dc" />
          <StatCard title="Total Page Views" value={totalPageViews.toLocaleString()} subtitle={`last ${dateRange} days`} icon={Eye} color="#3b82f6" />
          <StatCard
            title="Avg Views/Parent"
            value={activeParents > 0 ? Math.round(totalPageViews / activeParents) : 0}
            subtitle="per active parent"
            icon={Activity}
            color="#22c55e"
          />
        </div>

        {/* Platform & daily activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#7413dc]" />
                Access Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={platformData} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={false}>
                        {platformData.map((entry, i) => (
                          <Cell key={i} fill={PLATFORM_COLORS[entry.key] || COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + ' views', n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {platformData.map((p, i) => (
                      <div key={p.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p.key] || COLORS[i] }} />
                          <span className="text-xs text-gray-600">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">{p.value} ({totalPageViews > 0 ? Math.round(p.value / totalPageViews * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily activity */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7413dc]" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalPageViews === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data yet — activity will appear here once parents use the portal</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#7413dc" strokeWidth={2} dot={false} name="Page Views" />
                    <Line type="monotone" dataKey="users" stroke="#004851" strokeWidth={2} dot={false} name="Unique Parents" />
                    <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top pages */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#7413dc]" />
              Most Visited Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPagesData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No page data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topPagesData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="views" fill="#7413dc" radius={[0, 4, 4, 0]} name="Views" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Per-parent table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7413dc]" />
              Parent Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-4 border-[#7413dc] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Parent</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Children</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Primary Platform</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Page Views</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Active Days</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Seen</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {perParent.map(({ user, pageViews, sessionDays, lastSeen, dominantPlatform, platformCounts, topPages, linkedMembers }) => {
                      const PlatformIcon = dominantPlatform ? PLATFORM_ICONS[dominantPlatform] : Monitor;
                      const isExpanded = expandedParent === user.id;
                      const lastSeenDate = lastSeen ? parseISO(lastSeen) : null;
                      const daysSince = lastSeenDate ? Math.floor((new Date() - lastSeenDate) / 86400000) : null;
                      const isActive = pageViews > 0;
                      const isRecent = daysSince !== null && daysSince <= 7;

                      return (
                        <React.Fragment key={user.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-purple-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#7413dc]/10 rounded-full flex items-center justify-center text-sm font-bold text-[#7413dc] flex-shrink-0">
                                  {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{user.full_name || '—'}</p>
                                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {linkedMembers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {linkedMembers.map(m => (
                                    <span key={m.id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{m.first_name}</span>
                                  ))}
                                </div>
                              ) : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {dominantPlatform ? (
                                <div className="flex items-center gap-1.5">
                                  <PlatformIcon className="w-4 h-4" style={{ color: PLATFORM_COLORS[dominantPlatform] }} />
                                  <span className="text-xs text-gray-600">{PLATFORM_LABELS[dominantPlatform]}</span>
                                </div>
                              ) : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-gray-800">{pageViews}</span>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              <span className="text-gray-600">{sessionDays}</span>
                            </td>
                            <td className="px-4 py-3">
                              {lastSeenDate ? (
                                <div>
                                  <p className="text-xs text-gray-700">{format(lastSeenDate, 'd MMM yyyy')}</p>
                                  <p className="text-xs text-gray-400">{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</p>
                                </div>
                              ) : <span className="text-xs text-gray-400">Never</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {!isActive ? (
                                <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>
                              ) : isRecent ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Lapsed</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {pageViews > 0 && (
                                <button
                                  onClick={() => setExpandedParent(isExpanded ? null : user.id)}
                                  className="p-1 rounded hover:bg-gray-100"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-purple-50/30">
                              <td colSpan={8} className="px-8 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Top Pages (this period)</p>
                                    {topPages.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {topPages.map(([page, count]) => (
                                          <div key={page} className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                              <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${Math.round(count / topPages[0][1] * 100)}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-700 w-28 truncate">{page}</span>
                                            <span className="text-xs font-bold text-gray-500 w-6 text-right">{count}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : <p className="text-xs text-gray-400">No page data</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Platform Usage</p>
                                    <div className="space-y-1.5">
                                      {Object.entries(platformCounts).filter(([, v]) => v > 0).map(([plat, count]) => {
                                        const Icon = PLATFORM_ICONS[plat];
                                        return (
                                          <div key={plat} className="flex items-center gap-2">
                                            <Icon className="w-3.5 h-3.5" style={{ color: PLATFORM_COLORS[plat] }} />
                                            <span className="text-xs text-gray-600 flex-1">{PLATFORM_LABELS[plat]}</span>
                                            <span className="text-xs font-bold text-gray-700">{count} views</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Never logged in */}
        {inactiveParents.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-red-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700">
                ⚠️ {inactiveParents.length} parent{inactiveParents.length > 1 ? 's' : ''} haven't used the portal in the last {dateRange} days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {inactiveParents.map(({ user, lastSeen }) => (
                  <div key={user.id} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium text-red-800">{user.full_name || user.email}</p>
                    {lastSeen ? (
                      <p className="text-xs text-red-500">Last: {format(parseISO(lastSeen), 'd MMM yyyy')}</p>
                    ) : (
                      <p className="text-xs text-red-500">Never logged in</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
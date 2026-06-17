/**
 * routeMap.js — Single source of truth for grouped URLs.
 *
 * Maps each internal PageName to its new grouped, lowercase URL path.
 * `createPageUrl(PageName)` reads this map, so updating a path here updates
 * every <Link> and navigation across the whole app automatically.
 *
 * The old `/PageName` routes remain registered in App.jsx as aliases so that
 * links baked into emails, QR codes and bookmarks keep working.
 */
export const ROUTE_MAP = {
  // --- Public ---
  Home: '/',
  About: '/about',
  Contact: '/contact',
  Gallery: '/gallery',
  Join: '/join',
  Parents: '/parents',
  Volunteer: '/volunteer',

  // --- Unchanged (per request / external links) ---
  // app, CompleteRegistration, sign, ipad, receipt-submit, public-ra, approve-access
  // are handled directly in App.jsx and not remapped.

  // --- Leader: core ---
  LeaderDashboard: '/leader/dashboard',
  LeaderAttendance: '/leader/attendance',
  LeaderEvents: '/leader/events',
  LeaderGallery: '/leader/gallery',
  GalleryUpload: '/leader/gallery/upload',
  JoinEnquiries: '/leader/join-enquiries',
  IdeasBoard: '/leader/ideas',
  ParentPortalAnalytics: '/leader/analytics',
  ParentPortal: '/leader/parentportal',
  NightsAwayTracking: '/leader/nights-away',

  // --- Leader: members ---
  LeaderMembers: '/leader/members',
  MemberDetail: '/leader/members/detail',
  ArchivedMembers: '/leader/members/archived',

  // --- Leader: programme ---
  LeaderProgramme: '/leader/programme',
  MeetingDetail: '/leader/programme/meeting',
  EventDetail: '/leader/programme/event',

  // --- Leader: badges ---
  LeaderBadges: '/leader/badges',
  BadgeDetail: '/leader/badges/detail',
  AwardBadges: '/leader/badges/award',
  ManageBadges: '/leader/badges/manage',
  BadgeStockManagement: '/leader/badges/stock',
  StagedBadgeDetail: '/leader/badges/staged',
  ManageStagedBadge: '/leader/badges/staged/manage',
  EditBadgeStructure: '/leader/badges/structure',
  NightsAwayBadgeDetail: '/leader/badges/nights-away',
  HikesAwayBadgeDetail: '/leader/badges/hikes-away',
  JoiningInBadgeDetail: '/leader/badges/joining-in',
  GoldAwardDetail: '/leader/badges/gold-award',
  SilverAwardDetail: '/leader/badges/silver-award',
  OSMBadgeImport: '/leader/badges/import',
  ImportBadges: '/leader/badges/import-legacy',

  // --- Leader: whatsapp ---
  WhatsAppSchedules: '/leader/whatsapp/schedules',
  WhatsAppTemplates: '/leader/whatsapp/templates',

  // --- Leader: risk ---
  RiskAssessments: '/leader/risk/assessments',
  RiskAssessmentDetail: '/leader/risk/assessments/detail',
  RiskAssessmentHistory: '/leader/risk/history',

  // --- Leader: consent ---
  ConsentForms: '/leader/consent/forms',
  ConsentFormBuilder: '/leader/consent/builder',

  // --- Leader: communications ---
  Communications: '/leader/communications',
  WeeklyMessage: '/leader/communications/weekly',
  WeeklyMessageList: '/leader/communications/weekly/list',
  MonthlyNewsletter: '/leader/communications/newsletter',
  MonthlyNewsletterList: '/leader/communications/newsletter/list',
  EventUpdate: '/leader/communications/event-update',
  EventUpdateList: '/leader/communications/event-update/list',

  // --- Leader: tools ---
  AIProgrammePlanner: '/leader/tools/planner',
  PORHelper: '/leader/tools/por',
  QuizBuilder: '/leader/tools/quiz',
  MobileDashboardDemo: '/leader/demo',

  // --- Treasurer ---
  TreasurerDashboard: '/treasurer/dashboard',
  TreasurerLedger: '/treasurer/ledger',
  TreasurerMemberPayments: '/treasurer/payments/members',
  TreasurerEventFinances: '/treasurer/payments/events',
  TreasurerProgrammeFinances: '/treasurer/payments/programme',
  TreasurerReceiptAllocation: '/treasurer/receipts',
  TreasurerReimbursements: '/treasurer/reimbursements',
  TreasurerBudgets: '/treasurer/budgets',
  TreasurerRecurringPayments: '/treasurer/recurring',
  TreasurerFunds: '/treasurer/funds',
  TreasurerReports: '/treasurer/reports',
  SectionAccounting: '/treasurer/section',

  // --- Parent ---
  ParentDashboard: '/parent/dashboard',
  MyChild: '/parent/child',
  ParentProgramme: '/parent/programme',
  ParentEvents: '/parent/events',
  ParentEventDetail: '/parent/events/detail',
  ParentBadges: '/parent/badges',
  ParentGoldAward: '/parent/gold-award',
  ParentSilverAward: '/parent/silver-award',

  // --- Account ---
  AccountSettings: '/account/settings',

  // --- Admin ---
  AdminSettings: '/admin/settings',

  // --- Misc ---
  SharedPage: '/shared',
};
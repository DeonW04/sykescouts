import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import React from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AIProgrammePlanner from './pages/AIProgrammePlanner';
import TreasurerDashboard from './pages/TreasurerDashboard';
import TreasurerLedger from './pages/TreasurerLedger';
import TreasurerMemberPayments from './pages/TreasurerMemberPayments';
import TreasurerEventFinances from './pages/TreasurerEventFinances';
import TreasurerReceiptAllocation from './pages/TreasurerReceiptAllocation';
import TreasurerReimbursements from './pages/TreasurerReimbursements';
import TreasurerBudgets from './pages/TreasurerBudgets';
import TreasurerRecurringPayments from './pages/TreasurerRecurringPayments';
import TreasurerFunds from './pages/TreasurerFunds';
import TreasurerReports from './pages/TreasurerReports';
import TreasurerProgrammeFinances from './pages/TreasurerProgrammeFinances';
import SectionAccounting from './pages/SectionAccounting';
import PORHelper from './pages/PORHelper';
import QRReceiptSubmit from './pages/QRReceiptSubmit';
import ParentPortalAnalytics from './pages/ParentPortalAnalytics';
import ConsentForms from './pages/ConsentForms';
import ConsentFormBuilder from './pages/ConsentFormBuilder';
import IpadApp from './pages/IpadApp';
import SignaturePage from './pages/SignaturePage';
import QuizBuilder from './pages/QuizBuilder';
import MobileApp from './pages/MobileApp';
import CompleteRegistration from './pages/CompleteRegistration';
import Register from './pages/Register';
import Login from './pages/Login';
import ApproveAccess from './pages/ApproveAccess';
import { usePWA } from './hooks/usePWA';
import PWAInstallGate from './components/pwa/PWAInstallGate';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import LoadingScreen from '@/components/LoadingScreen';
import MobileDashboardDemo from './pages/MobileDashboardDemo';
import PWAInstallBanner from '@/components/pwa/PWAInstallBanner';
import WhatsAppSchedules from './pages/WhatsAppSchedules';
import PublicRiskAssessment from './pages/PublicRiskAssessment';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import GalleryUpload from './pages/GalleryUpload';
import AccountSettings from './pages/AccountSettings';
import OSMBadgeImport from './pages/OSMBadgeImport';
import SilverAwardDetail from './pages/SilverAwardDetail';
import ParentSilverAward from './pages/ParentSilverAward';

// Public-only pages that should never be shown in PWA mode
const PUBLIC_PAGES = ['/', '/Home', '/About', '/Contact', '/Gallery', '/Join', '/Sections', '/Parents', '/Volunteer', '/SharedPage'];

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PWAGate = ({ children }) => {
  const { isMobile, isPWA, isSignedIn, isLeaderOrAdmin, isCheckingRole, isIOS, canInstall, triggerInstallPrompt } = usePWA();
  const location = useLocation();

  // Wait for role/auth check to resolve before making decisions
  if (isCheckingRole) return <>{children}</>;

  const isPublicPage = PUBLIC_PAGES.some(p => location.pathname === p || location.pathname === p + '/');

  // --- PWA mode: redirect away from public pages ---
  if (isPWA && isPublicPage) {
    if (!isSignedIn) {
      window.location.replace('/login?next=/app');
    } else {
      window.location.replace('/app');
    }
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const pageReady = !isLoadingPublicSettings && !isLoadingAuth;
  const location = useLocation();

  const getSessionKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/Home') return 'home';
    return null;
  };

  const sessionKey = getSessionKey();

  const appContent = () => {
    if (isLoadingPublicSettings || isLoadingAuth) {
      return (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
    if (authError) {
      if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
      if (authError.type === 'auth_required') { navigateToLogin(); return null; }
    }
    return (
      <PWAGate>
      <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/AIProgrammePlanner" element={
        <LayoutWrapper currentPageName="AIProgrammePlanner">
          <AIProgrammePlanner />
        </LayoutWrapper>
      } />
      <Route path="/QuizBuilder" element={
        <LayoutWrapper currentPageName="QuizBuilder">
          <QuizBuilder />
        </LayoutWrapper>
      } />
      <Route path="/app" element={<MobileApp />} />
      <Route path="/ipad" element={<IpadApp />} />
      <Route path="/sign" element={<SignaturePage />} />
      <Route path="/ConsentForms" element={<LayoutWrapper currentPageName="ConsentForms"><ConsentForms /></LayoutWrapper>} />
      <Route path="/ParentPortalAnalytics" element={<LayoutWrapper currentPageName="ParentPortalAnalytics"><ParentPortalAnalytics /></LayoutWrapper>} />
      <Route path="/ConsentFormBuilder" element={<LayoutWrapper currentPageName="ConsentFormBuilder"><ConsentFormBuilder /></LayoutWrapper>} />
      <Route path="/CompleteRegistration" element={<CompleteRegistration />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/approve-access" element={<ApproveAccess />} />
      <Route path="/TreasurerDashboard" element={<TreasurerDashboard />} />
      <Route path="/TreasurerLedger" element={<TreasurerLedger />} />
      <Route path="/TreasurerMemberPayments" element={<TreasurerMemberPayments />} />
      <Route path="/TreasurerEventFinances" element={<TreasurerEventFinances />} />
      <Route path="/TreasurerReceiptAllocation" element={<TreasurerReceiptAllocation />} />
      <Route path="/TreasurerReimbursements" element={<TreasurerReimbursements />} />
      <Route path="/TreasurerBudgets" element={<TreasurerBudgets />} />
      <Route path="/TreasurerRecurringPayments" element={<TreasurerRecurringPayments />} />
      <Route path="/TreasurerFunds" element={<TreasurerFunds />} />
      <Route path="/TreasurerReports" element={<TreasurerReports />} />
      <Route path="/TreasurerProgrammeFinances" element={<TreasurerProgrammeFinances />} />
      <Route path="/SectionAccounting" element={<LayoutWrapper currentPageName="SectionAccounting"><SectionAccounting /></LayoutWrapper>} />
      <Route path="/PORHelper" element={<LayoutWrapper currentPageName="PORHelper"><PORHelper /></LayoutWrapper>} />
      <Route path="/receipt-submit" element={<QRReceiptSubmit />} />
      <Route path="/MobileDashboardDemo" element={<MobileDashboardDemo />} />
      <Route path="/WhatsAppSchedules" element={<LayoutWrapper currentPageName="WhatsAppSchedules"><WhatsAppSchedules /></LayoutWrapper>} />
      <Route path="/WhatsAppTemplates" element={<LayoutWrapper currentPageName="WhatsAppTemplates"><WhatsAppTemplates /></LayoutWrapper>} />
      <Route path="/public-ra" element={<PublicRiskAssessment />} />
      <Route path="/GalleryUpload" element={<GalleryUpload />} />
      <Route path="/AccountSettings" element={<AccountSettings />} />
      <Route path="/OSMBadgeImport" element={<OSMBadgeImport />} />
      <Route path="/SilverAwardDetail" element={<LayoutWrapper currentPageName="SilverAwardDetail"><SilverAwardDetail /></LayoutWrapper>} />
      <Route path="/ParentSilverAward" element={<LayoutWrapper currentPageName="ParentSilverAward"><ParentSilverAward /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </PWAGate>
    );
  };

  return (
    <>
      {sessionKey && <LoadingScreen sessionKey={sessionKey} pageReady={pageReady} />}
      {appContent()}
      <PWAInstallBanner />
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
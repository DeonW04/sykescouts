import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AIProgrammePlanner from './pages/AIProgrammePlanner';
import QuizBuilder from './pages/QuizBuilder';
import MobileApp from './pages/MobileApp';
import CompleteRegistration from './pages/CompleteRegistration';
import { usePWA } from './hooks/usePWA';
import PWAInstallGate from './components/pwa/PWAInstallGate';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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
      base44.auth.redirectToLogin('/app');
    } else if (isLeaderOrAdmin) {
      window.location.replace('/LeaderDashboard');
    } else {
      window.location.replace('/app');
    }
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  // --- Non-PWA mobile: show install gate only to signed-in parents ---
  if (isMobile && !isPWA && isSignedIn && !isLeaderOrAdmin) {
    return (
      <PWAInstallGate
        isIOS={isIOS}
        canInstall={canInstall}
        onInstall={triggerInstallPrompt}
      />
    );
  }

  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
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
      <Route path="/CompleteRegistration" element={<CompleteRegistration />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </PWAGate>
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
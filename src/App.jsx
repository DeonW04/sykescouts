import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AIProgrammePlanner from './pages/AIProgrammePlanner';
import QuizBuilder from './pages/QuizBuilder';
import MobileApp from './pages/MobileApp';
import { usePWA } from './hooks/usePWA';
import PWAInstallGate from './components/pwa/PWAInstallGate';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PWAGate = ({ children }) => {
  const { isMobile, isPWA, isLeaderOrAdmin, isCheckingRole, isIOS, canInstall, triggerInstallPrompt } = usePWA();

  // While checking role, don't render the gate to avoid flash
  if (isCheckingRole) return <>{children}</>;

  // On mobile, NOT a leader/admin, and NOT already in PWA mode → show install gate
  if (isMobile && !isPWA && !isLeaderOrAdmin) {
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

const MobileRedirect = () => {
  const { isMobile, isPWA, isLeaderOrAdmin, isCheckingRole } = usePWA();

  if (isCheckingRole) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile PWA non-leader → redirect to mobile app
  if (isMobile && isPWA && !isLeaderOrAdmin) {
    window.location.replace('/app');
    return null;
  }

  return null;
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
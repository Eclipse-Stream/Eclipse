// MainLayout.tsx - Structure principale de l'app (Story 1.5, Task 1)
// Layout: Titlebar + Sidebar + Content Area scrollable

import { TitleBar } from '@ui/components/features/TitleBar';
import { SidebarNav, type PageId } from '@ui/components/features/SidebarNav';
import { DashboardPage } from '@ui/pages/DashboardPage';
import { SettingsPage } from '@ui/pages/SettingsPage';
import { ApplicationsPage } from '@ui/pages/ApplicationsPage';
import { HelpPage } from '@ui/pages/HelpPage';
import { CreditsPage } from '@ui/pages/CreditsPage';

interface MainLayoutProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
}

export function MainLayout({ currentPage, onPageChange }: MainLayoutProps) {
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'settings':
        return <SettingsPage />;
      case 'applications':
        return <ApplicationsPage />;
      case 'help':
        return <HelpPage />;
      case 'credits':
        return <CreditsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black/60 text-text-primary overflow-hidden">
      {/* Custom TitleBar - Story 1.2 */}
      <TitleBar />

      {/* Main layout: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation - Story 1.4 */}
        <SidebarNav currentPage={currentPage} onPageChange={onPageChange} />

        {/* Main content area - scrollable with page transition */}
        <main className="flex-1 overflow-y-auto">
          <div key={currentPage} className="page-transition">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;

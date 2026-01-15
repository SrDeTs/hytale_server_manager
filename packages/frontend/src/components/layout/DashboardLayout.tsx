import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileHeader } from './MobileHeader';

export const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-primary-bg">
      <MobileHeader />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
        <Header />
        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="container mx-auto p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { ToastContainer } from '../ui/ToastContainer';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage';
import { AdminRole } from '../../types';

interface AdminLayoutProps {
  children: React.ReactNode;
  allowedRoles?: AdminRole[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { isOwnerAuthenticated, isLoadingAuth } = useOwnerAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page text-gray-700">
        <div className="flex items-center gap-3 text-sm font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-brand-green" />
          <span>Doʻkon egasi (Owner) huquqlari tekshirilmoqda...</span>
        </div>
      </div>
    );
  }

  // Direct visits to any `/admin/*` route when unauthenticated render the Single-Owner Login screen
  if (!isOwnerAuthenticated) {
    return <AdminLoginPage />;
  }

  return (
    <div className="min-h-screen flex bg-surface-page text-gray-900">
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
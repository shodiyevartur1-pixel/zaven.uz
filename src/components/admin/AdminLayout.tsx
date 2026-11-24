import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage';
import { AdminRole } from '../../types';
import { useBodyScrollLock } from '../../utils/scrollLock';
import { useStore } from '../../context/StoreContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  allowedRoles?: AdminRole[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useBodyScrollLock(isMobileSidebarOpen);

  const { isOwnerAuthenticated, isLoadingAuth } = useOwnerAuth();
  const { adminFeedback, removeAdminFeedback } = useStore();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page text-gray-700">
        <div className="mx-auto flex max-w-md items-center justify-center gap-3 px-5 text-center text-sm font-bold">
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
          {adminFeedback.length > 0 && (
            <section
              aria-label="Admin action feedback"
              aria-live="polite"
              className="mb-4 space-y-2"
            >
              {adminFeedback.map((message) => {
                const tone =
                  message.type === 'error'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : message.type === 'warning'
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : message.type === 'success'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : 'border-sky-300 bg-sky-50 text-sky-950';

                return (
                  <div
                    key={message.id}
                    role={message.type === 'error' ? 'alert' : 'status'}
                    className={`flex min-w-0 items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${tone}`}
                  >
                    <div className="min-w-0 break-words">
                      <p className="font-bold">{message.title}</p>
                      {message.description && (
                        <p className="mt-0.5 leading-relaxed">{message.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Xabarni yopish"
                      onClick={() => removeAdminFeedback(message.id)}
                      className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

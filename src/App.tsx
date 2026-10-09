import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MatchesList } from './components/MatchesList';
import { MatchDetail } from './components/MatchDetail';
import { MyBookings } from './components/MyBookings';
import { Profile } from './components/Profile';
import { AdminHub } from './components/AdminHub';
import { UserManagement } from './components/UserManagement';
import { ToastContainer } from './components/ToastContainer';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SignInModal } from './components/SignInModal';
import { ClubLogo } from './components/ClubLogo';
import { ShieldCheck, MapPin } from 'lucide-react';
import { isNasifUser } from './types';

const MainLayout: React.FC = () => {
  const { currentTab, currentUser, selectedMatchId, isSignInModalOpen, openSignInModal, closeSignInModal } = useApp();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || isNasifUser(currentUser?.email, currentUser?.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-[Inter,sans-serif] selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenNotifications={() => setIsNotificationOpen(true)} onOpenSignIn={openSignInModal} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {selectedMatchId ? (
          <MatchDetail />
        ) : currentTab === 'matches' ? (
          <MatchesList />
        ) : currentTab === 'bookings' ? (
          <MyBookings />
        ) : currentTab === 'users' ? (
          <UserManagement />
        ) : currentTab === 'profile' ? (
          <Profile />
        ) : currentTab === 'admin' ? (
          isAdmin ? <AdminHub /> : <MatchesList />
        ) : (
          <MatchesList />
        )}
      </main>

      {/* Global Minimal Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 px-4 bg-white/70 dark:bg-zinc-900/60 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClubLogo size="xs" />
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              Wednesday <span className="text-blue-600 dark:text-blue-400">United</span> Football Club
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Asia/Dhaka (UTC+6)</span>
            <span className="text-orange-500">•</span>
            <span>24h Dropout Cutoff Locked</span>
            <span className="text-orange-500">•</span>
            <span>bKash & City Bank Payments</span>
          </div>
        </div>
      </footer>

      {/* Notification Center Slide-over */}
      <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

      {/* Authentication Modal */}
      <SignInModal isOpen={isSignInModalOpen} onClose={closeSignInModal} />

      {/* Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

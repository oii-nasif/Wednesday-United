import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClubLogo } from './ClubLogo';
import {
  ShieldCheck,
  Calendar,
  UserCheck,
  ShieldAlert,
  Moon,
  Sun,
  Bell,
  LogIn,
  LogOut,
  ChevronDown,
  User,
  Check,
  Users,
} from 'lucide-react';
import { isNasifUser } from '../types';

interface Props {
  onOpenNotifications: () => void;
  onOpenSignIn?: () => void;
}

export const Navbar: React.FC<Props> = ({ onOpenNotifications, onOpenSignIn }) => {
  const {
    currentUser,
    users,
    currentTab,
    setCurrentTab,
    setSelectedMatchId,
    theme,
    toggleTheme,
    signOut,
    emails,
    openSignInModal,
  } = useApp();

  const handleOpenSignIn = () => {
    if (onOpenSignIn) {
      onOpenSignIn();
    } else {
      openSignInModal();
    }
  };

  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || isNasifUser(currentUser?.email, currentUser?.id);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div
          onClick={() => {
            setSelectedMatchId(null);
            setCurrentTab('matches');
          }}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <ClubLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                Wednesday <span className="text-blue-600 dark:text-blue-400">United</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden sm:block">
              Turf Booking & Match Day Attendance
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedMatchId(null);
              setCurrentTab('matches');
            }}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              currentTab === 'matches'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Matches
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('users');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                currentTab === 'users'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" /> Users
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold">
                {users.length}
              </span>
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('bookings');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                currentTab === 'bookings'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <UserCheck className="w-4 h-4" /> My Bookings
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('profile');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                currentTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('admin');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                currentTab === 'admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-orange-500" /> Admin Hub
            </button>
          )}
        </nav>

        {/* Right Tools: Notifications, Theme, User Auth */}
        <div className="flex items-center gap-2">
          {/* Email Notification Drawer Trigger */}
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 relative transition"
            title="View simulated email notification alerts"
          >
            <Bell className="w-5 h-5" />
            {emails.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Toggle light / dark mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Sign-In or Avatar */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full border-2 border-orange-500/80 hover:border-orange-500 transition shadow-xs"
              >
                {currentUser.photoURL && !currentUser.photoURL.includes('images.unsplash.com') ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-50 text-sm"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="font-semibold text-zinc-900 dark:text-white truncate">{currentUser.displayName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentUser.email}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                      isAdmin
                        ? 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-extrabold'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                    }`}>
                      {isAdmin ? 'ADMIN' : currentUser.role} • {currentUser.preferredPosition}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMatchId(null);
                      setCurrentTab('profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" /> Profile & Settings
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMatchId(null);
                      setCurrentTab('users');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-blue-600" /> Users & Roles ({users.length})
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setCurrentTab('admin');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4 text-orange-500" /> Admin Hub
                    </button>
                  )}
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
                      <span>Appearance</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium capitalize">
                      {theme}
                    </span>
                  </button>
                  <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenSignIn}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => {
            setSelectedMatchId(null);
            setCurrentTab('matches');
          }}
          className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg ${
            currentTab === 'matches'
              ? 'text-blue-700 dark:text-blue-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Calendar className="w-4 h-4" /> Matches
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setSelectedMatchId(null);
              setCurrentTab('users');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg ${
              currentTab === 'users'
                ? 'text-blue-700 dark:text-blue-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
        )}
        {currentUser ? (
          <>
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('bookings');
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg ${
                currentTab === 'bookings'
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <UserCheck className="w-4 h-4" /> My Spots
            </button>
            <button
              onClick={() => {
                setSelectedMatchId(null);
                setCurrentTab('profile');
              }}
              className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg ${
                currentTab === 'profile'
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedMatchId(null);
                  setCurrentTab('admin');
                }}
                className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg ${
                  currentTab === 'admin'
                    ? 'text-blue-700 dark:text-blue-400 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-orange-500" /> Admin
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleOpenSignIn}
            className="flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-2 rounded-lg text-blue-700 dark:text-blue-400 cursor-pointer"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        )}
      </div>
    </header>
  );
};

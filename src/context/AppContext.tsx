import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Turf,
  Match,
  Attendee,
  MatchPhoto,
  ActivityLog,
  EmailNotification,
  PreferredPosition,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import { store } from '../services/store';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  turfs: Turf[];
  matches: Match[];
  attendees: Attendee[];
  photos: MatchPhoto[];
  activityLogs: ActivityLog[];
  emails: EmailNotification[];
  selectedMatchId: string | null;
  currentTab: 'matches' | 'bookings' | 'users' | 'profile' | 'admin';
  adminSubTab: 'matches' | 'turfs' | 'guests' | 'users' | 'activity';
  theme: 'light' | 'dark';
  toasts: Toast[];
  isSignInModalOpen: boolean;
  activityFilterMatchId: string | null;
  activityFilterActorUid: string | null;

  // Actions
  openSignInModal: () => void;
  closeSignInModal: () => void;
  setSelectedMatchId: (id: string | null) => void;
  setCurrentTab: (tab: 'matches' | 'bookings' | 'users' | 'profile' | 'admin') => void;
  setAdminSubTab: (tab: 'matches' | 'turfs' | 'guests' | 'users' | 'activity') => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  signIn: (email?: string, name?: string) => void;
  signInWithGoogle: () => Promise<User>;
  signInWithPassword: (email: string, password?: string) => void;
  signOut: () => void;
  switchUser: (userId: string) => void;
  updateProfile: (updates: {
    displayName?: string;
    preferredPosition?: PreferredPosition;
    emailNotifications?: boolean;
    photoURL?: string;
  }) => void;
  updateUserRole: (userId: string, role: 'player' | 'admin') => void;
  createUser: (data: { displayName: string; email: string; preferredPosition?: PreferredPosition; role?: 'player' | 'admin' }) => User;
  deleteUser: (userId: string) => void;

  // Match actions
  createMatch: (data: { turfId: string; matchDate: string; startTime: string; endTime: string; feePerPlayer: number; notes?: string }) => Match;
  updateMatch: (id: string, updates: any) => Match;
  cancelMatch: (id: string, reason?: string) => Match;

  // Turf actions
  createTurf: (data: { name: string; location: string; mapUrl: string }) => Turf;
  updateTurf: (id: string, data: any) => Turf;
  deactivateTurf: (id: string) => Turf;
  deleteTurf: (id: string) => Promise<void>;

  // Attendee & Booking actions
  bookMatch: (matchId: string) => void;
  cancelBooking: (matchId: string, attendeeId: string, reason?: string) => void;
  requestGuest: (matchId: string, guestName: string, position: PreferredPosition) => void;
  approveGuest: (matchId: string, attendeeId: string) => void;
  rejectGuest: (matchId: string, attendeeId: string, reason?: string) => void;
  updatePayment: (matchId: string, attendeeId: string, status: PaymentStatus, method: PaymentMethod | null, ref: string | null) => void;
  forceAddAttendee: (matchId: string, data: any) => void;

  // Photo actions
  uploadPhoto: (matchId: string, photoData: { imageUrl: string; thumbUrl: string; width: number; height: number; caption?: string }) => MatchPhoto;
  deletePhoto: (matchId: string, photoId: string) => void;
  updatePhotoCaption: (matchId: string, photoId: string, caption: string) => void;
  setCoverPhoto: (matchId: string, thumbUrl: string) => void;
  setAlbumUrl: (matchId: string, url: string) => void;

  // Navigation Deep Links
  openActivityLogForMatch: (matchId: string) => void;
  openActivityLogForUser: (userUid: string) => void;
  resetAllSeed: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(store.getCurrentUser());
  const [users, setUsers] = useState<User[]>(store.getUsers());
  const [turfs, setTurfs] = useState<Turf[]>(store.getTurfs());
  const [matches, setMatches] = useState<Match[]>(store.getMatches());
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [photos, setPhotos] = useState<MatchPhoto[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(store.getActivityLogs());
  const [emails, setEmails] = useState<EmailNotification[]>(store.getEmails());

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'matches' | 'bookings' | 'users' | 'profile' | 'admin'>('matches');
  const [adminSubTab, setAdminSubTab] = useState<'matches' | 'turfs' | 'guests' | 'users' | 'activity'>('matches');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('wu_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const openSignInModal = () => setIsSignInModalOpen(true);
  const closeSignInModal = () => setIsSignInModalOpen(false);

  const [activityFilterMatchId, setActivityFilterMatchId] = useState<string | null>(null);
  const [activityFilterActorUid, setActivityFilterActorUid] = useState<string | null>(null);

  // Sync with store state
  const refreshFromStore = () => {
    setCurrentUser(store.getCurrentUser());
    setUsers(store.getUsers());
    setTurfs(store.getTurfs());
    setMatches(store.getMatches());
    setActivityLogs(store.getActivityLogs());
    setEmails(store.getEmails());
    if (selectedMatchId) {
      setAttendees(store.getAttendees(selectedMatchId));
      setPhotos(store.getPhotos(selectedMatchId));
    }
  };

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      refreshFromStore();
    });
    return unsubscribe;
  }, [selectedMatchId]);

  useEffect(() => {
    if (selectedMatchId) {
      setAttendees(store.getAttendees(selectedMatchId));
      setPhotos(store.getPhotos(selectedMatchId));
    }
  }, [selectedMatchId]);

  // Dark mode class sync and persistence
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      try {
        localStorage.setItem('wu_theme', 'dark');
      } catch {
        // ignore
      }
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('wu_theme', 'light');
      } catch {
        // ignore
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const signIn = (email = 'player1@wednesdayunited.com', name = 'Player 1') => {
    try {
      const u = store.signInWithGoogle(email, name);
      setCurrentUser(u);
      showToast(`Signed in as ${u.displayName}`, 'success');
      return u;
    } catch (err: any) {
      showToast(err.message || 'Sign in failed', 'error');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const u = await store.signInWithGoogleSSO();
      setCurrentUser(u);
      showToast(`Welcome, ${u.displayName}! Signed in with Google`, 'success');
      return u;
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      let message = err.message || 'Google sign-in failed';
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'This preview domain is not authorized in Firebase Auth settings. Please sign in with email and password.';
      }
      showToast(message, 'error');
      throw new Error(message);
    }
  };

  const signInWithPassword = (email: string, password?: string) => {
    try {
      const u = store.signInWithPassword(email, password);
      setCurrentUser(u);
      showToast(`Signed in as ${u.displayName} (${u.role.toUpperCase()})`, 'success');
      return u;
    } catch (err: any) {
      showToast(err.message || 'Sign in failed', 'error');
      throw err;
    }
  };

  const signOut = () => {
    store.signOut();
    setCurrentUser(null);
    showToast('Signed out', 'info');
  };

  const switchUser = (userId: string) => {
    store.switchUser(userId);
    const u = store.getCurrentUser();
    setCurrentUser(u);
    if (u) {
      showToast(`Switched account to ${u.displayName} (${u.role.toUpperCase()})`, 'info');
    } else {
      showToast('Switched to Visitor (Signed Out)', 'info');
    }
  };

  const updateProfile = (updates: {
    displayName?: string;
    preferredPosition?: PreferredPosition;
    emailNotifications?: boolean;
    photoURL?: string;
  }) => {
    if (!currentUser) return;
    try {
      store.updateUserProfile(currentUser.id, updates);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const updateUserRole = (userId: string, role: 'player' | 'admin') => {
    try {
      store.updateUserRole(userId, role);
      showToast(`User role updated to ${role.toUpperCase()}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const createUser = (data: {
    displayName: string;
    email: string;
    preferredPosition?: PreferredPosition;
    role?: 'player' | 'admin';
  }) => {
    try {
      const u = store.createUser(data);
      showToast(`New member ${u.displayName} registered!`, 'success');
      return u;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deleteUser = (userId: string) => {
    try {
      store.deleteUser(userId);
      showToast('User account deleted', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const createMatch = (data: { turfId: string; matchDate: string; startTime: string; endTime: string; feePerPlayer: number; notes?: string }) => {
    try {
      const m = store.createMatch(data);
      showToast(`Match for ${m.matchDate} created!`, 'success');
      return m;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateMatch = (id: string, updates: any) => {
    try {
      const m = store.updateMatch(id, updates);
      showToast('Match updated successfully', 'success');
      return m;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const cancelMatch = (id: string, reason?: string) => {
    try {
      const m = store.cancelMatch(id, reason);
      showToast('Match cancelled', 'info');
      return m;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const createTurf = (data: { name: string; location: string; mapUrl: string }) => {
    try {
      const t = store.createTurf(data);
      showToast(`Turf ${t.name} added!`, 'success');
      return t;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateTurf = (id: string, data: any) => {
    try {
      const t = store.updateTurf(id, data);
      showToast('Turf updated', 'success');
      return t;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deactivateTurf = (id: string) => {
    try {
      const t = store.deactivateTurf(id);
      showToast(`Turf ${t.name} deactivated`, 'info');
      return t;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deleteTurf = async (id: string) => {
    try {
      await store.deleteTurf(id);
      setTurfs(store.getTurfs());
      setMatches(store.getMatches());
      showToast('Turf venue deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const bookMatch = (matchId: string) => {
    if (!currentUser) {
      signIn();
      return;
    }
    try {
      store.bookMatch(matchId, currentUser.id);
      showToast("You're in! Spot confirmed.", 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const cancelBooking = (matchId: string, attendeeId: string, reason?: string) => {
    try {
      store.cancelBooking(matchId, attendeeId, reason);
      showToast('Booking cancelled.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const requestGuest = (matchId: string, guestName: string, position: PreferredPosition) => {
    try {
      store.requestGuest(matchId, guestName, position);
      showToast(`Guest request submitted for "${guestName}". Pending admin approval.`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const approveGuest = (matchId: string, attendeeId: string) => {
    try {
      store.approveGuest(matchId, attendeeId);
      showToast('Guest approved and added to roster!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const rejectGuest = (matchId: string, attendeeId: string, reason?: string) => {
    try {
      store.rejectGuest(matchId, attendeeId, reason);
      showToast('Guest request rejected.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const updatePayment = (
    matchId: string,
    attendeeId: string,
    status: PaymentStatus,
    method: PaymentMethod | null,
    ref: string | null
  ) => {
    try {
      store.updatePayment(matchId, attendeeId, status, method, ref);
      showToast(
        status === 'paid'
          ? `Marked as Paid via ${method === 'bkash' ? 'bKash' : 'City Bank'}`
          : 'Payment status updated to Not Paid',
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const forceAddAttendee = (matchId: string, data: any) => {
    try {
      store.forceAddAttendee(matchId, data);
      showToast(`Added ${data.name} to roster`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const uploadPhoto = (
    matchId: string,
    photoData: { imageUrl: string; thumbUrl: string; width: number; height: number; caption?: string }
  ) => {
    try {
      const p = store.uploadPhoto(matchId, photoData);
      showToast('Photo uploaded to match gallery!', 'success');
      return p;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const deletePhoto = (matchId: string, photoId: string) => {
    try {
      store.deletePhoto(matchId, photoId);
      showToast('Photo removed from gallery', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const updatePhotoCaption = (matchId: string, photoId: string, caption: string) => {
    try {
      store.updatePhotoCaption(matchId, photoId, caption);
      showToast('Caption updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const setCoverPhoto = (matchId: string, thumbUrl: string) => {
    try {
      store.setCoverPhoto(matchId, thumbUrl);
      showToast('Cover photo updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const setAlbumUrl = (matchId: string, url: string) => {
    try {
      store.setAlbumUrl(matchId, url);
      showToast('Full album link updated', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openActivityLogForMatch = (matchId: string) => {
    setActivityFilterMatchId(matchId);
    setActivityFilterActorUid(null);
    setCurrentTab('admin');
    setAdminSubTab('activity');
  };

  const openActivityLogForUser = (userUid: string) => {
    setActivityFilterActorUid(userUid);
    setActivityFilterMatchId(null);
    setCurrentTab('admin');
    setAdminSubTab('activity');
  };

  const resetAllSeed = () => {
    store.resetAllToSeed();
    showToast('All data reset to initial official state', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        turfs,
        matches,
        attendees,
        photos,
        activityLogs,
        emails,
        selectedMatchId,
        currentTab,
        adminSubTab,
        theme,
        toasts,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        activityFilterMatchId,
        activityFilterActorUid,
        setSelectedMatchId,
        setCurrentTab,
        setAdminSubTab,
        toggleTheme,
        showToast,
        signIn,
        signInWithGoogle,
        signInWithPassword,
        signOut,
        switchUser,
        updateProfile,
        updateUserRole,
        createUser,
        deleteUser,
        createMatch,
        updateMatch,
        cancelMatch,
        createTurf,
        updateTurf,
        deactivateTurf,
        deleteTurf,
        bookMatch,
        cancelBooking,
        requestGuest,
        approveGuest,
        rejectGuest,
        updatePayment,
        forceAddAttendee,
        uploadPhoto,
        deletePhoto,
        updatePhotoCaption,
        setCoverPhoto,
        setAlbumUrl,
        openActivityLogForMatch,
        openActivityLogForUser,
        resetAllSeed,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

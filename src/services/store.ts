/**
 * Wednesday United - Reactive Store and Data Management Layer
 * Implements business rules BR-01 to BR-21 and FR-01 to FR-51
 */

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
  UserRole,
  ActionCategory,
  isNasifUser,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_TURFS,
  INITIAL_MATCHES,
  INITIAL_ATTENDEES,
  INITIAL_PHOTOS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_EMAILS,
} from './seedData';
import { getCutoffStatus, createDhakaTimestamp } from '../utils/date';
import { db, auth, googleProvider } from './firebase';
import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

// Keys for local persistence
const STORAGE_PREFIX = 'wednesday_united_';
const USERS_KEY = `${STORAGE_PREFIX}users`;
const TURFS_KEY = `${STORAGE_PREFIX}turfs`;
const MATCHES_KEY = `${STORAGE_PREFIX}matches`;
const ATTENDEES_KEY = `${STORAGE_PREFIX}attendees`;
const PHOTOS_KEY = `${STORAGE_PREFIX}photos`;
const LOGS_KEY = `${STORAGE_PREFIX}logs`;
const EMAILS_KEY = `${STORAGE_PREFIX}emails`;
const CURRENT_USER_ID_KEY = `${STORAGE_PREFIX}current_user_id`;

type StoreListener = () => void;

class Store {
  private users: User[] = [];
  private turfs: Turf[] = [];
  private matches: Match[] = [];
  private attendees: Attendee[] = [];
  private photos: MatchPhoto[] = [];
  private logs: ActivityLog[] = [];
  private emails: EmailNotification[] = [];
  private currentUserId: string | null = null;
  private listeners: Set<StoreListener> = new Set();
  private isFirestoreConnected = false;

  constructor() {
    this.init();
    // Connect and sync live Firestore
    this.initFirestoreSync();
    // Periodically run auto-complete for matches whose endAt has passed (FR-26)
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.checkAutoComplete(), 15000);
    }
  }

  private async initFirestoreSync() {
    try {
      // 1. Setup real-time listeners for live Firestore
      onSnapshot(collection(db, 'turfs'), (snap) => {
        const list: Turf[] = [];
        snap.forEach((d) => list.push(d.data() as Turf));
        if (list.length > 0 || this.isFirestoreConnected) {
          this.turfs = list;
          this.persistLocally();
        }
      }, (err) => console.warn('Firestore turfs listener:', err));

      onSnapshot(collection(db, 'matches'), (snap) => {
        if (!snap.empty) {
          const list: Match[] = [];
          snap.forEach((d) => list.push(d.data() as Match));
          this.matches = list;
          this.persistLocally();
        }
      }, (err) => console.warn('Firestore matches listener:', err));

      onSnapshot(collection(db, 'users'), (snap) => {
        if (!snap.empty) {
          const list: User[] = [];
          snap.forEach((d) => {
            const data = d.data() as Partial<User>;
            const email = (data.email || '').trim().toLowerCase();
            const isAdmin = isNasifUser(email, d.id) || isNasifUser(data.email, data.id) || data.role === 'admin';
            const u: User = {
              id: data.id || d.id,
              displayName: data.displayName || (email ? email.split('@')[0] : 'Player'),
              email: data.email || '',
              photoURL: (data.photoURL && !data.photoURL.includes('images.unsplash.com')) ? data.photoURL : '',
              preferredPosition: (data.preferredPosition as PreferredPosition) || 'Any',
              role: isAdmin ? 'admin' : (data.role || 'player'),
              emailNotifications: data.emailNotifications ?? true,
              createdAt: data.createdAt || new Date().toISOString(),
            };
            list.push(u);
            if (isAdmin && data.role !== 'admin') {
              this.syncDocToFirestore('users', d.id, { ...data, role: 'admin' });
            }
          });
          // Guarantee Nasif admin account is always present
          if (!list.some((u) => isNasifUser(u.email, u.id))) {
            list.unshift(INITIAL_USERS[0]);
          }
          this.users = list;
          this.persistLocally();
        }
      }, (err) => console.warn('Firestore users listener:', err));

      // Synchronize Firebase Auth state
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const cleanEmail = (fbUser.email || '').trim().toLowerCase();
          const isAdmin = isNasifUser(cleanEmail, fbUser.uid);
          let user = this.users.find(
            (u) => u.email.toLowerCase() === cleanEmail || (isAdmin && (u.id === 'user-nasif' || u.id === fbUser.uid || isNasifUser(u.email, u.id)))
          );
          if (!user) {
            user = {
              id: fbUser.uid,
              displayName: fbUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Player'),
              email: cleanEmail,
              photoURL: fbUser.photoURL || '',
              preferredPosition: 'Any',
              role: isAdmin ? 'admin' : 'player',
              emailNotifications: true,
              createdAt: new Date().toISOString(),
            };
            this.users.unshift(user);
          } else {
            if (isAdmin) user.role = 'admin';
            if (fbUser.displayName && !user.displayName) user.displayName = fbUser.displayName;
            if (fbUser.photoURL && !user.photoURL) user.photoURL = fbUser.photoURL;
          }
          this.currentUserId = user.id;
          this.persistLocally();
          if (isAdmin) {
            try {
              await this.syncDocToFirestore('users', user.id, user);
            } catch {
              // ignore
            }
          }
        }
      });

      onSnapshot(collection(db, 'activityLogs'), (snap) => {
        if (!snap.empty) {
          const list: ActivityLog[] = [];
          snap.forEach((d) => list.push(d.data() as ActivityLog));
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.logs = list;
          this.persistLocally();
        }
      }, (err) => console.warn('Firestore activityLogs listener:', err));

      // 2. Check and purge dummy data in live Firestore if needed
      if (localStorage.getItem(`${STORAGE_PREFIX}firestore_purged_v1`) !== 'true') {
        console.log('Purging dummy data from live Firestore, keeping only Nasif...');
        const mSnap = await getDocs(collection(db, 'matches'));
        for (const docSnap of mSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
        const uSnap = await getDocs(collection(db, 'users'));
        for (const docSnap of uSnap.docs) {
          if (docSnap.id !== 'user-nasif') {
            await deleteDoc(docSnap.ref);
          }
        }
        await setDoc(doc(db, 'users', 'user-nasif'), INITIAL_USERS[0]);
        for (const t of INITIAL_TURFS) {
          await setDoc(doc(db, 'turfs', t.id), t);
        }
        for (const l of INITIAL_ACTIVITY_LOGS) {
          await setDoc(doc(db, 'activityLogs', l.id), l);
        }
        localStorage.setItem(`${STORAGE_PREFIX}firestore_purged_v1`, 'true');
      }

      this.isFirestoreConnected = true;
    } catch (err) {
      console.warn('Live Firestore initialization error (using local persistence):', err);
    }
  }

  private persistLocally() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(TURFS_KEY, JSON.stringify(this.turfs));
      localStorage.setItem(MATCHES_KEY, JSON.stringify(this.matches));
      localStorage.setItem(ATTENDEES_KEY, JSON.stringify(this.attendees));
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(this.photos));
      localStorage.setItem(LOGS_KEY, JSON.stringify(this.logs));
      localStorage.setItem(EMAILS_KEY, JSON.stringify(this.emails));
      if (this.currentUserId) {
        localStorage.setItem(CURRENT_USER_ID_KEY, this.currentUserId);
      } else {
        localStorage.removeItem(CURRENT_USER_ID_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    this.notify();
  }

  private async syncDocToFirestore(path: string, id: string, data: any) {
    try {
      await setDoc(doc(db, path, id), data);
    } catch (err) {
      console.warn(`Firestore write to ${path}/${id} error:`, err);
    }
  }

  private async syncSubDocToFirestore(matchId: string, subcollection: string, id: string, data: any) {
    try {
      await setDoc(doc(db, 'matches', matchId, subcollection, id), data);
    } catch (err) {
      console.warn(`Firestore write to matches/${matchId}/${subcollection}/${id} error:`, err);
    }
  }

  private async deleteSubDocFromFirestore(matchId: string, subcollection: string, id: string) {
    try {
      await deleteDoc(doc(db, 'matches', matchId, subcollection, id));
    } catch (err) {
      console.warn(`Firestore delete from matches/${matchId}/${subcollection}/${id} error:`, err);
    }
  }

  private async deleteDocFromFirestore(path: string, id: string) {
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      console.warn(`Firestore delete ${path}/${id} error:`, err);
    }
  }

  private init() {
    try {
      const storedCurrId = localStorage.getItem(CURRENT_USER_ID_KEY);
      this.currentUserId = storedCurrId || null;

      const storedUsers = localStorage.getItem(USERS_KEY);
      this.users = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];
      // Guarantee Nasif admin accounts are always present and set to admin
      this.users.forEach((u) => {
        if (isNasifUser(u.email, u.id)) {
          u.role = 'admin';
        }
        if (u.photoURL && u.photoURL.includes('images.unsplash.com')) {
          u.photoURL = '';
        }
      });
      if (!this.users.some((u) => isNasifUser(u.email, u.id))) {
        this.users.unshift(INITIAL_USERS[0]);
      }

      const storedTurfs = localStorage.getItem(TURFS_KEY);
      this.turfs = storedTurfs ? JSON.parse(storedTurfs) : [...INITIAL_TURFS];

      const storedMatches = localStorage.getItem(MATCHES_KEY);
      this.matches = storedMatches ? JSON.parse(storedMatches) : [...INITIAL_MATCHES];

      const storedAttendees = localStorage.getItem(ATTENDEES_KEY);
      this.attendees = storedAttendees ? JSON.parse(storedAttendees) : [...INITIAL_ATTENDEES];

      const storedPhotos = localStorage.getItem(PHOTOS_KEY);
      this.photos = storedPhotos ? JSON.parse(storedPhotos) : [...INITIAL_PHOTOS];

      const storedLogs = localStorage.getItem(LOGS_KEY);
      this.logs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_ACTIVITY_LOGS];

      const storedEmails = localStorage.getItem(EMAILS_KEY);
      this.emails = storedEmails ? JSON.parse(storedEmails) : [...INITIAL_EMAILS];

      this.checkAutoComplete();
      this.persist();
    } catch (e) {
      console.error('Failed to init store:', e);
      this.users = [...INITIAL_USERS];
      this.turfs = [...INITIAL_TURFS];
      this.matches = [];
      this.attendees = [];
      this.photos = [];
      this.logs = [...INITIAL_ACTIVITY_LOGS];
      this.emails = [];
      const storedCurrId = localStorage.getItem(CURRENT_USER_ID_KEY);
      this.currentUserId = storedCurrId || null;
    }
  }

  private persist() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(TURFS_KEY, JSON.stringify(this.turfs));
      localStorage.setItem(MATCHES_KEY, JSON.stringify(this.matches));
      localStorage.setItem(ATTENDEES_KEY, JSON.stringify(this.attendees));
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(this.photos));
      localStorage.setItem(LOGS_KEY, JSON.stringify(this.logs));
      localStorage.setItem(EMAILS_KEY, JSON.stringify(this.emails));
      if (this.currentUserId) {
        localStorage.setItem(CURRENT_USER_ID_KEY, this.currentUserId);
      } else {
        localStorage.removeItem(CURRENT_USER_ID_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    this.notify();
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // ----------------- Cloud Function & Activity Logging (FR-42 to FR-51) -----------------
  private recordLog(params: {
    action: string;
    category: ActionCategory;
    targetType: string;
    targetId: string;
    matchId?: string | null;
    summary: string;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    customActor?: { uid: string; name: string; email: string; role: UserRole };
  }) {
    const actor = params.customActor || this.getActorInfo();
    const now = new Date();
    const expireDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months retention (FR-51)

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      actorUid: actor.uid,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: params.action,
      category: params.category,
      targetType: params.targetType,
      targetId: params.targetId,
      matchId: params.matchId || null,
      summary: params.summary,
      before: params.before || null,
      after: params.after || null,
      expireAt: expireDate.toISOString(),
    };

    this.logs.unshift(newLog);
    this.syncDocToFirestore('activityLogs', newLog.id, newLog);
  }

  private getActorInfo(): { uid: string; name: string; email: string; role: UserRole } {
    const user = this.getCurrentUser();
    if (!user) {
      return {
        uid: 'anonymous',
        name: 'Visitor',
        email: 'visitor@guest.local',
        role: 'player',
      };
    }
    return {
      uid: user.id,
      name: user.displayName,
      email: user.email,
      role: user.role,
    };
  }

  private sendEmailNotification(
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
    category: string,
    ignorePreference = false
  ) {
    const user = this.users.find((u) => u.email === recipientEmail);
    if (!ignorePreference && user && user.emailNotifications === false) {
      // User opted out
      this.emails.unshift({
        id: `em-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        recipientEmail,
        recipientName,
        subject,
        body,
        category,
        timestamp: new Date().toISOString(),
        status: 'opted_out',
      });
      return;
    }

    this.emails.unshift({
      id: `em-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      recipientEmail,
      recipientName,
      subject,
      body,
      category,
      timestamp: new Date().toISOString(),
      status: 'sent',
    });
  }

  // ----------------- Auto-Complete daemon (FR-26) -----------------
  public checkAutoComplete() {
    const now = new Date().getTime();
    let updated = false;

    this.matches.forEach((m) => {
      if (m.status === 'open') {
        const endTime = new Date(m.endAt).getTime();
        if (now > endTime) {
          m.status = 'completed';
          m.updatedAt = new Date().toISOString();
          updated = true;
          this.recordLog({
            action: 'match.autocomplete',
            category: 'match',
            targetType: 'match',
            targetId: m.id,
            matchId: m.id,
            summary: `Match at ${m.turfName} automatically marked as completed after end time`,
            before: { status: 'open' },
            after: { status: 'completed' },
            customActor: {
              uid: 'system',
              name: 'System Scheduler',
              email: 'system@wednesdayunited.local',
              role: 'system',
            },
          });
        }
      }
    });

    if (updated) {
      this.persist();
    }
  }

  // ----------------- Auth & Users (FR-01 to FR-07) -----------------
  public getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    const found = this.users.find(
      (u) =>
        u.id === this.currentUserId ||
        (isNasifUser(this.currentUserId) && isNasifUser(u.email, u.id))
    );
    if (found) {
      if (isNasifUser(found.email, found.id)) {
        found.role = 'admin';
      }
      return found;
    }
    // Guaranteed fallback: if session indicates Nasif admin, always resolve with admin role
    if (isNasifUser(this.currentUserId)) {
      const nasif = this.users.find((u) => isNasifUser(u.email, u.id)) || {
        ...INITIAL_USERS[0],
        id: this.currentUserId,
        email: this.currentUserId.includes('@') ? this.currentUserId : 'nasif.ishtiaque.islam@gmail.com',
      };
      nasif.role = 'admin';
      return nasif;
    }
    return null;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public signInWithPassword(email: string, password?: string): User {
    const cleanEmail = email.trim().toLowerCase();
    if (isNasifUser(cleanEmail)) {
      let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail || isNasifUser(u.email, u.id));
      if (!user) {
        user = {
          ...INITIAL_USERS[0],
          id: `user-${Date.now()}`,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
        };
        this.users.unshift(user);
      }
      user.role = 'admin';
      this.currentUserId = user.id;
      this.persist();
      try {
        this.syncDocToFirestore('users', user.id, user);
      } catch (e) {
        // ignore
      }

      this.recordLog({
        action: 'auth.sign_in',
        category: 'account',
        targetType: 'user',
        targetId: user.id,
        summary: `Admin Nasif signed in with credentials (${cleanEmail})`,
      });
      return user;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        displayName: cleanEmail.split('@')[0],
        email: cleanEmail,
        photoURL: '',
        preferredPosition: 'Any',
        role: 'player',
        emailNotifications: true,
        createdAt: new Date().toISOString(),
      };
      this.users.push(user);
      this.syncDocToFirestore('users', user.id, user);
    }
    this.currentUserId = user.id;
    this.persist();
    return user;
  }

  public async signInWithGoogleSSO(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const cleanEmail = (fbUser.email || '').trim().toLowerCase();
    const displayName = fbUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Player');
    const photoURL = fbUser.photoURL || '';

    const isAdmin = isNasifUser(cleanEmail, fbUser.uid);

    let user = this.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || (isAdmin && (u.id === 'user-nasif' || isNasifUser(u.email, u.id)))
    );

    if (!user) {
      user = {
        id: fbUser.uid,
        displayName,
        email: cleanEmail,
        photoURL: photoURL || '',
        preferredPosition: 'Any',
        role: isAdmin ? 'admin' : 'player',
        emailNotifications: true,
        createdAt: new Date().toISOString(),
      };
      this.users.unshift(user);
      await this.syncDocToFirestore('users', user.id, user);

      this.recordLog({
        action: 'auth.first_signup',
        category: 'account',
        targetType: 'user',
        targetId: user.id,
        summary: `${user.displayName} registered via Google SSO (${user.email})`,
        customActor: {
          uid: user.id,
          name: user.displayName,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      let changed = false;
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        changed = true;
      }
      if (photoURL && user.photoURL !== photoURL) {
        user.photoURL = photoURL;
        changed = true;
      }
      if (fbUser.displayName && user.displayName !== fbUser.displayName) {
        user.displayName = fbUser.displayName;
        changed = true;
      }
      if (changed) {
        await this.syncDocToFirestore('users', user.id, user);
      }
    }

    this.currentUserId = user.id;

    this.recordLog({
      action: 'auth.sign_in',
      category: 'account',
      targetType: 'user',
      targetId: user.id,
      summary: `${user.displayName} signed in via Google SSO (${user.email})`,
      customActor: {
        uid: user.id,
        name: user.displayName,
        email: user.email,
        role: user.role,
      },
    });

    this.persist();

    // If admin, also sync under Firebase Auth UID so Firestore Security Rules check passes
    if (isAdmin && fbUser.uid !== user.id) {
      try {
        await this.syncDocToFirestore('users', fbUser.uid, { ...user, id: fbUser.uid });
      } catch {
        // ignore
      }
    }

    return user;
  }

  public signInWithGoogle(email = 'player1@wednesdayunited.com', name = 'Player 1'): User {
    const cleanEmail = email.trim().toLowerCase();
    if (isNasifUser(cleanEmail)) {
      let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail || isNasifUser(u.email, u.id));
      if (!user) {
        user = {
          ...INITIAL_USERS[0],
          id: `user-${Date.now()}`,
          email: cleanEmail,
          displayName: name !== 'Player 1' ? name : cleanEmail.split('@')[0],
        };
        this.users.unshift(user);
      }
      user.role = 'admin';
      this.currentUserId = user.id;
      this.persist();
      return user;
    }

    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // First sign-in: FR-03
      // Standard member sign-in; role is player
      const role: 'player' | 'admin' = 'player';
      user = {
        id: `user-${Date.now()}`,
        displayName: name,
        email: cleanEmail,
        photoURL: '',
        preferredPosition: 'Any',
        role,
        emailNotifications: true,
        createdAt: new Date().toISOString(),
      };
      this.users.push(user);

      this.recordLog({
        action: 'auth.first_signup',
        category: 'account',
        targetType: 'user',
        targetId: user.id,
        summary: `${user.displayName} signed up with Google (${user.email})`,
        customActor: {
          uid: user.id,
          name: user.displayName,
          email: user.email,
          role: user.role,
        },
      });
    }

    this.currentUserId = user.id;

    this.recordLog({
      action: 'auth.sign_in',
      category: 'account',
      targetType: 'user',
      targetId: user.id,
      summary: `${user.displayName} signed in via Google SSO`,
      customActor: {
        uid: user.id,
        name: user.displayName,
        email: user.email,
        role: user.role,
      },
    });

    this.persist();
    return user;
  }

  public async signOut() {
    const user = this.getCurrentUser();
    if (user) {
      this.recordLog({
        action: 'auth.sign_out',
        category: 'account',
        targetType: 'user',
        targetId: user.id,
        summary: `${user.displayName} signed out`,
      });
    }
    this.currentUserId = null;
    this.persist();
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
  }

  public switchUser(userId: string) {
    const target = this.users.find((u) => u.id === userId);
    if (target) {
      this.currentUserId = target.id;
      this.persist();
    }
  }

  public updateUserProfile(
    userId: string,
    updates: {
      displayName?: string;
      preferredPosition?: PreferredPosition;
      emailNotifications?: boolean;
      photoURL?: string;
    }
  ) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    const before = {
      displayName: user.displayName,
      preferredPosition: user.preferredPosition,
      emailNotifications: user.emailNotifications,
      photoURL: user.photoURL,
    };

    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.preferredPosition !== undefined) user.preferredPosition = updates.preferredPosition;
    if (updates.emailNotifications !== undefined) user.emailNotifications = updates.emailNotifications;
    if (updates.photoURL !== undefined) user.photoURL = updates.photoURL;

    this.recordLog({
      action: 'account.profile_edit',
      category: 'account',
      targetType: 'user',
      targetId: user.id,
      summary: `${user.displayName} updated their profile settings`,
      before,
      after: { ...updates },
    });

    this.persist();
    this.syncDocToFirestore('users', user.id, user);
    return user;
  }

  public createUser(data: {
    displayName: string;
    email: string;
    preferredPosition?: PreferredPosition;
    role?: 'player' | 'admin';
  }): User {
    const curr = this.getCurrentUser();
    const isNasif = isNasifUser(curr?.email, curr?.id);
    if (!curr || (curr.role !== 'admin' && !isNasif)) {
      throw new Error('Only administrators can add new members');
    }

    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    const existing = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      displayName: data.displayName.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      photoURL: '',
      preferredPosition: data.preferredPosition || 'Any',
      role: data.role || 'player',
      emailNotifications: true,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.syncDocToFirestore('users', newUser.id, newUser);
    this.recordLog({
      action: 'user.create',
      category: 'users',
      targetType: 'user',
      targetId: newUser.id,
      summary: `${curr.displayName} created new user account for ${newUser.displayName} (${newUser.role})`,
    });
    this.persist();
    return newUser;
  }

  public deleteUser(userId: string) {
    const curr = this.getCurrentUser();
    const isNasif = isNasifUser(curr?.email, curr?.id);
    if (!curr || (curr.role !== 'admin' && !isNasif)) {
      throw new Error('Only administrators can delete user accounts');
    }
    if (curr.id === userId) {
      throw new Error('You cannot delete your own account');
    }
    const userIndex = this.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    const user = this.users[userIndex];
    if (isNasifUser(user.email, user.id)) {
      throw new Error('Cannot delete primary club administrator');
    }

    this.users.splice(userIndex, 1);
    this.deleteDocFromFirestore('users', userId);
    this.recordLog({
      action: 'user.delete',
      category: 'users',
      targetType: 'user',
      targetId: userId,
      summary: `${curr.displayName} deleted user account: ${user.displayName}`,
    });
    this.persist();
  }

  public updateUserRole(userId: string, newRole: 'player' | 'admin') {
    const curr = this.getCurrentUser();
    const isNasif = isNasifUser(curr?.email, curr?.id);
    if (!curr || (curr.role !== 'admin' && !isNasif)) {
      throw new Error('Only admins can change user roles (FR-05)');
    }
    if (curr.id === userId && newRole !== 'admin') {
      throw new Error('Admins cannot remove their own admin role (FR-05)');
    }

    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    if (isNasifUser(user.email, user.id) && newRole !== 'admin') {
      throw new Error('Cannot demote primary club administrator');
    }

    const oldRole = user.role;
    user.role = newRole;

    this.recordLog({
      action: 'user.role_change',
      category: 'users',
      targetType: 'user',
      targetId: user.id,
      summary: `${curr.displayName} changed ${user.displayName}'s role from ${oldRole} to ${newRole}`,
      before: { role: oldRole },
      after: { role: newRole },
    });

    this.persist();
    this.syncDocToFirestore('users', user.id, user);
    return user;
  }

  // ----------------- Turfs (FR-23, FR-24) -----------------
  public getTurfs(): Turf[] {
    return [...this.turfs];
  }

  public createTurf(data: { name: string; location: string; mapUrl: string }): Turf {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can create turfs');

    const now = new Date().toISOString();
    const newTurf: Turf = {
      id: `turf-${Date.now()}`,
      name: data.name,
      location: data.location,
      mapUrl: data.mapUrl,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.turfs.push(newTurf);
    this.syncDocToFirestore('turfs', newTurf.id, newTurf);

    this.recordLog({
      action: 'turf.create',
      category: 'turf',
      targetType: 'turf',
      targetId: newTurf.id,
      summary: `${curr.displayName} created new turf: ${newTurf.name}`,
      after: { name: newTurf.name, location: newTurf.location },
    });

    this.persist();
    return newTurf;
  }

  public updateTurf(turfId: string, data: Partial<{ name: string; location: string; mapUrl: string; isActive: boolean }>) {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can update turfs');

    const turf = this.turfs.find((t) => t.id === turfId);
    if (!turf) throw new Error('Turf not found');

    const before = { name: turf.name, location: turf.location, mapUrl: turf.mapUrl, isActive: turf.isActive };
    Object.assign(turf, data, { updatedAt: new Date().toISOString() });
    this.syncDocToFirestore('turfs', turf.id, turf);

    this.recordLog({
      action: 'turf.edit',
      category: 'turf',
      targetType: 'turf',
      targetId: turf.id,
      summary: `${curr.displayName} updated turf: ${turf.name}`,
      before,
      after: { ...data },
    });

    this.persist();
    return turf;
  }

  public deactivateTurf(turfId: string) {
    return this.updateTurf(turfId, { isActive: false });
  }

  public async deleteTurf(turfId: string) {
    const curr = this.getCurrentUser();
    const isNasif = isNasifUser(curr?.email, curr?.id);
    if (!curr || (curr.role !== 'admin' && !isNasif)) {
      throw new Error('Only administrators can delete turfs');
    }

    const turf = this.turfs.find((t) => t.id === turfId);
    if (!turf) {
      this.turfs = this.turfs.filter((t) => t.id !== turfId);
      this.persist();
      return;
    }

    // Automatically cancel any open matches scheduled at this venue
    let cancelledCount = 0;
    this.matches.forEach((m) => {
      if (m.turfId === turfId) {
        m.status = 'cancelled';
        m.notes = `${m.notes ? m.notes + ' | ' : ''}Venue "${turf.name}" was removed`;
        m.updatedAt = new Date().toISOString();
        this.syncDocToFirestore('matches', m.id, m);
        cancelledCount++;
      }
    });

    this.turfs = this.turfs.filter((t) => t.id !== turfId);
    this.persist();

    await this.deleteDocFromFirestore('turfs', turfId);

    this.recordLog({
      action: 'turf.delete',
      category: 'turf',
      targetType: 'turf',
      targetId: turfId,
      summary: `${curr.displayName} deleted turf venue: ${turf.name}${cancelledCount > 0 ? ` (${cancelledCount} matches cancelled)` : ''}`,
      before: { name: turf.name, location: turf.location },
    });

    this.persist();
  }

  // ----------------- Matches (FR-08 to FR-14, FR-22, FR-26) -----------------
  public getMatches(): Match[] {
    return [...this.matches].sort(
      (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
    );
  }

  public getMatch(matchId: string): Match | null {
    return this.matches.find((m) => m.id === matchId) || null;
  }

  public createMatch(params: {
    turfId: string;
    matchDate: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    feePerPlayer: number;
    notes?: string;
  }): Match {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can create matches (FR-22)');

    const turf = this.turfs.find((t) => t.id === params.turfId);
    if (!turf) throw new Error('Selected turf not found');

    const kickoffAt = createDhakaTimestamp(params.matchDate, params.startTime);
    const endAt = createDhakaTimestamp(params.matchDate, params.endTime);
    const now = new Date().toISOString();

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      turfId: turf.id,
      turfName: turf.name,
      turfLocation: turf.location,
      mapUrl: turf.mapUrl,
      matchDate: params.matchDate,
      startTime: params.startTime,
      endTime: params.endTime,
      kickoffAt,
      endAt,
      feePerPlayer: params.feePerPlayer,
      status: 'open',
      confirmedCount: 0,
      notes: params.notes || '',
      photoCount: 0,
      createdBy: curr.id,
      createdAt: now,
      updatedAt: now,
    };

    this.matches.push(newMatch);
    this.syncDocToFirestore('matches', newMatch.id, newMatch);

    this.recordLog({
      action: 'match.create',
      category: 'match',
      targetType: 'match',
      targetId: newMatch.id,
      matchId: newMatch.id,
      summary: `${curr.displayName} created match for ${newMatch.matchDate} at ${newMatch.turfName}`,
      after: {
        turfName: newMatch.turfName,
        matchDate: newMatch.matchDate,
        startTime: newMatch.startTime,
        feePerPlayer: newMatch.feePerPlayer,
      },
    });

    // FR-27: Email all users who have notifications on
    this.users
      .filter((u) => u.emailNotifications)
      .forEach((u) => {
        this.sendEmailNotification(
          u.email,
          u.displayName,
          `New Match: ${newMatch.matchDate} at ${newMatch.turfName}`,
          `A new football match is open for booking on ${newMatch.matchDate} (${newMatch.startTime} - ${newMatch.endTime}) at ${newMatch.turfName}. Entry fee: ৳${newMatch.feePerPlayer} BDT. Book your spot now!`,
          'match.create'
        );
      });

    this.persist();
    return newMatch;
  }

  public updateMatch(
    matchId: string,
    updates: Partial<{
      turfId: string;
      matchDate: string;
      startTime: string;
      endTime: string;
      feePerPlayer: number;
      notes: string;
      albumUrl: string;
    }>
  ): Match {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can edit matches');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const before = {
      turfName: match.turfName,
      matchDate: match.matchDate,
      startTime: match.startTime,
      endTime: match.endTime,
      feePerPlayer: match.feePerPlayer,
      notes: match.notes,
      albumUrl: match.albumUrl,
    };

    let timeOrVenueChanged = false;

    if (updates.turfId && updates.turfId !== match.turfId) {
      const newTurf = this.turfs.find((t) => t.id === updates.turfId);
      if (newTurf) {
        match.turfId = newTurf.id;
        match.turfName = newTurf.name;
        match.turfLocation = newTurf.location;
        match.mapUrl = newTurf.mapUrl;
        timeOrVenueChanged = true;
      }
    }

    if (updates.matchDate) match.matchDate = updates.matchDate;
    if (updates.startTime) match.startTime = updates.startTime;
    if (updates.endTime) match.endTime = updates.endTime;

    if (updates.matchDate || updates.startTime || updates.endTime) {
      match.kickoffAt = createDhakaTimestamp(match.matchDate, match.startTime);
      match.endAt = createDhakaTimestamp(match.matchDate, match.endTime);
      timeOrVenueChanged = true;
    }

    if (updates.feePerPlayer !== undefined) match.feePerPlayer = updates.feePerPlayer;
    if (updates.notes !== undefined) match.notes = updates.notes;
    if (updates.albumUrl !== undefined) match.albumUrl = updates.albumUrl;

    match.updatedAt = new Date().toISOString();

    this.recordLog({
      action: 'match.edit',
      category: 'match',
      targetType: 'match',
      targetId: match.id,
      matchId: match.id,
      summary: `${curr.displayName} edited match details for ${match.matchDate} at ${match.turfName}`,
      before,
      after: { ...updates },
    });

    // FR-28: If date, time or venue changed, email confirmed attendees and hosts
    if (timeOrVenueChanged) {
      const attendees = this.getAttendees(match.id).filter((a) => a.status === 'confirmed');
      const recipientIds = new Set<string>();

      attendees.forEach((a) => {
        if (a.userId) recipientIds.add(a.userId);
        if (a.hostUserId) recipientIds.add(a.hostUserId);
      });

      recipientIds.forEach((uid) => {
        const u = this.users.find((user) => user.id === uid);
        if (u) {
          this.sendEmailNotification(
            u.email,
            u.displayName,
            `Match Rescheduled: ${match.matchDate} at ${match.turfName}`,
            `The match details have changed. New schedule: ${match.matchDate} from ${match.startTime} to ${match.endTime} at ${match.turfName}.`,
            'match.rescheduled',
            true // Important match change email is always sent
          );
        }
      });
    }

    this.persist();
    this.syncDocToFirestore('matches', match.id, match);
    return match;
  }

  public cancelMatch(matchId: string, reason?: string): Match {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can cancel matches (BR-16)');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const beforeStatus = match.status;
    match.status = 'cancelled';
    if (reason) match.notes = `${match.notes ? match.notes + ' | ' : ''}Cancellation Reason: ${reason}`;
    match.updatedAt = new Date().toISOString();

    this.recordLog({
      action: 'match.cancel',
      category: 'match',
      targetType: 'match',
      targetId: match.id,
      matchId: match.id,
      summary: `${curr.displayName} cancelled match on ${match.matchDate} at ${match.turfName}`,
      before: { status: beforeStatus },
      after: { status: 'cancelled', reason },
    });

    // FR-28: Email all confirmed attendees & hosts
    const attendees = this.getAttendees(match.id).filter((a) => a.status === 'confirmed');
    const recipientIds = new Set<string>();
    attendees.forEach((a) => {
      if (a.userId) recipientIds.add(a.userId);
      if (a.hostUserId) recipientIds.add(a.hostUserId);
    });

    recipientIds.forEach((uid) => {
      const u = this.users.find((user) => user.id === uid);
      if (u) {
        this.sendEmailNotification(
          u.email,
          u.displayName,
          `MATCH CANCELLED: ${match.matchDate} at ${match.turfName}`,
          `The match on ${match.matchDate} has been cancelled by admin. Reason: ${reason || 'Not specified'}. Any paid fees will be refunded.`,
          'match.cancelled',
          true // Always sent
        );
      }
    });

    this.persist();
    this.syncDocToFirestore('matches', match.id, match);
    return match;
  }

  // ----------------- Attendees & Bookings (FR-09 to FR-18, BR-01 to BR-09) -----------------
  public getAttendees(matchId: string): Attendee[] {
    return this.attendees.filter((a) => a.matchId === matchId);
  }

  private recalculateConfirmedCount(matchId: string) {
    const match = this.matches.find((m) => m.id === matchId);
    if (match) {
      const count = this.attendees.filter((a) => a.matchId === matchId && a.status === 'confirmed').length;
      match.confirmedCount = count;
      match.updatedAt = new Date().toISOString();
    }
  }

  public bookMatch(matchId: string, userId: string): Attendee {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    if (match.status !== 'open') throw new Error('This match is no longer open for booking');

    // FR-11: Check active booking
    const existing = this.attendees.find(
      (a) => a.matchId === matchId && a.userId === userId && (a.status === 'confirmed' || a.status === 'pending_approval')
    );
    if (existing) {
      throw new Error('You already have an active booking for this match (FR-11)');
    }

    const now = new Date().toISOString();
    // FR-10: Booking is confirmed, not_paid, and player's preferred position is copied
    const attendee: Attendee = {
      id: user.id, // For players, attendeeId = player uid (Section 5.2)
      matchId,
      userId: user.id,
      name: user.displayName,
      isGuest: false,
      hostUserId: null,
      guestAddedByName: null,
      status: 'confirmed',
      paymentStatus: 'not_paid',
      paymentMethod: null,
      paymentRef: null,
      preferredPosition: user.preferredPosition,
      addedByAdmin: false,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
    };

    // Replace previous cancelled record if re-booking (FR-14)
    const prevIndex = this.attendees.findIndex((a) => a.matchId === matchId && a.id === user.id);
    if (prevIndex >= 0) {
      this.attendees[prevIndex] = attendee;
    } else {
      this.attendees.push(attendee);
    }

    this.recalculateConfirmedCount(matchId);

    this.recordLog({
      action: 'booking.create',
      category: 'booking',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: `${user.displayName} booked their spot for ${match.matchDate} at ${match.turfName}`,
      after: {
        name: attendee.name,
        preferredPosition: attendee.preferredPosition,
        status: 'confirmed',
        paymentStatus: 'not_paid',
      },
    });

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  public cancelBooking(matchId: string, attendeeId: string, customReason?: string): Attendee {
    const curr = this.getCurrentUser();
    if (!curr) throw new Error('Authentication required');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const attendee = this.attendees.find((a) => a.matchId === matchId && a.id === attendeeId);
    if (!attendee) throw new Error('Booking not found');

    const isAdmin = curr.role === 'admin';
    const isOwner = attendee.userId === curr.id || attendee.hostUserId === curr.id;

    if (!isAdmin && !isOwner) {
      throw new Error('Not authorized to cancel this booking');
    }

    // BR-05 & BR-08: 24-Hour Dropout Cutoff
    const cutoff = getCutoffStatus(match.kickoffAt);
    if (!isAdmin && cutoff.cutoffPassed) {
      // Record blocked attempt in activity log!
      this.recordLog({
        action: 'booking.cancel_blocked',
        category: 'booking',
        targetType: 'attendee',
        targetId: attendee.id,
        matchId,
        summary: `${curr.displayName} attempted to cancel spot for ${attendee.name} inside 24h cutoff (BLOCKED)`,
      });
      throw new Error(
        `Self-cancellation is locked. Kickoff is in ${Math.round(cutoff.hoursUntilKickoff)} hours (cutoff rule BR-05).`
      );
    }

    const now = new Date().toISOString();
    attendee.status = 'cancelled';
    attendee.cancelledAt = now;
    attendee.cancelledBy = curr.id;
    attendee.updatedAt = now;

    // BR-08: If the host cancels their own booking, all of their guests are cancelled too!
    if (!attendee.isGuest) {
      const guests = this.attendees.filter(
        (a) => a.matchId === matchId && a.hostUserId === attendee.userId && a.status !== 'cancelled'
      );
      guests.forEach((g) => {
        g.status = 'cancelled';
        g.cancelledAt = now;
        g.cancelledBy = curr.id;
        g.updatedAt = now;

        this.recordLog({
          action: 'guest.auto_cancelled',
          category: 'guest',
          targetType: 'attendee',
          targetId: g.id,
          matchId,
          summary: `Guest ${g.name} auto-cancelled because host ${attendee.name} cancelled their booking`,
        });
      });
    }

    this.recalculateConfirmedCount(matchId);

    const logSummary = isAdmin && !isOwner
      ? `Admin ${curr.displayName} removed ${attendee.name} from match on ${match.matchDate} (Override)`
      : `${curr.displayName} cancelled booking for ${attendee.name} on ${match.matchDate}`;

    this.recordLog({
      action: isAdmin && !isOwner ? 'roster.remove' : 'booking.cancel',
      category: 'booking',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: logSummary,
      before: { status: 'confirmed' },
      after: { status: 'cancelled', reason: customReason || null },
    });

    // FR-31: If removed by admin, email affected user/host
    if (isAdmin && !isOwner) {
      const emailTargetUid = attendee.userId || attendee.hostUserId;
      if (emailTargetUid) {
        const targetUser = this.users.find((u) => u.id === emailTargetUid);
        if (targetUser) {
          this.sendEmailNotification(
            targetUser.email,
            targetUser.displayName,
            `Removed from Match: ${match.matchDate} at ${match.turfName}`,
            `You or your guest (${attendee.name}) have been removed from the roster for ${match.matchDate} by an admin. Reason: ${customReason || 'Roster adjustment'}.`,
            'roster.removed_by_admin',
            true // Always sent
          );
        }
      }
    }

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  // ----------------- Guests (FR-15 to FR-18, BR-06 to BR-08) -----------------
  public requestGuest(
    matchId: string,
    guestName: string,
    preferredPosition: PreferredPosition = 'Any'
  ): Attendee {
    const curr = this.getCurrentUser();
    if (!curr) throw new Error('Sign-in required to bring guests');

    const hostBooking = this.attendees.find(
      (a) => a.matchId === matchId && a.userId === curr.id && a.status === 'confirmed'
    );
    if (!hostBooking) {
      throw new Error('You must have a confirmed booking yourself before requesting guests (BR-06)');
    }

    // BR-06 / FR-15: Up to 5 active guests per match
    const activeGuests = this.attendees.filter(
      (a) =>
        a.matchId === matchId &&
        a.hostUserId === curr.id &&
        (a.status === 'pending_approval' || a.status === 'confirmed')
    );

    if (activeGuests.length >= 5) {
      throw new Error('Maximum limit of 5 guests per player reached for this match (BR-06)');
    }

    const now = new Date().toISOString();
    const guestAttendee: Attendee = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      matchId,
      userId: null,
      name: guestName.trim(),
      isGuest: true,
      hostUserId: curr.id,
      guestAddedByName: curr.displayName,
      status: 'pending_approval', // BR-06
      paymentStatus: 'not_paid',
      paymentMethod: null,
      paymentRef: null,
      preferredPosition,
      addedByAdmin: false,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
    };

    this.attendees.push(guestAttendee);
    this.syncSubDocToFirestore(matchId, 'attendees', guestAttendee.id, guestAttendee);

    this.recordLog({
      action: 'guest.request',
      category: 'guest',
      targetType: 'attendee',
      targetId: guestAttendee.id,
      matchId,
      summary: `${curr.displayName} requested guest "${guestAttendee.name}" (+1) for match on ${hostBooking.name}`,
      after: {
        name: guestAttendee.name,
        hostUserId: curr.id,
        status: 'pending_approval',
      },
    });

    this.persist();
    return guestAttendee;
  }

  public approveGuest(matchId: string, attendeeId: string): Attendee {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can approve guests (BR-07)');

    const attendee = this.attendees.find((a) => a.matchId === matchId && a.id === attendeeId);
    if (!attendee || !attendee.isGuest) throw new Error('Guest not found');

    attendee.status = 'confirmed';
    attendee.updatedAt = new Date().toISOString();

    this.recalculateConfirmedCount(matchId);

    this.recordLog({
      action: 'guest.approve',
      category: 'guest',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: `${curr.displayName} approved guest ${attendee.name} (Host: ${attendee.guestAddedByName})`,
      before: { status: 'pending_approval' },
      after: { status: 'confirmed' },
    });

    // FR-29: Email the host
    if (attendee.hostUserId) {
      const host = this.users.find((u) => u.id === attendee.hostUserId);
      if (host) {
        this.sendEmailNotification(
          host.email,
          host.displayName,
          `Guest Approved: ${attendee.name}`,
          `Your guest request for ${attendee.name} has been approved by admin. They are now confirmed on the roster.`,
          'guest.approved'
        );
      }
    }

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  public rejectGuest(matchId: string, attendeeId: string, reason?: string): Attendee {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can reject guests (BR-07)');

    const attendee = this.attendees.find((a) => a.matchId === matchId && a.id === attendeeId);
    if (!attendee || !attendee.isGuest) throw new Error('Guest not found');

    const beforeStatus = attendee.status;
    attendee.status = 'rejected';
    attendee.updatedAt = new Date().toISOString();

    this.recalculateConfirmedCount(matchId);

    this.recordLog({
      action: 'guest.reject',
      category: 'guest',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: `${curr.displayName} rejected guest request ${attendee.name} (Host: ${attendee.guestAddedByName})`,
      before: { status: beforeStatus },
      after: { status: 'rejected', reason },
    });

    // FR-29: Email the host
    if (attendee.hostUserId) {
      const host = this.users.find((u) => u.id === attendee.hostUserId);
      if (host) {
        this.sendEmailNotification(
          host.email,
          host.displayName,
          `Guest Request Rejected: ${attendee.name}`,
          `Your guest request for ${attendee.name} was rejected. Note: ${reason || 'Capacity/roster constraint'}.`,
          'guest.rejected'
        );
      }
    }

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  // ----------------- Payments (FR-19 to FR-21, BR-10 to BR-12) -----------------
  public updatePayment(
    matchId: string,
    attendeeId: string,
    paymentStatus: PaymentStatus,
    paymentMethod: PaymentMethod | null,
    paymentRef: string | null
  ): Attendee {
    const curr = this.getCurrentUser();
    if (!curr) throw new Error('Sign-in required to update payments');

    const attendee = this.attendees.find((a) => a.matchId === matchId && a.id === attendeeId);
    if (!attendee) throw new Error('Attendee record not found');

    const isAdmin = curr.role === 'admin';
    const isOwner = attendee.userId === curr.id || attendee.hostUserId === curr.id;

    // BR-11: Only player can update own payment; host can update guest payment
    if (!isAdmin && !isOwner) {
      throw new Error('You can only update payment for yourself or your guests (BR-11)');
    }

    if (paymentStatus === 'paid' && !paymentMethod) {
      throw new Error('Selecting bKash or City Bank is required when marking as Paid (BR-10)');
    }

    const before = {
      paymentStatus: attendee.paymentStatus,
      paymentMethod: attendee.paymentMethod,
      paymentRef: attendee.paymentRef,
    };

    attendee.paymentStatus = paymentStatus;
    attendee.paymentMethod = paymentStatus === 'paid' ? paymentMethod : null;
    attendee.paymentRef = paymentStatus === 'paid' ? (paymentRef ? paymentRef.trim() : null) : null;
    attendee.updatedAt = new Date().toISOString();

    this.recordLog({
      action: 'payment.update',
      category: 'payment',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: `${curr.displayName} updated payment for ${attendee.name} to "${paymentStatus}" ${
        paymentMethod ? `via ${paymentMethod === 'bkash' ? 'bKash' : 'City Bank'}` : ''
      }${paymentRef ? ` (Ref: ${paymentRef})` : ''}`,
      before,
      after: {
        paymentStatus: attendee.paymentStatus,
        paymentMethod: attendee.paymentMethod,
        paymentRef: attendee.paymentRef,
      },
    });

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  // ----------------- Admin Force Add Attendee (BR-09, FR-25) -----------------
  public forceAddAttendee(
    matchId: string,
    params: {
      userId?: string | null;
      name: string;
      isGuest: boolean;
      hostUserId?: string | null;
      preferredPosition: PreferredPosition;
    }
  ): Attendee {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can force add attendees');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const now = new Date().toISOString();
    const id = params.userId || `admin-add-${Date.now()}`;

    const attendee: Attendee = {
      id,
      matchId,
      userId: params.userId || null,
      name: params.name,
      isGuest: params.isGuest,
      hostUserId: params.hostUserId || null,
      guestAddedByName: params.isGuest ? 'Admin Added' : null,
      status: 'confirmed',
      paymentStatus: 'not_paid',
      paymentMethod: null,
      paymentRef: null,
      preferredPosition: params.preferredPosition,
      addedByAdmin: true,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
    };

    const existingIdx = this.attendees.findIndex((a) => a.matchId === matchId && a.id === id);
    if (existingIdx >= 0) {
      this.attendees[existingIdx] = attendee;
    } else {
      this.attendees.push(attendee);
    }

    this.recalculateConfirmedCount(matchId);

    this.recordLog({
      action: 'roster.force_add',
      category: 'roster',
      targetType: 'attendee',
      targetId: attendee.id,
      matchId,
      summary: `${curr.displayName} force-added ${attendee.name} to roster for ${match.turfName}`,
      after: { name: attendee.name, position: attendee.preferredPosition },
    });

    this.persist();
    this.syncSubDocToFirestore(matchId, 'attendees', attendee.id, attendee);
    return attendee;
  }

  // ----------------- Photos & Gallery (FR-33 to FR-41, BR-20) -----------------
  public getPhotos(matchId: string): MatchPhoto[] {
    return this.photos
      .filter((p) => p.matchId === matchId)
      .sort((a, b) => a.order - b.order);
  }

  public uploadPhoto(
    matchId: string,
    photoData: {
      imageUrl: string;
      thumbUrl: string;
      width: number;
      height: number;
      caption?: string;
    }
  ): MatchPhoto {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can upload photos (FR-35)');

    const currentMatchPhotos = this.getPhotos(matchId);
    // FR-35: Max 5 photos per match
    if (currentMatchPhotos.length >= 5) {
      throw new Error('Maximum 5 photos. Delete one to add another. (FR-35)');
    }

    // Next slot number "1" to "5"
    const nextSlot = (currentMatchPhotos.length + 1).toString();
    const now = new Date().toISOString();

    const newPhoto: MatchPhoto = {
      id: nextSlot,
      matchId,
      imageUrl: photoData.imageUrl,
      thumbUrl: photoData.thumbUrl,
      storagePath: `matches/${matchId}/photos/${nextSlot}`,
      width: photoData.width,
      height: photoData.height,
      caption: photoData.caption || '',
      order: currentMatchPhotos.length + 1,
      addedBy: curr.id,
      addedAt: now,
    };

    this.photos.push(newPhoto);
    this.syncSubDocToFirestore(matchId, 'photos', newPhoto.id, newPhoto);

    // Update match photoCount and coverPhotoUrl if not set (FR-40)
    const match = this.matches.find((m) => m.id === matchId);
    if (match) {
      match.photoCount = currentMatchPhotos.length + 1;
      if (!match.coverPhotoUrl) {
        match.coverPhotoUrl = newPhoto.thumbUrl;
      }
      match.updatedAt = now;
    }

    this.recordLog({
      action: 'photo.upload',
      category: 'gallery',
      targetType: 'photo',
      targetId: newPhoto.id,
      matchId,
      summary: `${curr.displayName} uploaded photo #${newPhoto.order} for match at ${match?.turfName || matchId}`,
      after: { slot: nextSlot, caption: newPhoto.caption },
    });

    this.persist();
    if (match) this.syncDocToFirestore('matches', match.id, match);
    return newPhoto;
  }

  public deletePhoto(matchId: string, photoId: string) {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can delete photos (FR-38)');

    const photoIndex = this.photos.findIndex((p) => p.matchId === matchId && p.id === photoId);
    if (photoIndex === -1) throw new Error('Photo not found');

    const deleted = this.photos[photoIndex];
    this.photos.splice(photoIndex, 1);
    this.deleteSubDocFromFirestore(matchId, 'photos', deleted.id);

    // Re-index remaining photos order 1 to n
    const remaining = this.getPhotos(matchId);
    remaining.forEach((p, idx) => {
      p.order = idx + 1;
      p.id = (idx + 1).toString();
    });

    const match = this.matches.find((m) => m.id === matchId);
    if (match) {
      match.photoCount = remaining.length;
      if (remaining.length > 0) {
        // If the cover photo was deleted, use first remaining
        match.coverPhotoUrl = remaining[0].thumbUrl;
      } else {
        match.coverPhotoUrl = undefined;
      }
      match.updatedAt = new Date().toISOString();
      this.syncDocToFirestore('matches', match.id, match);
    }

    this.recordLog({
      action: 'photo.delete',
      category: 'gallery',
      targetType: 'photo',
      targetId: deleted.id,
      matchId,
      summary: `${curr.displayName} deleted photo #${deleted.order} from match gallery`,
      before: { caption: deleted.caption },
    });

    this.persist();
  }

  public updatePhotoCaption(matchId: string, photoId: string, caption: string) {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can edit captions');

    const photo = this.photos.find((p) => p.matchId === matchId && p.id === photoId);
    if (!photo) throw new Error('Photo not found');

    const before = { caption: photo.caption };
    photo.caption = caption;

    this.recordLog({
      action: 'photo.caption_edit',
      category: 'gallery',
      targetType: 'photo',
      targetId: photo.id,
      matchId,
      summary: `${curr.displayName} edited caption for photo #${photo.order}`,
      before,
      after: { caption },
    });

    this.persist();
    this.syncSubDocToFirestore(matchId, 'photos', photo.id, photo);
  }

  public setCoverPhoto(matchId: string, photoThumbUrl: string) {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can set cover photos');

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    match.coverPhotoUrl = photoThumbUrl;
    match.updatedAt = new Date().toISOString();

    this.recordLog({
      action: 'gallery.cover_change',
      category: 'gallery',
      targetType: 'match',
      targetId: match.id,
      matchId,
      summary: `${curr.displayName} changed the match cover photo`,
    });

    this.persist();
    this.syncDocToFirestore('matches', match.id, match);
  }

  public setAlbumUrl(matchId: string, albumUrl: string) {
    const curr = this.getCurrentUser();
    if (!curr || curr.role !== 'admin') throw new Error('Only admins can set album url (FR-39)');

    if (albumUrl && !albumUrl.startsWith('https://')) {
      throw new Error('Album URL must start with https:// (FR-39)');
    }

    const match = this.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const before = { albumUrl: match.albumUrl };
    match.albumUrl = albumUrl.trim() || undefined;
    match.updatedAt = new Date().toISOString();

    this.recordLog({
      action: 'gallery.album_url_update',
      category: 'gallery',
      targetType: 'match',
      targetId: match.id,
      matchId,
      summary: `${curr.displayName} updated the external album link`,
      before,
      after: { albumUrl: match.albumUrl },
    });

    this.persist();
    this.syncDocToFirestore('matches', match.id, match);
  }

  // ----------------- Activity Log & Notifications (FR-42 to FR-51) -----------------
  public getActivityLogs(filters?: {
    search?: string;
    category?: string;
    actorUid?: string;
    matchId?: string;
    startDate?: string;
    endDate?: string;
  }): ActivityLog[] {
    let result = [...this.logs];

    if (!filters) return result;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.summary.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.targetType.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== 'all') {
      result = result.filter((l) => l.category === filters.category);
    }

    if (filters.actorUid && filters.actorUid !== 'all') {
      result = result.filter((l) => l.actorUid === filters.actorUid);
    }

    if (filters.matchId && filters.matchId !== 'all') {
      result = result.filter((l) => l.matchId === filters.matchId);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((l) => new Date(l.timestamp).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime() + 86400000;
      result = result.filter((l) => new Date(l.timestamp).getTime() <= end);
    }

    return result;
  }

  public getEmails(): EmailNotification[] {
    return [...this.emails];
  }

  public resetAllToSeed() {
    this.users = [...INITIAL_USERS];
    this.turfs = [...INITIAL_TURFS];
    this.matches = [...INITIAL_MATCHES];
    this.attendees = [...INITIAL_ATTENDEES];
    this.photos = [...INITIAL_PHOTOS];
    this.logs = [...INITIAL_ACTIVITY_LOGS];
    this.emails = [...INITIAL_EMAILS];
    this.currentUserId = null;
    this.persist();
  }
}

export const store = new Store();

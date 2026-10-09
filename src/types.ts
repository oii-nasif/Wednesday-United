/**
 * Wednesday United - Types and Interfaces
 * Specification Version 1.0 (1 October 2026)
 */

export type PreferredPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' | 'Any';

export function isNasifUser(email?: string | null, id?: string | null): boolean {
  if (id === 'user-nasif') return true;
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'nasif.bs1062@gmail.com' ||
    clean === 'nasif.ishtiaque.islam@gmail.com' ||
    clean.startsWith('nasif.') ||
    clean.startsWith('nasif@') ||
    clean.includes('nasif')
  );
}

export type UserRole = 'player' | 'admin' | 'system';

export type MatchStatus = 'open' | 'completed' | 'cancelled';

export type AttendeeStatus = 'confirmed' | 'pending_approval' | 'rejected' | 'cancelled';

export type PaymentStatus = 'paid' | 'not_paid';

export type PaymentMethod = 'bkash' | 'city_bank';

export interface User {
  id: string; // Firebase Auth UID
  displayName: string;
  email: string;
  photoURL: string;
  preferredPosition: PreferredPosition;
  role: 'player' | 'admin';
  emailNotifications: boolean;
  createdAt: string; // ISO
}

export interface Turf {
  id: string;
  name: string;
  location: string;
  mapUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchPhoto {
  id: string; // "1" to "5"
  matchId: string;
  imageUrl: string; // Full resized image (longest side 2048px)
  thumbUrl: string; // 400px thumbnail
  storagePath: string;
  width: number;
  height: number;
  caption: string;
  order: number; // 1 to 5
  addedBy: string; // Admin uid
  addedAt: string;
}

export interface Match {
  id: string;
  turfId: string;
  turfName: string;
  turfLocation: string;
  mapUrl: string;
  matchDate: string; // YYYY-MM-DD (Asia/Dhaka)
  startTime: string; // HH:mm 24h
  endTime: string; // HH:mm 24h
  kickoffAt: string; // ISO Timestamp UTC
  endAt: string; // ISO Timestamp UTC
  feePerPlayer: number; // BDT
  status: MatchStatus;
  confirmedCount: number;
  notes?: string;
  photoCount: number; // 0 to 5
  coverPhotoUrl?: string;
  albumUrl?: string; // external https link
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  id: string; // player uid or auto-generated for guest
  matchId: string;
  userId: string | null; // player uid, null for guests
  name: string;
  isGuest: boolean;
  hostUserId: string | null; // uid of host
  guestAddedByName: string | null;
  status: AttendeeStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paymentRef: string | null;
  preferredPosition: PreferredPosition;
  addedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
}

export type ActionCategory = 
  | 'account'
  | 'booking'
  | 'guest'
  | 'payment'
  | 'match'
  | 'roster'
  | 'turf'
  | 'gallery'
  | 'users'
  | 'system';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  category: ActionCategory;
  targetType: string;
  targetId: string;
  matchId: string | null;
  summary: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  expireAt: string; // ISO (12 months retention)
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  category: string;
  timestamp: string;
  status: 'sent' | 'queued' | 'opted_out';
}

import { Match, Turf, User, Attendee, MatchPhoto, ActivityLog, EmailNotification } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-nasif',
    displayName: 'Nasif',
    email: 'nasif.bs1062@gmail.com',
    photoURL: '',
    preferredPosition: 'Midfielder',
    role: 'admin',
    emailNotifications: true,
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_TURFS: Turf[] = [
  {
    id: 'turf-1',
    name: 'Arena 7 Turf',
    location: 'Plot 12, Road 103, Gulshan-2, Dhaka',
    mapUrl: 'https://maps.google.com/maps?q=Gulshan+2+Dhaka&t=&z=15&ie=UTF8&iwloc=&output=embed',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'turf-2',
    name: 'Jaflong Turf Stadium',
    location: 'House 45, Block D, Bashundhara R/A, Dhaka',
    mapUrl: 'https://maps.google.com/maps?q=Bashundhara+Residential+Area+Dhaka&t=&z=15&ie=UTF8&iwloc=&output=embed',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'turf-3',
    name: 'Daffodil Football Turf',
    location: 'Mirpur 10 Circle, Dhaka',
    mapUrl: 'https://maps.google.com/maps?q=Mirpur+10+Dhaka&t=&z=15&ie=UTF8&iwloc=&output=embed',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'turf-4',
    name: 'United City Arena',
    location: 'Madani Avenue, 100 Feet, Badda, Dhaka',
    mapUrl: 'https://maps.google.com/maps?q=United+City+Badda+Dhaka&t=&z=15&ie=UTF8&iwloc=&output=embed',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const INITIAL_MATCHES: Match[] = [];

export const INITIAL_ATTENDEES: Attendee[] = [];

export const INITIAL_PHOTOS: MatchPhoto[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-init-1',
    timestamp: new Date().toISOString(),
    actorUid: 'user-nasif',
    actorName: 'Nasif',
    actorEmail: 'nasif.bs1062@gmail.com',
    actorRole: 'admin',
    action: 'account.init',
    category: 'account',
    targetType: 'user',
    targetId: 'user-nasif',
    matchId: null,
    summary: 'System initialized with Nasif (nasif.bs1062@gmail.com) as administrator',
    before: null,
    after: {
      email: 'nasif.bs1062@gmail.com',
      role: 'admin',
    },
    expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const INITIAL_EMAILS: EmailNotification[] = [];

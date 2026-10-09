import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ClubLogo } from './ClubLogo';
import {
  ShieldAlert,
  Calendar,
  MapPin,
  Users,
  Clock,
  Check,
  X,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CreditCard,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { formatDhakaDate, formatDhakaTime, formatDhakaDateTime } from '../utils/date';
import { exportActivityLogsToCSV } from '../utils/csv';
import { ActivityLog } from '../types';
import { UserManagement } from './UserManagement';

export const AdminHub: React.FC = () => {
  const {
    currentUser,
    adminSubTab,
    setAdminSubTab,
    matches,
    turfs,
    users,
    attendees,
    activityLogs,
    createMatch,
    cancelMatch,
    createTurf,
    updateTurf,
    deactivateTurf,
    deleteTurf,
    approveGuest,
    rejectGuest,
    updateUserRole,
    activityFilterMatchId,
    activityFilterActorUid,
    setSelectedMatchId,
    showToast,
    openSignInModal,
  } = useApp();

  const [turfToDelete, setTurfToDelete] = useState<{ id: string; name: string } | null>(null);

  // Access barrier (FR-45)
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-xs text-zinc-500 mt-2 mb-4">
          The Admin Hub is reserved for Wednesday United club administrators. Please sign in with an authorized administrator account.
        </p>
        <button
          onClick={openSignInModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  // --- SubTab 1: Match Creation Form State (FR-22, FR-23) ---
  const [matchTurfId, setMatchTurfId] = useState(turfs[0]?.id || '');
  const [matchDate, setMatchDate] = useState('2026-10-28');
  const [matchStartTime, setMatchStartTime] = useState('20:00');
  const [matchEndTime, setMatchEndTime] = useState('22:00');
  const [matchFee, setMatchFee] = useState<number>(400);
  const [matchNotes, setMatchNotes] = useState('');

  // Inline "Add New Turf" inside match form (FR-23)
  const [showInlineNewTurf, setShowInlineNewTurf] = useState(false);
  const [inlineTurfName, setInlineTurfName] = useState('');
  const [inlineTurfLocation, setInlineTurfLocation] = useState('');
  const [inlineTurfMapUrl, setInlineTurfMapUrl] = useState('');

  const handleSaveInlineTurf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTurfName.trim() || !inlineTurfLocation.trim()) return;
    const newT = createTurf({
      name: inlineTurfName.trim(),
      location: inlineTurfLocation.trim(),
      mapUrl:
        inlineTurfMapUrl.trim() ||
        `https://maps.google.com/maps?q=${encodeURIComponent(inlineTurfLocation)}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
    });
    setMatchTurfId(newT.id);
    setShowInlineNewTurf(false);
    setInlineTurfName('');
    setInlineTurfLocation('');
    setInlineTurfMapUrl('');
  };

  const handleCreateMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMatch({
      turfId: matchTurfId,
      matchDate,
      startTime: matchStartTime,
      endTime: matchEndTime,
      feePerPlayer: matchFee,
      notes: matchNotes,
    });
    setMatchNotes('');
  };

  // --- SubTab 2: Turf Management State (FR-24) ---
  const [showNewTurfModal, setShowNewTurfModal] = useState(false);
  const [turfName, setTurfName] = useState('');
  const [turfLocation, setTurfLocation] = useState('');
  const [turfMapUrl, setTurfMapUrl] = useState('');

  const handleCreateTurfModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turfName.trim() || !turfLocation.trim()) return;
    createTurf({
      name: turfName.trim(),
      location: turfLocation.trim(),
      mapUrl:
        turfMapUrl.trim() ||
        `https://maps.google.com/maps?q=${encodeURIComponent(turfLocation)}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
    });
    setTurfName('');
    setTurfLocation('');
    setTurfMapUrl('');
    setShowNewTurfModal(false);
  };

  // --- SubTab 3: Pending Guest Approvals Queue (FR-17) ---
  const allPendingGuests = attendees
    .filter((a) => a.isGuest && a.status === 'pending_approval')
    .map((g) => {
      const match = matches.find((m) => m.id === g.matchId);
      return { guest: g, match };
    });

  // --- SubTab 5: Activity Log State & Filters (FR-46 to FR-51) ---
  const [logSearch, setLogSearch] = useState('');
  const [logCategory, setLogCategory] = useState<string>('all');
  const [logActorUid, setLogActorUid] = useState<string>(activityFilterActorUid || 'all');
  const [logMatchId, setLogMatchId] = useState<string>(activityFilterMatchId || 'all');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [displayCount, setDisplayCount] = useState<number>(50); // FR-46 50 per page
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<ActivityLog | null>(null);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const matchSearch =
          log.summary.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }
      if (logCategory !== 'all' && log.category !== logCategory) return false;
      if (logActorUid !== 'all' && log.actorUid !== logActorUid) return false;
      if (logMatchId !== 'all' && log.matchId !== logMatchId) return false;
      if (logStartDate) {
        if (new Date(log.timestamp).getTime() < new Date(logStartDate).getTime()) return false;
      }
      if (logEndDate) {
        if (new Date(log.timestamp).getTime() > new Date(logEndDate).getTime() + 86400000) return false;
      }
      return true;
    });
  }, [activityLogs, logSearch, logCategory, logActorUid, logMatchId, logStartDate, logEndDate]);

  const pagedLogs = filteredLogs.slice(0, displayCount);

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <ClubLogo size="md" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
              <span>Administrator Control Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Wednesday <span className="text-blue-600 dark:text-blue-400">United</span> Operations
            </h1>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setAdminSubTab('matches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            adminSubTab === 'matches'
              ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Match Scheduling
        </button>

        <button
          onClick={() => setAdminSubTab('guests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            adminSubTab === 'guests'
              ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Guest Queue
          {allPendingGuests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-extrabold">
              {allPendingGuests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminSubTab('turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            adminSubTab === 'turfs'
              ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" /> Turfs & Venues
        </button>

        <button
          onClick={() => setAdminSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            adminSubTab === 'users'
              ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Roles & Access
        </button>

        <button
          onClick={() => setAdminSubTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            adminSubTab === 'activity'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Activity Log (Audit Trail)
        </button>
      </div>

      {/* --- SUBTAB: MATCHES --- */}
      {adminSubTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Match Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <span>Create New Match</span>
            </h2>

            <form onSubmit={handleCreateMatchSubmit} className="space-y-3.5">
              {/* Turf dropdown with inline "Add new turf" */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Saved Turf Venue *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineNewTurf(!showInlineNewTurf)}
                    className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    {showInlineNewTurf ? 'Hide Form' : '+ Add New Turf'}
                  </button>
                </div>

                {showInlineNewTurf ? (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-blue-500/40 space-y-2 mb-2 text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                      Quick Save Turf
                    </span>
                    <input
                      type="text"
                      placeholder="Turf Name (e.g. Arena 7 Turf)"
                      value={inlineTurfName}
                      onChange={(e) => setInlineTurfName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Gulshan-2, Dhaka)"
                      value={inlineTurfLocation}
                      onChange={(e) => setInlineTurfLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={handleSaveInlineTurf}
                      className="w-full py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                    >
                      Save Turf & Select
                    </button>
                  </div>
                ) : (
                  <select
                    value={matchTurfId}
                    onChange={(e) => setMatchTurfId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                  >
                    {turfs
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.location})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Match Date (YYYY-MM-DD, Asia/Dhaka) *
                </label>
                <input
                  type="date"
                  required
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={matchStartTime}
                    onChange={(e) => setMatchStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={matchEndTime}
                    onChange={(e) => setMatchEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Fee per Player (BDT) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={matchFee}
                  onChange={(e) => setMatchFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Admin Notes / Jersey Requirements
                </label>
                <textarea
                  rows={2}
                  value={matchNotes}
                  onChange={(e) => setMatchNotes(e.target.value)}
                  placeholder="e.g. Bring white and black jerseys for squad split."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition"
              >
                Create & Announce Match
              </button>
            </form>
          </div>

          {/* Existing Matches List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">All Scheduled Sessions</h2>
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-zinc-900 dark:text-white">
                        {m.turfName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          m.status === 'open'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : m.status === 'completed'
                            ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{formatDhakaDate(m.kickoffAt)}</span>
                      <span>•</span>
                      <span>
                        {formatDhakaTime(m.kickoffAt)} - {formatDhakaTime(m.endAt)}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        {m.confirmedCount} Attending (৳{m.feePerPlayer} BDT)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedMatchId(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Manage Match
                    </button>
                    {m.status === 'open' && (
                      <button
                        onClick={() => cancelMatch(m.id, 'Cancelled via admin hub')}
                        className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB: GUESTS QUEUE (FR-17) --- */}
      {adminSubTab === 'guests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Pending Guest Requests Queue ({allPendingGuests.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Guests do not appear on confirmed rosters until approved by an admin.
              </p>
            </div>
          </div>

          {allPendingGuests.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Check className="w-10 h-10 text-orange-500 mx-auto mb-2" />
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">All Caught Up!</h3>
              <p className="text-xs text-zinc-500 mt-1">There are no pending guest approval requests in the queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allPendingGuests.map(({ guest, match }) => (
                <div
                  key={guest.id}
                  className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">{guest.name}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mt-1 inline-block">
                          Position: {guest.preferredPosition}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Pending
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      <p>
                        Host Player: <span className="font-bold text-zinc-900 dark:text-white">{guest.guestAddedByName}</span>
                      </p>
                      <p>
                        Match: <span className="font-bold">{match?.turfName}</span> on{' '}
                        {match ? formatDhakaDate(match.kickoffAt) : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => approveGuest(guest.matchId, guest.id)}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Approve Guest
                    </button>
                    <button
                      onClick={() => rejectGuest(guest.matchId, guest.id, 'Roster capacity')}
                      className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold text-xs hover:bg-red-100 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SUBTAB: TURFS --- */}
      {adminSubTab === 'turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Saved Turfs & Venues</h2>
              <p className="text-xs text-zinc-500">
                Create, edit and manage turf venues. Embedded Google Maps links are stored here.
              </p>
            </div>
            <button
              onClick={() => setShowNewTurfModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add New Turf
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {turfs.map((t) => (
              <div
                key={t.id}
                className={`p-5 rounded-3xl border bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between gap-4 ${
                  t.isActive
                    ? 'border-zinc-200 dark:border-zinc-800'
                    : 'border-zinc-300 dark:border-zinc-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{t.name}</h3>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        t.isActive
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.location}</span>
                  </p>

                  {/* Embedded map mini-preview (BR-14) */}
                  <div className="mt-3 h-32 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <iframe
                      src={t.mapUrl}
                      title={t.name}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <a
                    href={t.mapUrl.replace('&output=embed', '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Maps
                  </a>

                  <div className="flex items-center gap-2">
                    {t.isActive ? (
                      <button
                        onClick={() => deactivateTurf(t.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTurf(t.id, { isActive: true })}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition cursor-pointer"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => setTurfToDelete({ id: t.id, name: t.name })}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center gap-1 cursor-pointer"
                      title="Delete turf venue permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delete Turf Confirmation Modal */}
          {turfToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <h3 className="font-bold text-base">Delete Turf Venue</h3>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong className="text-zinc-900 dark:text-white">"{turfToDelete.name}"</strong>? This will permanently remove this venue from the saved turfs list.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTurfToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!turfToDelete) return;
                      const id = turfToDelete.id;
                      setTurfToDelete(null);
                      try {
                        await deleteTurf(id);
                      } catch {
                        // Toast handled in AppContext
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Yes, Delete Turf
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Turf Modal */}
          {showNewTurfModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <form
                onSubmit={handleCreateTurfModal}
                className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">Add New Turf Venue</h3>
                  <button type="button" onClick={() => setShowNewTurfModal(false)} className="text-zinc-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Turf Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arena 7 Turf"
                      value={turfName}
                      onChange={(e) => setTurfName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Address / Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Plot 12, Road 103, Gulshan-2, Dhaka"
                      value={turfLocation}
                      onChange={(e) => setTurfLocation(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Google Maps Link (Embed or Share URL)
                    </label>
                    <input
                      type="text"
                      placeholder="https://maps.google.com/..."
                      value={turfMapUrl}
                      onChange={(e) => setTurfMapUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTurfModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Save Turf
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* --- SUBTAB: USERS & ROLES (FR-05) --- */}
      {adminSubTab === 'users' && (
        <UserManagement embedded />
      )}

      {/* --- SUBTAB: ACTIVITY LOG (FR-42 to FR-51, BR-21) --- */}
      {adminSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  System Activity Log & Audit Trail
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Immutable system audit records with 12-month retention.
              </p>
            </div>

            {/* Export CSV Button (FR-50) */}
            <button
              onClick={() => exportActivityLogsToCSV(filteredLogs)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 self-start sm:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Filtered CSV ({filteredLogs.length})</span>
            </button>
          </div>

          {/* Filter Bar (FR-47) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Search text */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search summary or person..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                />
              </div>

              {/* Action category filter */}
              <div>
                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="all">All Action Categories</option>
                  <option value="booking">Bookings</option>
                  <option value="guest">Guests</option>
                  <option value="payment">Payments</option>
                  <option value="match">Matches</option>
                  <option value="roster">Roster Overrides</option>
                  <option value="turf">Turfs</option>
                  <option value="gallery">Gallery Photos</option>
                  <option value="users">User Roles</option>
                  <option value="account">Account Auth</option>
                  <option value="system">System Jobs</option>
                </select>
              </div>

              {/* Person filter */}
              <div>
                <select
                  value={logActorUid}
                  onChange={(e) => setLogActorUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="all">All Persons</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                  <option value="system">System Scheduler</option>
                </select>
              </div>

              {/* Match filter */}
              <div>
                <select
                  value={logMatchId}
                  onChange={(e) => setLogMatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="all">All Matches</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.turfName} ({m.matchDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear filters button if active */}
            {(logSearch || logCategory !== 'all' || logActorUid !== 'all' || logMatchId !== 'all') && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setLogSearch('');
                    setLogCategory('all');
                    setLogActorUid('all');
                    setLogMatchId('all');
                  }}
                  className="text-xs text-blue-700 dark:text-blue-400 font-bold hover:underline"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* Activity Log List (FR-46) */}
          <div className="space-y-2">
            {pagedLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity records match the selected filter.</p>
              </div>
            ) : (
              pagedLogs.map((log) => {
                const categoryColors: Record<string, string> = {
                  booking: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                  guest: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                  payment: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                  match: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                  roster: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                  gallery: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
                  users: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
                  account: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
                };

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-[11px] text-zinc-400 font-mono shrink-0 pt-0.5 sm:pt-0">
                        {formatDhakaDateTime(log.timestamp)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              categoryColors[log.category] || 'bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {log.category}
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-white truncate">
                            {log.actorName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">({log.actorRole})</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                          {log.summary}
                        </p>
                      </div>
                    </div>

                    {/* Diff Viewer Button (FR-48) */}
                    {(log.before || log.after) && (
                      <button
                        onClick={() => setSelectedLogForDiff(log)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold shrink-0 self-end sm:self-auto flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Diff</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {/* Load more (FR-46) */}
            {filteredLogs.length > displayCount && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 50)}
                  className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                >
                  Load Next 50 Records ({filteredLogs.length - displayCount} remaining)
                </button>
              </div>
            )}
          </div>

          {/* Before / After Diff Modal (FR-48) */}
          {selectedLogForDiff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Audit Diff: {selectedLogForDiff.action}
                  </h3>
                  <button onClick={() => setSelectedLogForDiff(null)} className="text-zinc-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-bold">Summary:</span> {selectedLogForDiff.summary}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-red-600 dark:text-red-400 block mb-1">State Before:</span>
                    <pre className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl overflow-x-auto text-[11px] font-mono h-48 border border-zinc-200 dark:border-zinc-700">
                      {selectedLogForDiff.before
                        ? JSON.stringify(selectedLogForDiff.before, null, 2)
                        : '(Initial creation / No prior state)'}
                    </pre>
                  </div>

                  <div>
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">State After:</span>
                    <pre className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl overflow-x-auto text-[11px] font-mono h-48 border border-zinc-200 dark:border-zinc-700">
                      {selectedLogForDiff.after
                        ? JSON.stringify(selectedLogForDiff.after, null, 2)
                        : '(Deleted / Cleared)'}
                    </pre>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedLogForDiff(null)}
                    className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

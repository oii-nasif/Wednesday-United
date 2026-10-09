import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClubLogo } from './ClubLogo';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Search,
  Camera,
  PlusCircle,
} from 'lucide-react';
import { formatDhakaDate, formatDhakaTime, getCutoffStatus, formatTimeUntil } from '../utils/date';

export const MatchesList: React.FC = () => {
  const { matches, turfs, setSelectedMatchId, currentUser, attendees, setCurrentTab, setAdminSubTab } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedTurf, setSelectedTurf] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const now = new Date();

  // Filter matches
  const filteredMatches = matches
    .filter((m) => {
      if (activeTab === 'upcoming') {
        return m.status === 'open' && new Date(m.endAt).getTime() > now.getTime();
      } else {
        return m.status === 'completed' || m.status === 'cancelled' || new Date(m.endAt).getTime() <= now.getTime();
      }
    })
    .filter((m) => {
      if (selectedTurf !== 'all' && m.turfId !== selectedTurf) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.turfName.toLowerCase().includes(q) ||
          m.turfLocation.toLowerCase().includes(q) ||
          m.matchDate.includes(q) ||
          (m.notes && m.notes.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.kickoffAt).getTime();
      const timeB = new Date(b.kickoffAt).getTime();
      return activeTab === 'upcoming' ? timeA - timeB : timeB - timeA;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Compact Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-slate-950 text-white px-5 py-4 sm:px-6 sm:py-5 shadow-lg border border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10 flex items-center gap-4">
          <ClubLogo size="lg" className="shrink-0" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold uppercase tracking-wider mb-1">
              Official Match Days
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Wednesday United Football Club
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 mt-0.5">
              Open squad after-office football sessions & turf booking
            </p>
          </div>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setCurrentTab('admin');
              setAdminSubTab('matches');
            }}
            className="relative z-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/30 transition shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Create Match</span>
          </button>
        )}

        {/* Decorative background grid pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Upcoming vs Past Tabs */}
        <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'upcoming'
                ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Upcoming Matches
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'past'
                ? 'bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Past Matches & Gallery
          </button>
        </div>

        {/* Search & Turf filters */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search venue or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-blue-600"
            />
          </div>

          <select
            value={selectedTurf}
            onChange={(e) => setSelectedTurf(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-blue-600"
          >
            <option value="all">All Turfs</option>
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match Cards Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          <Calendar className="w-12 h-12 text-zinc-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No matches scheduled yet</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'There are currently no scheduled matches. As administrator, you can schedule your first match session now.'
              : 'No past matches recorded yet.'}
          </p>
          {currentUser?.role === 'admin' && activeTab === 'upcoming' && (
            <button
              onClick={() => {
                setCurrentTab('admin');
                setAdminSubTab('matches');
              }}
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-500 transition"
            >
              + Create First Match Day
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.map((match) => {
            const cutoff = getCutoffStatus(match.kickoffAt, now);
            const isUserBooked =
              currentUser &&
              attendees.some(
                (a) => a.matchId === match.id && a.userId === currentUser.id && a.status === 'confirmed'
              );

            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatchId(match.id)}
                className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-500/60 transition-all duration-200 flex flex-col"
              >
                {/* Card Image Cover (FR-40) */}
                <div className="relative h-44 bg-zinc-800 overflow-hidden">
                  {match.coverPhotoUrl ? (
                    <img
                      src={match.coverPhotoUrl}
                      alt={match.turfName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-slate-900 to-zinc-900 text-zinc-400">
                      <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-500/20 flex items-center justify-center mb-2">
                        <MapPin className="w-6 h-6 text-orange-400" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        {match.turfName}
                      </span>
                    </div>
                  )}

                  {/* Badges on Cover */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {match.status === 'cancelled' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs">
                        Cancelled
                      </span>
                    ) : match.status === 'completed' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-900/90 text-zinc-300 border border-zinc-700 shadow-xs">
                        Completed
                      </span>
                    ) : cutoff.isInsideCutoff ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white flex items-center gap-1 shadow-md shadow-orange-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" /> Inside 24h Cutoff
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30">
                        Open for Booking
                      </span>
                    )}
                  </div>

                  {/* Photos count pill (FR-33) */}
                  {match.photoCount > 0 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-xs font-medium flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      <span>{match.photoCount} photos</span>
                    </div>
                  )}

                  {/* Booked indicator */}
                  {isUserBooked && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-orange-600/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> You're In!
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Date and Time in Asia/Dhaka */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDhakaDate(match.kickoffAt)}</span>
                      <span className="text-orange-500">•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {formatDhakaTime(match.kickoffAt)} - {formatDhakaTime(match.endAt)}
                      </span>
                    </div>

                    {/* Turf Name */}
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {match.turfName}
                    </h3>

                    {/* Venue Location */}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                      <span>{match.turfLocation}</span>
                    </p>

                    {/* Notes preview */}
                    {match.notes && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2.5 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        {match.notes}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Confirmed count, fee & CTA */}
                  <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>{match.confirmedCount} Attending</span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Fee: <span className="font-bold text-zinc-900 dark:text-zinc-100">৳{match.feePerPlayer} BDT</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition">
                      <span>View</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

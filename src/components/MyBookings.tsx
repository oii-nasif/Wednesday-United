import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { formatDhakaDate, formatDhakaTime, getCutoffStatus } from '../utils/date';

export const MyBookings: React.FC = () => {
  const { currentUser, matches, attendees, setSelectedMatchId, setCurrentTab, cancelBooking, openSignInModal } = useApp();

  if (!currentUser) {
    return (
      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md mx-auto">
        <UserCheck className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Sign-in Required</h3>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Please sign in to view your bookings and match history.</p>
        <button
          onClick={openSignInModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // Find user bookings
  const myAttendees = attendees.filter((a) => a.userId === currentUser.id && a.status === 'confirmed');

  const myMatches = myAttendees
    .map((att) => {
      const match = matches.find((m) => m.id === att.matchId);
      const myGuests = attendees.filter(
        (a) => a.matchId === att.matchId && a.hostUserId === currentUser.id && a.status !== 'cancelled'
      );
      return {
        attendee: att,
        match,
        guests: myGuests,
      };
    })
    .filter((item) => item.match !== undefined)
    .sort((a, b) => new Date(b.match!.kickoffAt).getTime() - new Date(a.match!.kickoffAt).getTime());

  const now = new Date().getTime();
  const upcoming = myMatches.filter((item) => new Date(item.match!.endAt).getTime() > now && item.match!.status === 'open');
  const past = myMatches.filter((item) => new Date(item.match!.endAt).getTime() <= now || item.match!.status !== 'open');

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          My Match Bookings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Attendance confirmation, payment records, and guest requests for {currentUser.displayName}
        </p>
      </div>

      {myMatches.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8">
          <Calendar className="w-12 h-12 text-blue-600/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No active bookings yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            You haven't booked any matches yet. Browse upcoming matches and confirm your spot in open squads!
          </p>
          <button
            onClick={() => setCurrentTab('matches')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-500 transition"
          >
            Browse Open Matches
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Upcoming Matches ({upcoming.length})
            </h2>

            {upcoming.length === 0 ? (
              <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                No upcoming bookings scheduled.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(({ attendee, match, guests }) => {
                  const cutoff = getCutoffStatus(match!.kickoffAt);

                  return (
                    <div
                      key={attendee.id}
                      className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              {formatDhakaDate(match!.kickoffAt)} • {formatDhakaTime(match!.kickoffAt)}
                            </span>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
                              {match!.turfName}
                            </h3>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{match!.turfLocation}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Position</span>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {attendee.preferredPosition}
                            </span>
                          </div>
                        </div>

                        {/* Payment widget */}
                        <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <div>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Entry Fee:</span>{' '}
                              <span
                                className={`font-extrabold uppercase px-1.5 py-0.5 rounded-sm ${
                                  attendee.paymentStatus === 'paid'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {attendee.paymentStatus === 'paid' ? 'PAID' : 'NOT PAID'}
                              </span>
                              {attendee.paymentMethod && (
                                <span className="ml-1 text-zinc-500">
                                  via {attendee.paymentMethod === 'bkash' ? 'bKash' : 'City Bank'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-white">৳{match!.feePerPlayer}</span>
                        </div>

                        {/* Guests brought by user */}
                        {guests.length > 0 && (
                          <div className="mt-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 text-xs">
                            <div className="flex items-center gap-1 font-bold text-blue-800 dark:text-blue-300 mb-1">
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Your Guests ({guests.length}/5):</span>
                            </div>
                            <div className="space-y-1">
                              {guests.map((g) => (
                                <div key={g.id} className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                                  <span>
                                    {g.name} ({g.preferredPosition})
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                      g.status === 'confirmed'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                    }`}
                                  >
                                    {g.status === 'confirmed' ? 'Approved' : 'Pending Approval'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer actions */}
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                        {cutoff.isInsideCutoff ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Cancellation Locked (24h)
                          </span>
                        ) : (
                          <button
                            onClick={() => cancelBooking(match!.id, attendee.id)}
                            className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                          >
                            Cancel Spot
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedMatchId(match!.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1"
                        >
                          <span>Match Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Matches Section */}
          {past.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Match History & Past Attendance ({past.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map(({ attendee, match }) => (
                  <div
                    key={attendee.id}
                    onClick={() => setSelectedMatchId(match!.id)}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 opacity-90 cursor-pointer hover:border-blue-500 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-semibold text-zinc-400">
                        {formatDhakaDate(match!.kickoffAt)}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{match!.turfName}</h4>
                      <span className="text-xs text-zinc-500">Played as: {attendee.preferredPosition}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">View Recap</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

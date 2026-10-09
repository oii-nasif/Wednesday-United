import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Users,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  CreditCard,
  Camera,
  Trash2,
  Check,
  X,
  Edit3,
  Image as ImageIcon,
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  formatDhakaDate,
  formatDhakaTime,
  getCutoffStatus,
  formatTimeUntil,
} from '../utils/date';
import { PreferredPosition, PaymentMethod, PaymentStatus } from '../types';
import { resizeImage } from '../utils/image';

export const MatchDetail: React.FC = () => {
  const {
    selectedMatchId,
    setSelectedMatchId,
    matches,
    attendees,
    photos,
    currentUser,
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
    updateMatch,
    cancelMatch,
    openActivityLogForMatch,
    signIn,
    openSignInModal,
    showToast,
  } = useApp();

  const match = matches.find((m) => m.id === selectedMatchId);

  // Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'roster' | 'gallery' | 'admin'>('details');

  // Modals & States
  const [showCutoffWarningModal, setShowCutoffWarningModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState<PreferredPosition>('Any');

  // Payment Modal
  const [paymentModalData, setPaymentModalData] = useState<{
    attendeeId: string;
    attendeeName: string;
    currentStatus: PaymentStatus;
    currentMethod: PaymentMethod | null;
    currentRef: string | null;
  } | null>(null);
  const [paymentStatusInput, setPaymentStatusInput] = useState<PaymentStatus>('paid');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod>('bkash');
  const [paymentRefInput, setPaymentRefInput] = useState('');

  // Force Add Modal (Admin)
  const [showForceAddModal, setShowForceAddModal] = useState(false);
  const [forceAddName, setForceAddName] = useState('');
  const [forceAddPosition, setForceAddPosition] = useState<PreferredPosition>('Midfielder');
  const [forceAddIsGuest, setForceAddIsGuest] = useState(false);

  // Photo Upload State (Admin)
  const [isUploading, setIsUploading] = useState(false);
  const [editingPhotoCaptionId, setEditingPhotoCaptionId] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState('');

  // Album URL Editor
  const [isEditingAlbum, setIsEditingAlbum] = useState(false);
  const [tempAlbumUrl, setTempAlbumUrl] = useState(match?.albumUrl || '');

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Cancel Match Modal
  const [showCancelMatchModal, setShowCancelMatchModal] = useState(false);
  const [cancelMatchReason, setCancelMatchReason] = useState('');

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Match not found.</p>
        <button
          onClick={() => setSelectedMatchId(null)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const cutoff = getCutoffStatus(match.kickoffAt);

  // Attendee state for current user
  const userBooking = currentUser
    ? attendees.find(
        (a) => a.matchId === match.id && a.userId === currentUser.id && a.status === 'confirmed'
      )
    : null;

  // Confirmed roster list (FR-09, FR-16: only confirmed appears on public roster)
  const confirmedAttendees = attendees.filter((a) => a.matchId === match.id && a.status === 'confirmed');

  // Pending guests requested by current user
  const userPendingGuests = currentUser
    ? attendees.filter(
        (a) => a.matchId === match.id && a.hostUserId === currentUser.id && a.status === 'pending_approval'
      )
    : [];

  // All pending guests for this match (Admin queue)
  const allPendingGuests = attendees.filter((a) => a.matchId === match.id && a.status === 'pending_approval');

  // Payment summary (FR-21)
  const paidCount = confirmedAttendees.filter((a) => a.paymentStatus === 'paid').length;
  const notPaidCount = confirmedAttendees.filter((a) => a.paymentStatus === 'not_paid').length;
  const expectedTotalBDT = confirmedAttendees.length * match.feePerPlayer;
  const collectedTotalBDT = paidCount * match.feePerPlayer;

  // Handle Photo File selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 5) {
      showToast('Maximum 5 photos. Delete one to add another. (FR-35)', 'error');
      return;
    }

    try {
      setIsUploading(true);
      // FR-36: Resize in browser to 2048px (full) and 400px (thumb)
      const resized = await resizeImage(file);
      uploadPhoto(match.id, {
        imageUrl: resized.fullDataUrl,
        thumbUrl: resized.thumbDataUrl,
        width: resized.width,
        height: resized.height,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Open Payment Updater
  const openPaymentModal = (attendee: any) => {
    setPaymentModalData({
      attendeeId: attendee.id,
      attendeeName: attendee.name,
      currentStatus: attendee.paymentStatus,
      currentMethod: attendee.paymentMethod,
      currentRef: attendee.paymentRef,
    });
    setPaymentStatusInput(attendee.paymentStatus || 'paid');
    setPaymentMethodInput(attendee.paymentMethod || 'bkash');
    setPaymentRefInput(attendee.paymentRef || '');
  };

  const handleSavePayment = () => {
    if (!paymentModalData) return;
    updatePayment(
      match.id,
      paymentModalData.attendeeId,
      paymentStatusInput,
      paymentStatusInput === 'paid' ? paymentMethodInput : null,
      paymentStatusInput === 'paid' ? paymentRefInput : null
    );
    setPaymentModalData(null);
  };

  const handleRequestGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    requestGuest(match.id, guestName.trim(), guestPosition);
    setGuestName('');
    setShowGuestModal(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back Button & Header actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedMatchId(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Matches
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openActivityLogForMatch(match.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-1.5 transition"
              title="View full audit trail for this match (FR-49)"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Match Audit Log</span>
            </button>
            {match.status === 'open' && (
              <button
                onClick={() => setShowCancelMatchModal(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 transition"
              >
                Cancel Match
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Match Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Cover Photo Header */}
        <div className="relative h-56 sm:h-72 bg-zinc-800 overflow-hidden">
          {match.coverPhotoUrl ? (
            <img
              src={match.coverPhotoUrl}
              alt={match.turfName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-950 via-slate-900 to-zinc-900 text-white">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-blue-400 mx-auto mb-2 opacity-80" />
                <span className="text-lg font-bold">{match.turfName}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Badges on Banner */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {match.status === 'cancelled' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-md">
                Match Cancelled
              </span>
            ) : match.status === 'completed' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-900/90 text-zinc-200 border border-zinc-700 shadow-md">
                Completed Match
              </span>
            ) : cutoff.isInsideCutoff ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-zinc-950 flex items-center gap-1.5 shadow-md">
                <AlertTriangle className="w-3.5 h-3.5" /> Self-Cancellation Locked (24h Cutoff)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                Open for RSVP • Cutoff in {Math.round(cutoff.hoursRemainingBeforeCutoff)}h
              </span>
            )}
          </div>

          {/* Fee & Confirmed Overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-300">
                <Calendar className="w-4 h-4" />
                <span>{formatDhakaDate(match.kickoffAt)}</span>
                <span>•</span>
                <Clock className="w-4 h-4" />
                <span>
                  {formatDhakaTime(match.kickoffAt)} – {formatDhakaTime(match.endAt)} (Dhaka Time)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {match.turfName}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{match.turfLocation}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Entry Fee</div>
                <div className="text-base font-extrabold text-white">৳{match.feePerPlayer} BDT</div>
              </div>
              <div className="bg-blue-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-blue-500/30 text-right">
                <div className="text-[10px] uppercase font-bold text-blue-300">Confirmed</div>
                <div className="text-base font-extrabold text-blue-100">{match.confirmedCount} Players</div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Box (BR-01 to BR-05, BR-19 Minimal Action) */}
        <div className="p-5 sm:p-6 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
          {match.status === 'cancelled' ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>This match was cancelled. No bookings or attendees accepted.</span>
            </div>
          ) : match.status === 'completed' ? (
            <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm flex items-center justify-between">
              <span>This match has ended. You can view the match roster and gallery photos below.</span>
              <button
                onClick={() => setActiveTab('gallery')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                View Gallery
              </button>
            </div>
          ) : !currentUser ? (
            /* Visitor: Prompt to sign in (FR-04) */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-blue-900/10 border border-blue-600/30">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  Ready to play? Join Wednesday United
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Sign in with your Google account to confirm your spot in 1 click (FR-02, BR-02).
                </p>
              </div>
              <button
                onClick={openSignInModal}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Book Spot</span>
              </button>
            </div>
          ) : !userBooking ? (
            /* Signed-in user NOT booked yet: 1-click booking (FR-10) with 24h warning check (FR-12) */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-blue-600/30 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                    Open Squad • Spot Available
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  No player limit. Your preferred position ({currentUser.preferredPosition}) will be registered.
                </p>
              </div>

              <button
                onClick={() => {
                  if (cutoff.isInsideCutoff) {
                    setShowCutoffWarningModal(true);
                  } else {
                    bookMatch(match.id);
                  }
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Book My Spot (৳{match.feePerPlayer} BDT)</span>
              </button>
            </div>
          ) : (
            /* User ALREADY booked: Manage booking, payment, and guests */
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-950/20 dark:bg-blue-950/40 border border-blue-600/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-900 dark:text-white text-base">
                        You're In! Spot Confirmed
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {userBooking.preferredPosition}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Booked for {formatDhakaDate(match.kickoffAt)} at {match.turfName}
                    </p>
                  </div>
                </div>

                {/* Cancel Booking Action (FR-13 & BR-05 24h Dropout Rule) */}
                <div>
                  {cutoff.isInsideCutoff ? (
                    <div className="flex items-center gap-2">
                      <button
                        disabled
                        title="Self-cancellation is locked within 24 hours of kickoff (BR-05)"
                        className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-400 text-xs font-bold cursor-not-allowed border border-zinc-300 dark:border-zinc-700 flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cancel Locked (Inside 24h)</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => cancelBooking(match.id, userBooking.id, 'Admin override')}
                          className="px-3 py-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs font-bold hover:bg-red-200 transition"
                          title="Admin privilege: cancel anytime (BR-09)"
                        >
                          Admin Override Cancel
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => cancelBooking(match.id, userBooking.id)}
                      className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition"
                    >
                      Cancel My Booking
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Status & Guest CTA bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-500/20">
                {/* Payment Widget (FR-19, BR-10, BR-11) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Your Entry Fee Payment
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                            userBooking.paymentStatus === 'paid'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {userBooking.paymentStatus === 'paid' ? 'PAID' : 'NOT PAID'}
                        </span>
                        {userBooking.paymentMethod && (
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                            {userBooking.paymentMethod === 'bkash' ? 'bKash' : 'City Bank'}
                            {userBooking.paymentRef && ` (${userBooking.paymentRef})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openPaymentModal(userBooking)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    Update
                  </button>
                </div>

                {/* Guest Requests Widget (FR-15, BR-06) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Guests (+1)
                      </div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {userPendingGuests.length +
                          attendees.filter(
                            (a) => a.matchId === match.id && a.hostUserId === currentUser.id && a.status === 'confirmed'
                          ).length}
                        /5 Requested
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowGuestModal(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Bring Guest</span>
                  </button>
                </div>
              </div>

              {/* Show user's pending guests notice if any */}
              {userPendingGuests.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Pending Guest Requests:</span>{' '}
                  {userPendingGuests.map((g) => g.name).join(', ')} (Awaiting admin approval per BR-07).
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Details, Roster, Gallery, Admin Summary) */}
        <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3.5 text-sm font-bold border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" /> Match Details
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3.5 text-sm font-bold border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'roster'
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Confirmed Roster ({confirmedAttendees.length})
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3.5 text-sm font-bold border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'gallery'
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> Gallery ({photos.length}/5)
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3.5 text-sm font-bold border-b-2 transition flex items-center gap-2 shrink-0 ${
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" /> Admin Summary
              {allPendingGuests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Details */}
        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Venue & Location */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Venue & Map</h3>
                  <p className="text-base font-bold text-zinc-900 dark:text-white mt-1">{match.turfName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{match.turfLocation}</p>
                </div>

                {/* Google Maps Embed (BR-14) */}
                <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-52 bg-zinc-100 dark:bg-zinc-800 relative">
                  <iframe
                    src={match.mapUrl}
                    title={match.turfName}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                  />
                </div>

                <a
                  href={match.mapUrl.replace('&output=embed', '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                </a>
              </div>

              {/* Match Rules & Notes */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Match Information</h3>
                  <div className="mt-3 space-y-3">
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-400 block">Date & Time</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        {formatDhakaDate(match.kickoffAt)}, {formatDhakaTime(match.kickoffAt)} -{' '}
                        {formatDhakaTime(match.endAt)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-400 block">Entry Fee</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        ৳{match.feePerPlayer} BDT per player / guest (Payable via bKash or City Bank)
                      </span>
                    </div>

                    {match.notes && (
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-400 block">Admin Notes</span>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-0.5 leading-relaxed">
                          {match.notes}
                        </p>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-bold">24-Hour Dropout Rule (BR-05):</span> Self-cancellation closes
                      exactly 24 hours prior to kickoff. After the cutoff, your booking is locked to ensure turf costs
                      are covered.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Roster */}
        {activeTab === 'roster' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Confirmed Attendance ({confirmedAttendees.length} Players)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Open squad with no capacity limit (BR-01). Positions and self-reported payment statuses are shown.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowForceAddModal(true)}
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition flex items-center gap-1.5 self-start"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Force Add Attendee
                </button>
              )}
            </div>

            {/* Roster Cards / Table */}
            {confirmedAttendees.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No players confirmed yet. Be the first to book!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {confirmedAttendees.map((att, idx) => {
                  const isCurrentUser = currentUser?.id === att.userId;
                  const isHostOfGuest = currentUser?.id === att.hostUserId;

                  return (
                    <div
                      key={att.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isCurrentUser
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                              {att.name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {att.preferredPosition}
                            </span>
                            {att.isGuest && (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
                                Guest of {att.guestAddedByName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Payment Status & Admin / Host actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Payment chip */}
                        <div
                          onClick={() => {
                            if (isCurrentUser || isHostOfGuest || isAdmin) {
                              openPaymentModal(att);
                            }
                          }}
                          className={`cursor-pointer px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition ${
                            att.paymentStatus === 'paid'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 hover:opacity-80'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:opacity-80'
                          }`}
                          title={isCurrentUser || isHostOfGuest || isAdmin ? 'Click to change payment status' : ''}
                        >
                          {att.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </div>

                        {/* Admin or Host cancellation/removal */}
                        {isAdmin && (
                          <button
                            onClick={() => cancelBooking(match.id, att.id, 'Removed by admin (Override)')}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Remove attendee from roster (FR-25, BR-09)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Gallery (FR-33 to FR-41, BR-20) */}
        {activeTab === 'gallery' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <span>Match Day Gallery ({photos.length}/5 Photos)</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  High-res match photos and team snaps. Up to 5 photos per match (BR-20).
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* External Album Link (FR-33, FR-39) */}
                {match.albumUrl && (
                  <a
                    href={match.albumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Full Album (Google Photos)</span>
                  </a>
                )}

                {/* Admin Photo Upload Button (FR-35) */}
                {isAdmin && (
                  <label
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      photos.length >= 5 || isUploading
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>{isUploading ? 'Resizing & Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      onChange={handlePhotoSelect}
                      disabled={photos.length >= 5 || isUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Admin Album Link Setting (FR-39) */}
            {isAdmin && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex-1">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    External Shared Album Link (FR-39)
                  </span>
                  {isEditingAlbum ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://photos.app.goo.gl/..."
                        value={tempAlbumUrl}
                        onChange={(e) => setTempAlbumUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                      <button
                        onClick={() => {
                          setAlbumUrl(match.id, tempAlbumUrl);
                          setIsEditingAlbum(false);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingAlbum(false)}
                        className="px-2 py-1.5 text-zinc-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-zinc-500 truncate block">
                      {match.albumUrl || 'No external album link configured yet.'}
                    </span>
                  )}
                </div>
                {!isEditingAlbum && (
                  <button
                    onClick={() => {
                      setTempAlbumUrl(match.albumUrl || '');
                      setIsEditingAlbum(true);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Edit Link
                  </button>
                )}
              </div>
            )}

            {/* Photo Grid (FR-33, FR-41) */}
            {photos.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No photos yet</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {isAdmin
                    ? 'Use the Upload Photo button to add up to 5 match highlights.'
                    : 'Match day photos will appear here after the match.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {photos.map((p, idx) => {
                  const isCover = match.coverPhotoUrl === p.thumbUrl || (!match.coverPhotoUrl && idx === 0);

                  return (
                    <div
                      key={p.id}
                      className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 aspect-square flex flex-col justify-end"
                    >
                      {/* Thumbnail Image (FR-36, NFR-11) */}
                      <img
                        src={p.thumbUrl}
                        alt={p.caption || `Match photo ${idx + 1}`}
                        onClick={() => setLightboxIndex(idx)}
                        className="absolute inset-0 w-full h-full object-cover cursor-pointer group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />

                      {/* Cover Badge */}
                      {isCover && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold uppercase shadow-xs pointer-events-none">
                          Cover
                        </div>
                      )}

                      {/* Admin overlay controls */}
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                          <button
                            onClick={() => setCoverPhoto(match.id, p.thumbUrl)}
                            className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-blue-500 transition"
                            title="Set as match cover photo (FR-38, FR-40)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPhotoCaptionId(p.id);
                              setTempCaption(p.caption);
                            }}
                            className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-zinc-700 transition"
                            title="Edit caption (FR-38)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePhoto(match.id, p.id)}
                            className="p-1.5 rounded-lg bg-black/70 text-red-400 hover:bg-red-700 hover:text-white transition"
                            title="Delete photo (FR-38)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Caption snippet */}
                      <div
                        onClick={() => setLightboxIndex(idx)}
                        className="relative z-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-[11px] truncate cursor-pointer"
                      >
                        {p.caption || `Photo #${idx + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Admin Summary (FR-21, FR-17) */}
        {activeTab === 'admin' && isAdmin && (
          <div className="p-6 space-y-6">
            {/* Financial & Payment Summary Cards (FR-21) */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Financial Summary (Self-Reported BDT)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Paid Count</span>
                  <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                    {paidCount} players
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Unpaid Count</span>
                  <span className="text-xl font-extrabold text-amber-500 mt-1 block">
                    {notPaidCount} players
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Expected Total</span>
                  <span className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1 block">
                    ৳{expectedTotalBDT} BDT
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium block">
                    Reported Total
                  </span>
                  <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-1 block">
                    ৳{collectedTotalBDT} BDT
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Guest Approvals Queue (FR-17, BR-07) */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Pending Guest Approvals Queue ({allPendingGuests.length})
                </h3>
              </div>

              {allPendingGuests.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">No pending guest requests for this match.</p>
              ) : (
                <div className="space-y-2">
                  {allPendingGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          {guest.name}{' '}
                          <span className="font-normal text-xs text-zinc-500">({guest.preferredPosition})</span>
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          Host Player: <span className="font-bold text-zinc-700 dark:text-zinc-300">{guest.guestAddedByName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveGuest(match.id, guest.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => rejectGuest(match.id, guest.id, 'Capacity reached')}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold hover:bg-red-200 transition flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 24-Hour Cutoff Warning Modal (FR-12) */}
      {showCutoffWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Inside 24-Hour Dropout Window
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Kickoff is in less than 24 hours ({Math.round(cutoff.hoursUntilKickoff)} hours remaining).
                Under Rule <span className="font-bold">BR-05</span>, if you confirm this booking, you will{' '}
                <span className="font-bold text-red-600 dark:text-red-400">NOT be able to cancel</span>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCutoffWarningModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowCutoffWarningModal(false);
                  bookMatch(match.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                I Understand, Confirm Spot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Request Modal (FR-15, BR-06) */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleRequestGuestSubmit}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Request Guest (+1)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              You can bring up to 5 guests per match. Guests are subject to admin approval (BR-07) and fee of ৳
              {match.feePerPlayer} BDT.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakib Rahman"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Preferred Position
                </label>
                <select
                  value={guestPosition}
                  onChange={(e) => setGuestPosition(e.target.value as PreferredPosition)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                >
                  <option value="Any">Any</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Status Modal (FR-19, BR-10, BR-11) */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Self-Report Payment: {paymentModalData.attendeeName}</span>
              </h3>
              <button
                onClick={() => setPaymentModalData(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatusInput('paid')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentStatusInput === 'paid'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatusInput('not_paid')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentStatusInput === 'not_paid'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Not Paid
                  </button>
                </div>
              </div>

              {paymentStatusInput === 'paid' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Payment Method * (BR-10)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethodInput('bkash')}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          paymentMethodInput === 'bkash'
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethodInput('city_bank')}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          paymentMethodInput === 'city_bank'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        City Bank
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Transaction Reference / ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BKASH-98214 or CBL-4412"
                      value={paymentRefInput}
                      onChange={(e) => setPaymentRefInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-blue-600"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Add Attendee Modal (Admin Only, FR-25, BR-09) */}
      {showForceAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Admin Force-Add Attendee (BR-09)</span>
              </h3>
              <button
                onClick={() => setShowForceAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Attendee Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakil Hossain"
                  value={forceAddName}
                  onChange={(e) => setForceAddName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Position
                </label>
                <select
                  value={forceAddPosition}
                  onChange={(e) => setForceAddPosition(e.target.value as PreferredPosition)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forceGuest"
                  checked={forceAddIsGuest}
                  onChange={(e) => setForceAddIsGuest(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="forceGuest" className="text-xs text-zinc-700 dark:text-zinc-300">
                  Mark as Guest (+1)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForceAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!forceAddName.trim()) return;
                  forceAddAttendee(match.id, {
                    name: forceAddName.trim(),
                    preferredPosition: forceAddPosition,
                    isGuest: forceAddIsGuest,
                  });
                  setForceAddName('');
                  setShowForceAddModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Add to Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Photo Caption Modal */}
      {editingPhotoCaptionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Edit Photo Caption</h3>
            <input
              type="text"
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              placeholder="Caption..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingPhotoCaptionId(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updatePhotoCaption(match.id, editingPhotoCaptionId, tempCaption);
                  setEditingPhotoCaptionId(null);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Full Screen Viewer (FR-34) */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <span className="text-sm font-semibold">
              Photo {lightboxIndex + 1} of {photos.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image & Prev / Next */}
          <div className="relative flex-1 flex items-center justify-center py-4">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-2 sm:left-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition z-10"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={photos[lightboxIndex].imageUrl}
              alt={photos[lightboxIndex].caption}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />

            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-2 sm:right-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition z-10"
              >
                <ArrowLeft className="w-6 h-6 rotate-180" />
              </button>
            )}
          </div>

          {/* Caption footer */}
          <div className="text-center text-white py-2">
            <p className="text-sm font-medium">{photos[lightboxIndex].caption}</p>
          </div>
        </div>
      )}

      {/* Cancel Match Modal (Admin) */}
      {showCancelMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Cancel Match Session?
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                All confirmed players and guest hosts will receive an immediate cancellation email (FR-28).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Heavy rain & pitch waterlogged"
                value={cancelMatchReason}
                onChange={(e) => setCancelMatchReason(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelMatchModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-400"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  cancelMatch(match.id, cancelMatchReason);
                  setShowCancelMatchModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Bell, Save, Camera, Trash2, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { PreferredPosition } from '../types';

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB

export const Profile: React.FC = () => {
  const { currentUser, updateProfile, attendees, openSignInModal, showToast } = useApp();

  if (!currentUser) {
    return (
      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-md mx-auto">
        <User className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Sign-in Required</h3>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Please sign in to view and edit your player profile and pitch preferences.</p>
        <button
          onClick={openSignInModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // Remove any legacy unsplash stock/dummy image
  const initialPhoto =
    currentUser.photoURL && !currentUser.photoURL.includes('images.unsplash.com')
      ? currentUser.photoURL
      : '';

  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition>(currentUser.preferredPosition);
  const [emailNotifications, setEmailNotifications] = useState(currentUser.emailNotifications);
  const [photoURL, setPhotoURL] = useState(initialPhoto);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myBookingsCount = attendees.filter((a) => a.userId === currentUser.id && a.status === 'confirmed').length;
  const myGuestsCount = attendees.filter((a) => a.hostUserId === currentUser.id && a.status === 'confirmed').length;

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const msg = 'Please choose a valid image file (JPG, PNG, or WebP).';
      setPhotoError(msg);
      showToast(msg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Enforce max size: 500 KB
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      const msg = `Selected file is ${sizeKb} KB, which exceeds the 500 KB limit. Please upload an image under 500 KB.`;
      setPhotoError(msg);
      showToast('Image exceeds 500 KB limit', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoURL(dataUrl);
      const sizeKb = (file.size / 1024).toFixed(0);
      setPhotoSuccess(`Photo uploaded (${sizeKb} KB). Click "Save Profile" to save changes.`);
      showToast(`Image loaded (${sizeKb} KB)`, 'success');
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try again.');
      showToast('Failed to read image', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
    setPhotoError(null);
    setPhotoSuccess('Photo removed. Initials will be used.');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Photo removed', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName: displayName.trim(),
      preferredPosition,
      emailNotifications,
      photoURL,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Player Profile & Preferences
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your squad registration, profile image, preferred pitch position, and notifications (FR-06).
        </p>
      </div>

      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-orange-500 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white flex flex-col items-center justify-center shadow-md border-2 border-orange-500/40">
              <span className="font-extrabold text-2xl tracking-tight">{getInitials(displayName)}</span>
              <span className="text-[10px] tracking-wider uppercase opacity-80 font-semibold mt-0.5">Player</span>
            </div>
          )}

          {/* Quick Upload Hover Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload new image"
            className="absolute -bottom-2 -right-2 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md border-2 border-white dark:border-zinc-900 cursor-pointer transition transform hover:scale-105"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{displayName || currentUser.displayName}</h2>
            <span
              className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full uppercase self-center sm:self-auto ${
                currentUser.role === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          <p className="text-xs text-zinc-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            <span>{currentUser.email}</span>
          </p>

          <div className="pt-2 flex items-center justify-center sm:justify-start gap-4 text-xs">
            <div>
              <span className="text-zinc-400 block font-medium">Matches Booked</span>
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white">{myBookingsCount}</span>
            </div>
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <span className="text-zinc-400 block font-medium">Guests Hosted</span>
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white">{myGuestsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Personal Details</h3>

        {/* Profile Image Upload Option */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Profile Photo
              </label>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Upload your real avatar. Max file size: <strong>500 KB</strong> (PNG, JPG, WebP).
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              Max 500 KB
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={handleImageChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{photoURL ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}

            {!photoURL && (
              <span className="text-[11px] text-zinc-500 italic">
                No custom photo set (clean initials avatar will be shown)
              </span>
            )}
          </div>

          {/* Error Message */}
          {photoError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-850 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{photoError}</span>
            </div>
          )}

          {/* Success / Pending Confirmation Message */}
          {photoSuccess && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{photoSuccess}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
            Display Name *
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-blue-600"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
            Preferred Position (BR-15)
          </label>
          <p className="text-[11px] text-zinc-500 mb-2">
            Automatically attached to all your future match booking records.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any'] as PreferredPosition[]).map((pos) => (
              <button
                type="button"
                key={pos}
                onClick={() => setPreferredPosition(pos)}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  preferredPosition === pos
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Email Notification Switch (FR-06, BR-18, FR-32) */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-zinc-900 dark:text-white">Email Notifications</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">
              Receive alerts for new matches, guest request approvals, and 26h cutoff reminders. Match cancellation emails are always delivered.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};

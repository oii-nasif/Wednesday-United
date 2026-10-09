import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, X, CheckCheck, Filter, Clock } from 'lucide-react';
import { formatDhakaDateTime } from '../utils/date';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { emails, currentUser } = useApp();
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('mine');

  if (!isOpen) return null;

  const filteredEmails = emails.filter((em) => {
    if (filterMode === 'mine' && currentUser) {
      return em.recipientEmail === currentUser.email || em.recipientEmail.includes('all_users');
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Email Notification Feed</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Trigger Email Extension (FR-27 to FR-32)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5" /> Show Emails:
          </span>
          <div className="flex gap-1 bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setFilterMode('mine')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterMode === 'mine'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              My Inquiries
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              All Dispatched ({emails.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No dispatched emails found</p>
            </div>
          ) : (
            filteredEmails.map((em) => (
              <div
                key={em.id}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs hover:border-blue-500/40 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 line-clamp-1">
                    {em.subject}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      em.status === 'sent'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {em.status === 'sent' ? 'Sent' : 'Opted Out'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-2.5">
                  {em.body}
                </p>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="truncate max-w-[190px]">To: {em.recipientName} ({em.recipientEmail})</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDhakaDateTime(em.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 text-center">
          Simulated Firebase Trigger Email / SendGrid delivery pipeline
        </div>
      </div>
    </div>
  );
};

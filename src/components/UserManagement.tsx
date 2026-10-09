import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ClubLogo } from './ClubLogo';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Mail,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  ChevronRight,
} from 'lucide-react';
import { PreferredPosition, isNasifUser } from '../types';

interface Props {
  embedded?: boolean;
}

export const UserManagement: React.FC<Props> = ({ embedded = false }) => {
  const { currentUser, users, updateUserRole, createUser, deleteUser, showToast, openSignInModal } = useApp();

  const isAdmin = currentUser?.role === 'admin' || isNasifUser(currentUser?.email, currentUser?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'player'>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPosition, setNewPosition] = useState<PreferredPosition>('Midfielder');
  const [newRole, setNewRole] = useState<'player' | 'admin'>('player');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const playerCount = users.filter((u) => u.role === 'player').length;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = u.displayName.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPos = u.preferredPosition.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPos) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchTerm]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      createUser({
        displayName: newName.trim() || newEmail.trim().split('@')[0],
        email: newEmail.trim(),
        preferredPosition: newPosition,
        role: newRole,
      });
      setNewName('');
      setNewEmail('');
      setNewPosition('Midfielder');
      setNewRole('player');
      setIsAddUserModalOpen(false);
    } catch (err: any) {
      // toast shown in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    try {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      // toast shown in context
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header (if not embedded in AdminHub subtab) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <ClubLogo size="md" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold mb-1">
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>Club Roster & Role Administration</span>
              </div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Wednesday <span className="text-blue-600 dark:text-blue-400">United</span> Users & Members
              </h1>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Member</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Registered Users</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Club Administrators</span>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5">{adminCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Registered Players</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{playerCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin Notice or Role Switch Explanation */}
      {isAdmin ? (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
          <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Administrator Role Controls Active</p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
              As an administrator, you can promote any player to <span className="font-semibold text-blue-600 dark:text-blue-400">Admin</span> or demote existing admins back to <span className="font-semibold text-zinc-700 dark:text-zinc-300">Player</span> using the controls below. Changes take effect instantly and sync to cloud storage.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Sign in as an administrator to assign or modify user roles.</span>
          </div>
          {!currentUser && (
            <button
              onClick={openSignInModal}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-blue-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Admins ({adminCount})
          </button>
          <button
            onClick={() => setRoleFilter('player')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              roleFilter === 'player'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Players ({playerCount})
          </button>
        </div>
      </div>

      {/* User Directory Cards Grid */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <Users className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <h3 className="font-bold text-zinc-900 dark:text-white text-base">No Users Found</h3>
          <p className="text-xs text-zinc-500 mt-1">Try adjusting your search criteria or role filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredUsers.map((u) => {
            const isSelf = currentUser?.id === u.id || (currentUser?.email?.toLowerCase() === u.email.toLowerCase());
            const isNasifPrimary = isNasifUser(u.email, u.id);

            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between gap-3 transition ${
                  u.role === 'admin'
                    ? 'border-blue-200 dark:border-blue-900/60'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {u.photoURL && !u.photoURL.includes('images.unsplash.com') ? (
                      <img
                        src={u.photoURL}
                        alt={u.displayName}
                        className="w-11 h-11 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center text-sm border shrink-0 ${
                        u.role === 'admin'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {u.displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                            YOU
                          </span>
                        )}
                        {isNasifPrimary && (
                          <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                            PRIMARY ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{u.email}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                          {u.preferredPosition}
                        </span>
                        <span>•</span>
                        <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="shrink-0">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <ShieldAlert className="w-3 h-3 text-orange-500" />
                        <span>ADMIN</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        <span>PLAYER</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Assignment Action Bar for Admins */}
                {isAdmin && (
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-400">
                      Role Management:
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isSelf || isNasifPrimary ? (
                        <span className="text-xs text-zinc-400 font-medium italic">
                          Protected Account
                        </span>
                      ) : u.role === 'admin' ? (
                        <button
                          onClick={() => updateUserRole(u.id, 'player')}
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition cursor-pointer"
                          title="Demote this user to player"
                        >
                          Demote to Player
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserRole(u.id, 'admin')}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Grant administrator privileges"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Assign Admin Role</span>
                        </button>
                      )}

                      {!isSelf && !isNasifPrimary && (
                        <button
                          onClick={() => setUserToDelete({ id: u.id, name: u.displayName })}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                          title="Delete user account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Member Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">Add New Club Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmed"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="tanvir@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Preferred Position
                </label>
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value as PreferredPosition)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-blue-600"
                >
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                  <option value="Any">Any Position</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Initial Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('player')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      newRole === 'player'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Player (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      newRole === 'admin'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-base">Delete Member Account</h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to remove <strong className="text-zinc-900 dark:text-white">{userToDelete.name}</strong> from the system?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

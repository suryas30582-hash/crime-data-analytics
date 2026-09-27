import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Users,
  ShieldAlert,
  Database,
  Radio,
  FileText,
  UserPlus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Search,
  Filter,
  Check,
  X,
  Building,
  BadgeCheck,
  Server,
  Activity,
  Layers,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { api } from '../services/api';
import { Dataset, User } from '../types';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { datasets, activeDatasetId, setActiveDatasetId, refreshDatasets } = useDataset();

  const [activeTab, setActiveTab] = useState<'users' | 'incidents' | 'actions' | 'datasets' | 'health'>('users');

  // Users State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userCounts, setUserCounts] = useState({ total: 0, users: 0, police: 0, admins: 0 });
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Create Officer/User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRole, setCreateRole] = useState<'police' | 'user' | 'admin'>('police');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('password123');
  const [createBadge, setCreateBadge] = useState('');
  const [createStation, setCreateStation] = useState('Chennai Central');
  const [createDepartment, setCreateDepartment] = useState('Law Enforcement Division');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Incidents Monitor State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);

  // Police Actions State
  const [policeActions, setPoliceActions] = useState<any[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  // System Stats
  const [systemStats, setSystemStats] = useState<any | null>(null);

  // Feedback banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await api.getAdminUsers(userRoleFilter);
      setUsersList(res.users || []);
      setUserCounts(res.counts || { total: 0, users: 0, police: 0, admins: 0 });
    } catch (err: any) {
      console.warn('Error fetching users:', err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      setIsLoadingIncidents(true);
      const res = await api.getPoliceIncidentFeed();
      setIncidents(res.incidents || []);
    } catch (err: any) {
      console.warn('Error fetching incidents:', err.message);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  const fetchActions = async () => {
    try {
      setIsLoadingActions(true);
      const res = await api.getPoliceActionLogs();
      setPoliceActions(res.logs || []);
    } catch (err: any) {
      console.warn('Error fetching actions:', err.message);
    } finally {
      setIsLoadingActions(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getAdminSystemStats();
      setSystemStats(res.stats || null);
    } catch (err: any) {
      console.warn('Error fetching system stats:', err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchIncidents();
    fetchActions();
    fetchStats();
  }, [userRoleFilter]);

  // Handle Create User/Officer
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      setIsCreatingUser(true);
      await api.createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        badge_number: createRole === 'police' ? createBadge.trim() : undefined,
        station: createRole === 'police' ? createStation.trim() : undefined,
        department: createDepartment.trim()
      });

      setSuccessMessage(`Account created successfully for ${createName} (${createRole.toUpperCase()}).`);
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreateBadge('');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user account.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (u: User) => {
    if (u.id === user?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user account "${u.email}"?`)) {
      return;
    }

    try {
      await api.deleteAdminUser(u.id);
      setSuccessMessage(`User ${u.email} deleted.`);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete user.');
    }
  };

  // Filtered users for search
  const filteredUsers = usersList.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.badge_number && u.badge_number.toLowerCase().includes(q)) ||
      (u.station && u.station.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-[#EEDFD9] bg-gradient-to-r from-[#FFFDFC] via-[#FAF0EC] to-[#FFF7F4] p-6 sm:p-8 shadow-warm-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#2B1F1D] text-white">
                <KeyRound className="h-3.5 w-3.5" />
                <span>ADMINISTRATOR CONSOLE</span>
              </span>
              <span className="text-xs text-[#883A2E] font-semibold bg-[#883A2E]/10 px-2.5 py-0.5 rounded-full border border-[#883A2E]/20">
                Combined Citizen & Police Supervision
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2B1F1D]">
              System Administration & Security Control
            </h1>

            <p className="text-xs text-[#7A6360] max-w-2xl">
              Supervise all platform users and police officers, monitor incoming citizen incident reports, verify police actions, manage analytical datasets, and inspect database integrity.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchUsers();
                fetchIncidents();
                fetchActions();
                fetchStats();
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#EEDFD9] bg-[#FFFDFC] text-xs font-semibold text-[#2B1F1D] hover:bg-[#FAF0EC] shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#883A2E]" />
              <span>Sync All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-[#2E7D32]/30 bg-[#2E7D32]/10 p-4 text-xs text-[#2E7D32] animate-in fade-in">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="cursor-pointer font-bold">×</button>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-[#D65A31]/30 bg-[#D65A31]/10 p-4 text-xs text-[#D65A31] animate-in fade-in">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer font-bold">×</button>
        </div>
      )}

      {/* Quick Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6360]">Citizens Registered</span>
          <p className="text-2xl font-bold text-[#883A2E]">{userCounts.users}</p>
          <span className="text-[10px] text-[#7A6360]">Public reporting users</span>
        </div>

        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6360]">Police Officers</span>
          <p className="text-2xl font-bold text-[#542A20]">{userCounts.police}</p>
          <span className="text-[10px] text-[#7A6360]">Active command badges</span>
        </div>

        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6360]">Total Incidents</span>
          <p className="text-2xl font-bold text-[#D65A31]">{incidents.length}</p>
          <span className="text-[10px] text-[#7A6360]">Logged in MongoDB</span>
        </div>

        <div className="rounded-2xl border border-[#EEDFD9] bg-[#FFFDFC] p-4 shadow-warm-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6360]">Database Architecture</span>
          <p className="text-sm font-bold text-[#2E7D32] flex items-center space-x-1.5 pt-1">
            <span className="h-2 w-2 rounded-full bg-[#2E7D32]"></span>
            <span>MongoDB + SQLite WAL</span>
          </p>
          <span className="text-[10px] text-[#7A6360]">Hybrid Persistent Storage</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#FFFDFC] p-1.5 border border-[#EEDFD9] shadow-warm-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#2B1F1D] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User & Officer Management ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'incidents'
              ? 'bg-[#2B1F1D] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Incident Monitor ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'actions'
              ? 'bg-[#2B1F1D] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Police Action Log ({policeActions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'datasets'
              ? 'bg-[#2B1F1D] text-white shadow-sm'
              : 'text-[#7A6360] hover:text-[#2B1F1D] hover:bg-[#FAF0EC]'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Datasets ({datasets.length})</span>
        </button>
      </div>

      {/* TAB 1: USER & OFFICER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-[#7A6360]" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name, email, badge, station..."
                className="w-full text-xs text-[#2B1F1D] bg-transparent focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none"
              >
                <option value="ALL">All Roles ({userCounts.total})</option>
                <option value="user">Citizens ({userCounts.users})</option>
                <option value="police">Police Officers ({userCounts.police})</option>
                <option value="admin">Administrators ({userCounts.admins})</option>
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#883A2E] text-white text-xs font-semibold hover:bg-[#752F24] flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Create User / Officer</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#EEDFD9]">
            <table className="w-full text-left text-xs text-[#2B1F1D]">
              <thead className="bg-[#FAF0EC] text-[11px] font-bold text-[#542A20] uppercase border-b border-[#EEDFD9]">
                <tr>
                  <th className="px-4 py-3">Account / Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Badge & Station</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEDFD9]">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-[#FAF0EC]/40 transition-colors">
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#7A6360]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-[#2B1F1D] text-white' :
                        u.role === 'police' ? 'bg-[#542A20] text-white' : 'bg-[#883A2E]/10 text-[#883A2E]'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#7A6360]">
                      {u.role === 'police' ? (
                        <span>{u.badge_number || 'N/A'} • {u.station || 'Station Headquarters'}</span>
                      ) : (
                        <span className="text-[#7A6360]/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="text-[#D65A31] hover:text-red-700 p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT MONITOR */}
      {activeTab === 'incidents' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2B1F1D]">All Incident Reports Across System</h2>
            <span className="text-xs text-[#7A6360]">Stored in MongoDB</span>
          </div>

          <div className="space-y-3">
            {incidents.map((inc: any) => (
              <div
                key={inc.report_code || inc.id}
                className="rounded-2xl border border-[#EEDFD9] bg-[#FFF7F4] p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#883A2E]">{inc.report_code}</span>
                    <span className="font-bold text-[#2B1F1D]">{inc.incident_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF0EC] text-[#542A20]">
                      {inc.severity}
                    </span>
                  </div>
                  <span className="font-bold uppercase text-[10px] bg-white px-2 py-0.5 rounded border border-[#EEDFD9]">
                    {inc.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#2B1F1D]">{inc.description}</p>
                <div className="text-[10px] text-[#7A6360] flex items-center space-x-3">
                  <span>Citizen: {inc.citizen_name || 'Anonymous'}</span>
                  <span>•</span>
                  <span>{inc.location_address || `${inc.city}, ${inc.state}`}</span>
                  <span>•</span>
                  <span>{new Date(inc.created_at || inc.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: POLICE ACTION LOG */}
      {activeTab === 'actions' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-4">
          <h2 className="text-base font-bold text-[#2B1F1D]">Police Actions & Status Updates Log</h2>
          <div className="divide-y divide-[#EEDFD9]">
            {policeActions.map((log: any, idx: number) => (
              <div key={idx} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-semibold">
                    <span className="font-mono text-[#883A2E]">{log.report_code}</span>
                    <span className="text-[#2B1F1D]">{log.action_type}</span>
                    {log.new_status && <span className="text-[#542A20]">➔ {log.new_status}</span>}
                  </div>
                  <span className="text-[10px] text-[#7A6360]">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-[#7A6360]">
                  Officer: <span className="font-medium text-[#2B1F1D]">{log.officer_name}</span>
                  {log.notes && ` • "${log.notes}"`}
                  {log.unit_assigned && ` • Patrol: ${log.unit_assigned}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DATASETS */}
      {activeTab === 'datasets' && (
        <div className="rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#2B1F1D]">Analytical Crime Datasets Repository</h2>
              <p className="text-xs text-[#7A6360]">Centrally managed datasets synchronized across Citizen Users, Police Officers, and Administrators</p>
            </div>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#883A2E] to-[#D65A31] text-xs font-semibold text-white hover:opacity-95 shadow-sm transition-all w-fit"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload New Dataset</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-[#2E7D32]/20 bg-[#2E7D32]/5 p-4 text-xs text-[#2B1F1D] flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-[#2E7D32] shrink-0" />
            <div>
              <span className="font-bold text-[#2E7D32]">Automatic Real-Time Propagation:</span>
              <span className="text-[#7A6360] ml-1">
                Whenever any user, police officer, or administrator imports a new dataset, it is centrally stored in the database, marked as active default, and propagated instantly to all connected dashboards via live Server-Sent Events.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map(ds => {
              const isActive = activeDatasetId === ds.id || (!activeDatasetId && ds.is_default === 1);
              return (
                <div
                  key={ds.id}
                  className={`rounded-2xl border p-5 space-y-3 transition-all ${
                    isActive
                      ? 'border-[#883A2E] bg-gradient-to-r from-[#FFF7F4] to-[#FAF0EC] shadow-warm-xs'
                      : 'border-[#EEDFD9] bg-[#FFFDFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#2B1F1D]">{ds.name}</h3>
                      <p className="text-xs text-[#7A6360] mt-0.5">{ds.description}</p>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold bg-[#883A2E] text-white px-2.5 py-0.5 rounded-full shrink-0">
                        Active Central
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveDatasetId(ds.id)}
                        className="text-[10px] font-bold border border-[#883A2E]/40 text-[#883A2E] bg-white hover:bg-[#883A2E] hover:text-white px-2.5 py-0.5 rounded-full shrink-0 transition-colors cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#EEDFD9] text-[11px] text-[#7A6360]">
                    <div className="flex items-center justify-between">
                      <span>Total Records: <strong className="text-[#2B1F1D]">{ds.actual_record_count?.toLocaleString() || ds.record_count?.toLocaleString() || '0'}</strong></span>
                      <span>Created: {new Date(ds.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      Uploader / Origin: <span className="font-semibold text-[#2B1F1D]">{ds.created_by || 'System Seed'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER / OFFICER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[#EEDFD9] bg-[#FFFDFC] p-6 shadow-warm-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEDFD9] pb-3">
              <h3 className="text-sm font-bold text-[#2B1F1D]">Create New Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#2B1F1D]">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['police', 'user', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer uppercase ${
                        createRole === r
                          ? 'bg-[#883A2E] text-white border-[#883A2E]'
                          : 'bg-[#FFF7F4] border-[#EEDFD9] text-[#7A6360]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2B1F1D]">Full Name</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Officer name or citizen name"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2 text-xs text-[#2B1F1D] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2B1F1D]">Email Address</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  placeholder="officer@police.gov.in"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2 text-xs text-[#2B1F1D] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2B1F1D]">Password</label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  placeholder="password123"
                  className="w-full rounded-xl border border-[#EEDFD9] bg-[#FFF7F4] px-3.5 py-2 text-xs text-[#2B1F1D] focus:outline-none"
                />
              </div>

              {createRole === 'police' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#FAF0EC]/60 border border-[#EEDFD9]">
                  <div>
                    <label className="text-[11px] font-semibold text-[#542A20]">Badge Number</label>
                    <input
                      type="text"
                      value={createBadge}
                      onChange={e => setCreateBadge(e.target.value)}
                      placeholder="TN-POL-9921"
                      className="w-full rounded-xl border border-[#EEDFD9] bg-white px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#542A20]">Police Station</label>
                    <input
                      type="text"
                      value={createStation}
                      onChange={e => setCreateStation(e.target.value)}
                      placeholder="Chennai Central"
                      className="w-full rounded-xl border border-[#EEDFD9] bg-white px-3 py-1.5 text-xs text-[#2B1F1D] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EEDFD9] text-xs font-semibold text-[#7A6360] hover:text-[#2B1F1D] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 rounded-xl bg-[#883A2E] text-white text-xs font-bold hover:bg-[#752F24] cursor-pointer disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creating...' : `Create ${createRole.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

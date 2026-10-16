import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import IskconLogo from '../components/IskconLogo';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  PhoneCall,
  UserCheck,
  Crown,
  Heart,
  ChevronRight,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

export default function Crm() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM',
    assignedTo: user?.name || 'Radha Govinda Das',
    donorId: '',
  });

  const [donorsList, setDonorsList] = useState<any[]>([]);

  useEffect(() => {
    fetchCrmData();
    fetchDonorsList();
  }, [taskFilter]);

  const fetchCrmData = async () => {
    setLoading(true);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/crm/stats'),
        api.get(`/crm/tasks?filter=${taskFilter}`)
      ]);
      setStats(statsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonorsList = async () => {
    try {
      const res = await api.get('/donors?take=100');
      setDonorsList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load donors list:', err);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/crm/refresh');
      await fetchCrmData();
    } catch (err) {
      console.error('Refresh trigger failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.patch(`/crm/tasks/${taskId}`, { status: nextStatus });
      fetchCrmData();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crm/tasks', newTask);
      setShowTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'MEDIUM',
        assignedTo: user?.name || 'Radha Govinda Das',
        donorId: '',
      });
      fetchCrmData();
    } catch (err) {
      alert('Failed to create task');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Devotional CRM Top Banner */}
      <div className="relative overflow-hidden rounded-2xl temple-gradient text-white p-8 shadow-xl shadow-slate-900/10 border border-slate-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-saffron-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-2 right-10 opacity-15 pointer-events-none select-none">
          <IskconLogo className="w-32 h-32" variant="white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-saffron-500/20 text-saffron-300 border border-saffron-500/30 flex items-center gap-1.5 backdrop-blur-sm">
                <Sparkles size={13} className="text-amber-400" />
                ISKCON Shirpur CRM
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                15-Min Auto Refresh Active
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-heading text-white">
              Devotee Care & Seva Follow-ups
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Nurturing Vaishnava relationships, Janmashtami & Gaura Purnima seva engagements, and automated temple blessings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 transition-all backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Sync Data Now'}
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center px-5 py-2.5 rounded-xl saffron-gradient hover:opacity-95 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition-all transform active:scale-95"
            >
              <Plus size={18} className="mr-1.5" />
              Add Follow-up Task
            </button>
          </div>
        </div>
      </div>

      {/* High-End Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Today</span>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-heading">
              {stats?.tasks?.dueToday ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Tasks</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle size={13} />
              {stats?.tasks?.overdue ?? 0} Overdue
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{stats?.tasks?.totalPending ?? 0} Total Pending</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Life Patrons</span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Crown size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-heading">
              {stats?.stages?.LIFE_PATRON ?? 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Devotees</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-purple-700">{stats?.stages?.PATRON ?? 0} Patrons</span>
            <span>+</span>
            <span className="font-semibold text-emerald-600">{stats?.stages?.REGULAR ?? 0} Regular</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Tasks</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-heading">
              {stats?.tasks?.completed ?? 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 font-semibold">Resolved</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Great devotee engagement momentum
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-lg hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta WhatsApp</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900 font-heading">Active</span>
            <span className="text-xs font-medium text-emerald-600 font-semibold">• Cloud v20.0</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Automated birthday & receipt dispatch
          </div>
        </div>
      </div>

      {/* Main Grid: Tasks & Interaction Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Task Manager */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                  <CalendarCheck size={20} className="text-saffron-600" />
                  Devotee Follow-up Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Track calls, festival visits, and seva commitments</p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                {(['today', 'overdue', 'upcoming', 'all', 'completed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTaskFilter(filterKey)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      taskFilter === filterKey
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <div className="w-8 h-8 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading devotee tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-16 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No tasks in this category</p>
                <p className="text-xs text-slate-500 mt-1">All devotee follow-ups are up to date. Hare Krishna!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                        isDone
                          ? 'bg-slate-50/70 border-slate-200 opacity-60'
                          : isOverdue
                          ? 'bg-red-50/30 border-red-200 hover:border-red-300'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-saffron-500'
                          }`}
                        >
                          {isDone && <CheckCircle2 size={14} />}
                        </button>

                        <div>
                          <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            {task.donor && (
                              <Link
                                to={`/donors/${task.donor.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-saffron-700 hover:underline bg-saffron-50 px-2 py-0.5 rounded-md border border-saffron-200"
                              >
                                <Heart size={11} className="text-saffron-500" />
                                {task.donor.fullName}
                              </Link>
                            )}

                            {task.dueDate && (
                              <span className={`inline-flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                <Clock size={12} />
                                {format(new Date(task.dueDate), 'dd MMM yyyy')}
                              </span>
                            )}

                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>

                            {task.assignedTo && (
                              <span className="text-slate-400 text-[11px]">
                                Assigned: {task.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Devotee Interactions Feed & Lifecycle Summary */}
        <div className="space-y-6">
          {/* Devotee Lifecycle Card */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-saffron-600" />
              Devotee Seva Stages
            </h3>

            <div className="space-y-2.5">
              {[
                { key: 'LIFE_PATRON', label: 'Life Patrons', color: 'bg-purple-500' },
                { key: 'PATRON', label: 'Annual Patrons', color: 'bg-amber-500' },
                { key: 'REGULAR', label: 'Regular Seva Donors', color: 'bg-emerald-500' },
                { key: 'FIRST_TIME', label: 'First-time Donors', color: 'bg-blue-500' },
                { key: 'PROSPECT', label: 'Visitors & Prospects', color: 'bg-slate-400' },
              ].map((stage) => {
                const count = stats?.stages?.[stage.key] ?? 0;
                const total = stats?.totalDonors || 1;
                const percent = Math.round((count / total) * 100);

                return (
                  <div key={stage.key} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">{stage.label}</span>
                      <span className="font-extrabold text-slate-900">{count}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${stage.color}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Engagements Stream */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <PhoneCall size={16} className="text-emerald-600" />
              Recent Devotee Engagements
            </h3>

            {stats?.recentInteractions?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No interactions recorded yet.</p>
            ) : (
              <div className="space-y-3.5">
                {stats?.recentInteractions?.map((interaction: any) => (
                  <div key={interaction.id} className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-900">{interaction.subject}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {format(new Date(interaction.interactionDate), 'dd MMM')}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1 line-clamp-2">{interaction.notes}</p>
                    {interaction.donor && (
                      <Link
                        to={`/donors/${interaction.donor.id}`}
                        className="mt-1.5 inline-flex items-center gap-1 font-medium text-saffron-600 hover:underline"
                      >
                        {interaction.donor.fullName}
                        <ChevronRight size={10} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-elevated rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <h3 className="text-xl font-bold font-heading text-slate-900 mb-1">Schedule Devotee Follow-up</h3>
            <p className="text-xs text-slate-500 mb-5">Set a reminder for temple visits, festival calls, or seva discussions</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Task Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Call regarding Janmashtami Aarti Seva"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Associated Devotee / Donor</label>
                <select
                  value={newTask.donorId}
                  onChange={(e) => setNewTask({ ...newTask, donorId: e.target.value })}
                  className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                >
                  <option value="">General Temple Task (No specific donor)</option>
                  {donorsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.donorId}) - {d.mobile || 'No Mobile'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Due Date *</label>
                  <input
                    required
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Devotee Staff</label>
                <input
                  type="text"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="w-full text-sm rounded-xl border border-slate-200 py-2.5 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Details & Seva Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes about specific seva requirements or previous conversations..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full text-sm rounded-xl border border-slate-200 py-2 px-3.5 focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl saffron-gradient text-white shadow-md hover:opacity-95"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

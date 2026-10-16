import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Users,
  HeartHandshake,
  Cake,
  MessageSquare,
  CalendarCheck,
  Plus,
  ArrowRight,
  Sparkles,
  Crown
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data);
      } catch (error) {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-saffron-600 border-t-transparent"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const statCards = [
    { title: 'Total Donors', value: data?.totalDonors || 0, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Total Seva Funds', value: formatCurrency(data?.totalDonationsAmount || 0), icon: HeartHandshake, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { title: 'WhatsApp Sent', value: data?.smsStats?.sent || 0, icon: MessageSquare, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Todays Birthdays', value: data?.upcomingBirthdays?.length || 0, icon: Cake, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Devotional Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl temple-gradient text-white p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-saffron-500/20 text-saffron-300 border border-saffron-500/30 flex items-center gap-1.5 backdrop-blur-sm">
                <Sparkles size={12} className="text-amber-400" />
                श्री श्री राधा गोपीनाथ कृपा
              </span>
            </div>
            <h1 className="text-3xl font-black font-devanagari text-white tracking-wide">
              हरे कृष्ण, {user?.name?.split(' ')[0]} 🙏
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Welcome to ISKCON Shirpur DMS & Devotee CRM. Serving the Vaishnavas with care and devotion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/crm"
              className="flex items-center px-4 py-2.5 rounded-xl saffron-gradient hover:opacity-95 text-white text-xs font-semibold shadow-md transition-all"
            >
              <CalendarCheck size={16} className="mr-2" />
              Devotee CRM Board
            </Link>
            <Link
              to="/donors/new"
              className="flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              New Donor
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-6 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-slate-900 font-heading">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              Donor Category Tiers
            </h2>
            <Link to="/donors" className="text-xs font-semibold text-saffron-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { title: 'Platinum', value: data?.categories?.platinum || 0, sub: '₹10L+', color: 'border-slate-300 bg-slate-50' },
              { title: 'Gold', value: data?.categories?.gold || 0, sub: '₹5L - ₹10L', color: 'border-yellow-300 bg-yellow-50/50' },
              { title: 'Silver', value: data?.categories?.silver || 0, sub: '₹1L - ₹5L', color: 'border-slate-200 bg-slate-50/50' },
              { title: 'Sudama', value: data?.categories?.sudama || 0, sub: 'Up to ₹1L', color: 'border-orange-200 bg-orange-50/50' },
            ].map((cat, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${cat.color} text-center`}>
                <p className="text-xs text-slate-500 uppercase font-bold">{cat.title}</p>
                <p className="text-2xl font-black text-slate-900 font-heading mt-1">{cat.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{cat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900 font-heading mb-4">
            Quick Devotee Care
          </h2>
          <div className="space-y-2.5">
            <Link
              to="/crm"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck size={16} className="text-saffron-600" />
                <span>Devotee CRM & Follow-ups</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </Link>

            <Link
              to="/birthdays"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <Cake size={16} className="text-purple-600" />
                <span>Today's Birthday Blessings</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </Link>

            <Link
              to="/donations"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <HeartHandshake size={16} className="text-emerald-600" />
                <span>Global Donations & Receipts</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </Link>

            <Link
              to="/settings"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} className="text-blue-600" />
                <span>Meta WhatsApp API Settings</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

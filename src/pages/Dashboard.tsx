import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Users, HeartHandshake, Award, Cake, MailCheck, MailWarning } from 'lucide-react';

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
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-600"></div></div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const statCards = [
    { title: 'Total Donors', value: data?.totalDonors || 0, icon: Users, color: 'bg-blue-100 text-blue-700' },
    { title: 'Total Donations', value: formatCurrency(data?.totalDonationsAmount || 0), icon: HeartHandshake, color: 'bg-green-100 text-green-700' },
    { title: 'SMS Sent', value: data?.smsStats?.sent || 0, icon: MailCheck, color: 'bg-emerald-100 text-emerald-700' },
    { title: 'SMS Failed', value: data?.smsStats?.failed || 0, icon: MailWarning, color: 'bg-red-100 text-red-700' },
  ];

  const categoryCards = [
    { title: 'Platinum', value: data?.categories?.platinum || 0, icon: Award, color: 'bg-slate-100 text-slate-700 border-slate-300' },
    { title: 'Gold', value: data?.categories?.gold || 0, icon: Award, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { title: 'Silver', value: data?.categories?.silver || 0, icon: Award, color: 'bg-gray-100 text-gray-500 border-gray-300' },
    { title: 'Sudama', value: data?.categories?.sudama || 0, icon: Award, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-temple-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mt-1">Here's what's happening at ISKCON Shirpur today.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className={`p-4 rounded-full ${stat.color} mr-4`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-temple-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <h2 className="text-xl font-bold text-temple-900 mt-8 mb-4">Donor Categories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryCards.map((cat, idx) => (
          <div key={idx} className={`bg-white p-5 rounded-xl shadow-sm border-2 ${cat.color} flex flex-col items-center justify-center text-center`}>
            <cat.icon size={32} className="mb-2 opacity-80" />
            <p className="text-lg font-bold uppercase tracking-wider">{cat.title}</p>
            <p className="text-3xl font-extrabold mt-1">{cat.value}</p>
            <p className="text-xs mt-1 opacity-70">Donors</p>
          </div>
        ))}
      </div>

    </div>
  );
}

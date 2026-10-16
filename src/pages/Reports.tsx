import { useState, useEffect } from 'react';
import api, { downloadFile } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileText, Download } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data);
      } catch (error) {
        console.error("Failed to load reports data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/export/donations', `iskcon_donations_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      alert(err.message || 'Failed to export donations CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-600"></div></div>;
  }

  const categoryData = [
    { name: 'Platinum', value: data?.categories?.platinum || 0, color: '#94a3b8' },
    { name: 'Gold', value: data?.categories?.gold || 0, color: '#eab308' },
    { name: 'Silver', value: data?.categories?.silver || 0, color: '#d1d5db' },
    { name: 'Sudama', value: data?.categories?.sudama || 0, color: '#f97316' },
  ];

  const smsData = [
    { name: 'Sent', value: data?.smsStats?.sent || 0, color: '#22c55e' },
    { name: 'Failed', value: data?.smsStats?.failed || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center">
            <FileText size={24} className="mr-3 text-saffron-500" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Overview of system data and distribution.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-70"
        >
          <Download size={16} className="mr-2 text-saffron-600" />
          {exporting ? 'Exporting...' : 'Export All Donations (CSV)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-temple-900 mb-6 text-center">Donor Category Distribution</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Donors`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SMS Success Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-temple-900 mb-6 text-center">Birthday SMS Delivery</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={smsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {smsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

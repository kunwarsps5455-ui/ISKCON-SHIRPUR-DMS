import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Baby, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function Family() {
  const { user } = useAuth();
  const [family, setFamily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const res = await api.get('/family', { params: { search } });
      setFamily(res.data.data);
    } catch (error) {
      console.error("Failed to fetch family members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchFamily();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleToggleMessaging = async (id: string, currentStatus: string) => {
    if (user?.role !== 'ADMIN') return;
    const newStatus = currentStatus === 'ALLOWED' ? 'NOT_ALLOWED' : 'ALLOWED';
    try {
      await api.patch(`/family/${id}/messaging-permission`, { whatsappPermission: newStatus });
      fetchFamily();
    } catch (error) {
      alert('Failed to update messaging permission');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center font-serif">
            <Baby size={24} className="mr-3 text-saffron-500" />
            Devotee Family Members
          </h1>
          <p className="text-sm text-gray-500 mt-1">Directory of donor family members with individual automated birthday & festival messaging controls.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Family Member Name, Primary Donor, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Member Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Donor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Automated Wishes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : family.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No family members found.</td></tr>
              ) : (
                family.map((f) => {
                  const isAllowed = f.whatsappPermission !== 'NOT_ALLOWED';
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{f.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {f.relationship}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {f.dob ? format(new Date(f.dob), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {f.mobile || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{f.donor?.fullName}</div>
                        <Link to={`/donors/${f.donorId}`} className="text-xs text-saffron-600 hover:underline">
                          {f.donor?.donorId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleToggleMessaging(f.id, f.whatsappPermission)}
                          disabled={user?.role !== 'ADMIN'}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${
                            isAllowed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                          } ${user?.role !== 'ADMIN' ? 'opacity-70 cursor-default' : ''}`}
                          title={user?.role === 'ADMIN' ? 'Click to toggle automated birthday and festival wishes for this family member' : 'Admin permission required to toggle'}
                        >
                          {isAllowed ? '✓ Enabled' : '✕ Disabled'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Cake, Mail, Settings, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Birthdays() {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('TODAY');

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const bdayRes = await api.get('/birthdays/today');
      setBirthdays(bdayRes.data);
      
      const msgRes = await api.get('/birthdays/messages');
      setMessages(msgRes.data);
    } catch (error) {
      console.error("Failed to fetch birthday info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, []);

  const handleTriggerRun = async () => {
    if (!confirm('Are you sure you want to run the birthday automation check now? This respects duplicate protection.')) return;
    
    try {
      await api.post('/birthdays/trigger-run');
      alert('Job triggered successfully');
      fetchBirthdays();
    } catch (error) {
      alert('Failed to trigger job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'QUEUED':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center">
            <Cake size={24} className="mr-3 text-saffron-500" />
            Birthday Seva
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage today's birthdays and automated wishes.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="flex space-x-3">
            <button
              onClick={handleTriggerRun}
              className="flex items-center px-4 py-2 bg-temple-900 text-white rounded-lg hover:bg-temple-800 transition-colors shadow-sm text-sm"
            >
              <RefreshCw size={16} className="mr-2" />
              Run Check Now
            </button>
          </div>
        )}
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border border-gray-100 w-fit">
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'TODAY' ? 'bg-saffron-100 text-saffron-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Today's Birthdays
        </button>
        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'MESSAGES' ? 'bg-saffron-100 text-saffron-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Message History
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : activeTab === 'TODAY' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS Permission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {birthdays.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No birthdays today.</td></tr>
                ) : (
                  birthdays.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.type === 'DONOR' ? 'Primary Donor' : `Family (${b.relationship})`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(b.dob), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.mobile || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.smsPermission === 'ALLOWED' ? 'bg-green-100 text-green-800' : b.smsPermission === 'NOT_ALLOWED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {b.smsPermission}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message Preview</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messages.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No messages sent yet.</td></tr>
                ) : (
                  messages.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(m.createdAt), 'dd MMM, HH:mm')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.recipient}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{m.message}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(m.status)}`}>
                          {m.status}
                        </span>
                        {m.failureReason && <p className="text-xs text-red-500 mt-1">{m.failureReason}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

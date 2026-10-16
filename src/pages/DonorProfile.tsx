import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, Edit, Plus, HeartHandshake, Baby, History } from 'lucide-react';
import { format } from 'date-fns';

export default function DonorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Donation Modal State
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  useEffect(() => {
    fetchDonor();
  }, [id]);

  const fetchDonor = async () => {
    try {
      const res = await api.get(`/donors/${id}`);
      setDonor(res.data);
    } catch (error) {
      console.error("Failed to fetch donor");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/donations/donor/${id}`, {
        amount: parseFloat(donationAmount),
        donationDate,
        paymentMethod
      });
      setShowDonationModal(false);
      setDonationAmount('');
      fetchDonor(); // Refresh to update total & category
    } catch (error) {
      alert("Failed to add donation");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!donor) return <div className="p-8 text-center text-red-500">Donor not found</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'PLATINUM': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'GOLD': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SILVER': return 'bg-gray-100 text-gray-600 border-gray-300';
      case 'SUDAMA': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/donors" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-temple-900">Donor Profile</h1>
          <p className="text-sm text-gray-500">ID: {donor.donorId}</p>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-600 text-3xl font-bold border-2 border-saffron-200">
            {donor.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{donor.fullName}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${getCategoryColor(donor.category)}`}>
                {donor.category}
              </span>
              <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {donor.mobile || 'No Mobile'}
              </span>
              {donor.smsPermission === 'ALLOWED' && (
                <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                  SMS Allowed
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center min-w-[200px]">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total Contribution</p>
          <p className="text-3xl font-extrabold text-temple-900 mt-1">{formatCurrency(donor.totalDonation)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-temple-900">Personal Info</h3>
              {user?.role === 'ADMIN' && (
                <button className="text-gray-400 hover:text-saffron-600"><Edit size={18} /></button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Email</p>
                <p className="text-sm font-medium">{donor.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Date of Birth</p>
                <p className="text-sm font-medium">{donor.dob ? format(new Date(donor.dob), 'dd MMM yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Address</p>
                <p className="text-sm font-medium">{[donor.address, donor.city, donor.state, donor.pincode].filter(Boolean).join(', ') || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-temple-900 flex items-center"><Baby size={18} className="mr-2 text-saffron-500" /> Family</h3>
              {user?.role === 'ADMIN' && (
                <button className="text-saffron-600 hover:text-saffron-700 bg-saffron-50 p-1 rounded"><Plus size={18} /></button>
              )}
            </div>
            {donor.familyMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No family members added.</p>
            ) : (
              <ul className="space-y-3">
                {donor.familyMembers.map((fam: any) => (
                  <li key={fam.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                    <p className="font-medium">{fam.fullName} <span className="text-gray-400 font-normal">({fam.relationship})</span></p>
                    <p className="text-xs text-gray-500">{fam.dob ? format(new Date(fam.dob), 'dd MMM') : 'No DOB'} • {fam.mobile || 'No Mobile'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Donations */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-temple-900 flex items-center"><HeartHandshake size={20} className="mr-2 text-green-600" /> Donation History</h3>
              {user?.role === 'ADMIN' && (
                <button 
                  onClick={() => setShowDonationModal(true)}
                  className="flex items-center px-3 py-1.5 bg-saffron-600 text-white text-sm rounded-md hover:bg-saffron-700 transition-colors"
                >
                  <Plus size={16} className="mr-1" />
                  Add Donation
                </button>
              )}
            </div>

            {donor.donations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <History size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No donations recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 px-4 font-medium">ID</th>
                      <th className="pb-3 px-4 font-medium">Method</th>
                      <th className="pb-3 pl-4 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donor.donations.map((d: any) => (
                      <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 pr-4 text-sm text-gray-900">{format(new Date(d.donationDate), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{d.donationId}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{d.paymentMethod}</span>
                        </td>
                        <td className="py-3 pl-4 text-sm font-bold text-green-700 text-right">{formatCurrency(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Donation Modal (Basic) */}
      {showDonationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-temple-900 mb-4">Record New Donation</h3>
            <form onSubmit={handleAddDonation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
                <input required type="number" min="1" step="1" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input required type="date" value={donationDate} onChange={e => setDonationDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-saffron-500 focus:border-saffron-500">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowDonationModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Record Donation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

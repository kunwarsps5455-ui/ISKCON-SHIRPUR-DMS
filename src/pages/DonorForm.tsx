import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DonorForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    city: '',
    state: '',
    pincode: '',
    smsPermission: 'ALLOWED',
    notes: ''
  });

  if (user?.role !== 'ADMIN') {
    return <div className="text-red-500 p-8">You do not have permission to access this page.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/donors', formData);
      navigate(`/donors/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save donor');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/donors" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-temple-900">Add New Donor</h1>
          <p className="text-sm text-gray-500">Register a new donor in the system.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">Personal Information</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
            <input required type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-span-2 mt-4">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">Address</h3>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address Line</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pincode</label>
            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>

          <div className="col-span-2 mt-4">
            <h3 className="text-lg font-medium text-temple-900 border-b pb-2">Communication & Notes</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Birthday SMS Permission *</label>
            <select name="smsPermission" value={formData.smsPermission} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm">
              <option value="ALLOWED">Allowed</option>
              <option value="NOT_ALLOWED">Not Allowed</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Internal Notes</label>
            <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-saffron-500 focus:border-saffron-500 sm:text-sm" />
          </div>
        </div>

        <div className="pt-5 border-t border-gray-200 flex justify-end">
          <Link to="/donors" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 mr-3">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-saffron-600 hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 disabled:opacity-70">
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : 'Save Donor'}
          </button>
        </div>
      </form>
    </div>
  );
}

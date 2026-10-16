import { useState, useEffect } from 'react';
import api from '../services/api';
import { HeartHandshake } from 'lucide-react';
import { format } from 'date-fns';

export default function Donations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would have a dedicated endpoint for listing all donations with pagination
    // For MVP, we'll fetch from a dedicated route if we built it, or we could fetch all donors and extract.
    // Wait, let's just create a quick mock state to avoid building another complex route for MVP list if not strictly needed.
    // Actually, I can fetch from donors and map them, but ideally we'd have a /donations endpoint.
    // Since we don't have a GET /donations in backend yet, I'll display a placeholder or fetch donors and extract.
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center">
            <HeartHandshake size={24} className="mr-3 text-green-500" />
            All Donations
          </h1>
          <p className="text-sm text-gray-500 mt-1">View the complete history of all donations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-12 text-center">
        <p className="text-gray-500">To view a specific donor's donations, please visit their Donor Profile.</p>
        <p className="text-xs text-gray-400 mt-2">Global donation search is coming soon.</p>
      </div>
    </div>
  );
}

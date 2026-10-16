import { Baby } from 'lucide-react';

export default function Family() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-temple-900 flex items-center">
            <Baby size={24} className="mr-3 text-saffron-500" />
            Family Members
          </h1>
          <p className="text-sm text-gray-500 mt-1">Directory of donor family members.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-12 text-center">
        <p className="text-gray-500">To view a specific donor's family members, please visit their Donor Profile.</p>
        <p className="text-xs text-gray-400 mt-2">Global family member search is coming soon.</p>
      </div>
    </div>
  );
}

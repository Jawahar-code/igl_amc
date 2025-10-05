import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/vendor/payments?all=true&_ts=${Date.now()}`);
      setPayments(res.data?.payments || res.data || []);
    } catch (e) {
      console.error('Payments fetch failed', e);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => (
      [p.invoice_no, p.contract_id, p.status, p.amount]
        .map(v => (v || '').toString().toLowerCase())
        .some(v => v.includes(q))
    ));
  }, [payments, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Invoices and payment statuses</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Invoice #','Contract ID','Amount (₹)','Status','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(p => (
                <tr key={p.id || p.invoice_no} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{p.invoice_no}</td>
                  <td className="px-4 py-3 text-sm font-mono">{p.contract_id}</td>
                  <td className="px-4 py-3 text-sm">{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (p.status || '').toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' :
                      (p.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.date ? new Date(p.date).toLocaleDateString('en-IN') : ''}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;


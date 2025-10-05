import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const RequestVendor = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ company: '', contact: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.email.trim()) {
      toast.error('Company and email are required');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/vendor-requests', { ...form, requested_by: user?.id });
      toast.success('Vendor request submitted to Admin');
      setForm({ company: '', contact: '', email: '', notes: '' });
    } catch (e) {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Request Vendor</h1>
      <p className="text-gray-600">Submit a new vendor request for Admin approval.</p>
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
          <input value={form.company} onChange={e=>setForm(f=>({...f, company:e.target.value}))} className="w-full px-3 py-2 border rounded-lg"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <input value={form.contact} onChange={e=>setForm(f=>({...f, contact:e.target.value}))} className="w-full px-3 py-2 border rounded-lg"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} className="w-full px-3 py-2 border rounded-lg"/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} className="w-full px-3 py-2 border rounded-lg"/>
        </div>
        <div className="flex justify-end">
          <button disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestVendor;


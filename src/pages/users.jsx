import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Users = () => {
    const { user } = useAuth();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [processingUserId, setProcessingUserId] = useState(null);
    
    // Modal states
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [newRole, setNewRole] = useState('');

    const adminId = user?.id || 1;

    useEffect(() => {
        if (user?.role === 'Admin') {
            fetchAllUserSets();
        }
    }, [user]);

    // Fetch both lists so stats are always accurate
    const fetchAllUserSets = async () => {
        setLoading(true);
        try {
            const [pendingRes, allRes] = await Promise.all([
                api.get('/users/pending', { params: { adminId } }),
                api.get('/users/all', { params: { adminId } })
            ]);
            if (pendingRes.data?.success) {
                setPendingUsers(pendingRes.data.pendingUsers || []);
            }
            if (allRes.data?.success) {
                setAllUsers(allRes.data.users || []);
            }
            if (!pendingRes.data?.success) toast.error('Failed to load pending users');
            if (!allRes.data?.success) toast.error('Failed to load users');
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    // Keep old helper to refresh current tab quickly if needed
    const fetchUsers = async () => {
        setLoading(true);
        try {
            if (tab === 'pending') {
                const res = await api.get('/users/pending', { params: { adminId } });
                if (res.data.success) {
                    setPendingUsers(res.data.pendingUsers || []);
                } else {
                    toast.error('Failed to load pending users');
                }
            } else {
                const res = await api.get('/users/all', { params: { adminId } });
                if (res.data.success) {
                    setAllUsers(res.data.users || []);
                } else {
                    toast.error('Failed to load users');
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

// Status styling helper function
const getStatusStyle = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Helpers
    const isApproved = (u) => (u?.approval_status || '').toLowerCase() === 'approved';
    const isRejected = (u) => (u?.approval_status || '').toLowerCase() === 'rejected';

    // Format status text (capitalize first letter)
    const formatStatus = (status) => {
        return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
    };

// Check if user actions should be shown (hide for rejected users)
    // Keep role editing available for approved users only; pending/rejected have no actions.
    const shouldShowActions = (userData) => isApproved(userData);

    // Approval Modal Functions
    const openApprovalModal = (userData) => {
        setSelectedUser(userData);
        setAdminNotes('');
        setShowApprovalModal(true);
    };

    const handleApprove = async () => {
        if (!selectedUser) return;
        
        setProcessingUserId(selectedUser.id);
        try {
            const res = await api.post('/users/approve', { 
                userId: selectedUser.id, 
                adminId,
                adminNotes: adminNotes || 'Approved by admin'
            });
            
            if (res.data.success) {
                toast.success(`✅ User "${selectedUser.name}" approved successfully!`);
                fetchAllUserSets();
                setShowApprovalModal(false);
            } else {
                toast.error(res.data.message || 'Approval failed');
            }
        } catch (error) {
            console.error('Approval error:', error);
            toast.error('Approval failed');
        } finally {
            setProcessingUserId(null);
        }
    };

    // Rejection Modal Functions
    const openRejectionModal = (userData) => {
        setSelectedUser(userData);
        setRejectionReason('');
        setShowRejectionModal(true);
    };

    const handleReject = async () => {
        if (!selectedUser || !rejectionReason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        
        setProcessingUserId(selectedUser.id);
        try {
            const res = await api.post('/users/reject', { 
                userId: selectedUser.id, 
                adminId,
                rejectionReason: rejectionReason.trim()
            });
            
            if (res.data.success) {
                toast.success(`❌ User "${selectedUser.name}" rejected`);
                fetchAllUserSets();
                setShowRejectionModal(false);
            } else {
                toast.error(res.data.message || 'Rejection failed');
            }
        } catch (error) {
            console.error('Rejection error:', error);
            toast.error('Rejection failed');
        } finally {
            setProcessingUserId(null);
        }
    };

    // Role Change Modal Functions
    const openRoleModal = (userData) => {
        setSelectedUser(userData);
        setNewRole(userData.role);
        setShowRoleModal(true);
    };

    const handleRoleChange = async () => {
        if (!selectedUser || !newRole || newRole === selectedUser.role) {
            toast.error('Please select a different role');
            return;
        }

        try {
            const res = await api.put(`/users/${selectedUser.id}/role`, {
                role: newRole,
                adminId
            });
            
            if (res.data.success) {
                toast.success(`✅ Role updated: ${selectedUser.name} → ${newRole}`);
                fetchAllUserSets();
                setShowRoleModal(false);
            } else {
                toast.error(res.data.message || 'Role update failed');
            }
        } catch (error) {
            console.error('Role update error:', error);
            toast.error('Role update failed');
        }
    };

    const toggleUserStatus = async (userId, currentStatus, userName) => {
        const newStatus = !currentStatus;
        
        try {
            const res = await api.put(`/users/${userId}/status`, {
                isActive: newStatus,
                adminId
            });
            
            if (res.data.success) {
                toast.success(`✅ User "${userName}" ${newStatus ? 'activated' : 'deactivated'}`);
                fetchAllUserSets();
            } else {
                toast.error(res.data.message || 'Status update failed');
            }
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Status update failed');
        }
    };

    // Role-based access control
    if (!user || user.role !== 'Admin') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600">Only administrators can access user management.</p>
                </div>
            </div>
        );
    }

return (
        <div className="max-w-7xl mx-auto py-6 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600 mt-1">Manage user registrations, approvals, and roles</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Admin: {user?.name}</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {(() => {
                        const total = allUsers.length;
                        const approved = allUsers.filter(isApproved).length;
                        const pending = allUsers.filter(u => (u.approval_status || '').toLowerCase() === 'pending').length;
                        const rejected = allUsers.filter(isRejected).length;
                        const Card = ({ title, value, icon, color }) => (
                            <div className={`rounded-lg border p-4 flex items-center ${color.bg}`}>
                                <div className={`p-2 rounded-md mr-3 ${color.icon}`}>{icon}</div>
                                <div>
                                    <p className="text-sm text-gray-600">{title}</p>
                                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                                </div>
                            </div>
                        );
                        return (
                            <>
                                <Card title="Total Users" value={total} icon="👥" color={{ bg: 'bg-white', icon: 'bg-gray-100' }} />
                                <Card title="Approved" value={approved} icon="✅" color={{ bg: 'bg-white', icon: 'bg-green-100' }} />
                                <Card title="Pending" value={pending} icon="⏳" color={{ bg: 'bg-white', icon: 'bg-yellow-100' }} />
                                <Card title="Rejected" value={rejected} icon="❌" color={{ bg: 'bg-white', icon: 'bg-red-100' }} />
                            </>
                        );
                    })()}
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6">
                    <button
                        onClick={() => setTab('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            tab === 'pending'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Pending Approvals
                        {pendingUsers.length > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingUsers.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            tab === 'all'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        All Users
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading users...</p>
                    </div>
                ) : tab === 'pending' ? (
                    <div className="space-y-4">
                        {pendingUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">✅</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Users</h3>
                                <p className="text-gray-600">All user registrations have been processed.</p>
                            </div>
                        ) : (
                            pendingUsers.map((userData) => (
                                <div key={userData.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{userData.name}</h3>
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                                    {userData.role}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                <div><strong>Email:</strong> {userData.email}</div>
                                                <div><strong>Employee ID:</strong> {userData.emp_id || 'N/A'}</div>
                                                <div><strong>Phone:</strong> {userData.phone || 'Not provided'}</div>
                                                <div><strong>Department:</strong> {userData.department || 'Not provided'}</div>
                                                <div><strong>Requested:</strong> {new Date(userData.created_at).toLocaleDateString()}</div>
                                                <div><strong>Reason:</strong> {userData.request_reason || userData.approval_request_reason || 'No reason provided'}</div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-3 ml-6">
                                            <button
                                                onClick={() => openApprovalModal(userData)}
                                                disabled={processingUserId === userData.id}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                            >
                                                {processingUserId === userData.id ? '⏳ Processing...' : '✅ Approve'}
                                            </button>
                                            <button
                                                onClick={() => openRejectionModal(userData)}
                                                disabled={processingUserId === userData.id}
                                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                            >
                                                {processingUserId === userData.id ? '⏳ Processing...' : '❌ Reject'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Department</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Approved By</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map((userData) => (
                                    <tr key={userData.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{userData.name}</div>
                                                <div className="text-sm text-gray-600">{userData.email}</div>
                                                <div className="text-xs text-gray-500">
                                                    {userData.phone || 'No phone'} • {userData.emp_id || 'No ID'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {/* Only show role button if user is not rejected */}
                                            {shouldShowActions(userData) ? (
                                                <button
                                                    onClick={() => openRoleModal(userData)}
                                                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded-full transition-colors cursor-pointer"
                                                >
                                                    {userData.role}
                                                </button>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                                                    {userData.role}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-2">
                                                {/* Status badge with proper colors */}
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(userData.approval_status)}`}>
                                                    {formatStatus(userData.approval_status)}
                                                </span>
                                                
{/* Active/Inactive indicator - show only for approved users */}
                                                {isApproved(userData) && (
                                                    <button
                                                        onClick={() => toggleUserStatus(userData.id, userData.is_active, userData.name)}
                                                        className={`w-4 h-4 rounded-full ${
                                                            userData.is_active ? 'bg-green-500' : 'bg-gray-400'
                                                        } transition-colors hover:scale-110`}
                                                        title={userData.is_active ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {userData.department || 'Not specified'}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {userData.approved_at ? new Date(userData.approved_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {userData.approved_by_name || '-'}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex justify-center space-x-2">
{/* Actions: enable only for approved users. For pending/rejected show nothing. */}
                                                {isApproved(userData) ? (
                                                    <>
                                                        <button
                                                            onClick={() => openRoleModal(userData)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                                                        >
                                                            Edit Role
                                                        </button>
                                                        <button
                                                            onClick={() => toggleUserStatus(userData.id, userData.is_active, userData.name)}
                                                            className={`text-sm font-medium transition-colors ${
                                                                userData.is_active 
                                                                    ? 'text-red-600 hover:text-red-800' 
                                                                    : 'text-green-600 hover:text-green-800'
                                                            }`}
                                                        >
                                                            {userData.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Approve User Registration
                        </h3>
                        <div className="mb-4">
                            <p className="text-gray-600 mb-2">
                                Are you sure you want to approve <strong>{selectedUser?.name}</strong> ({selectedUser?.role})?
                            </p>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    rows="3"
                                    placeholder="Add any notes about this approval..."
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowApprovalModal(false)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingUserId === selectedUser?.id}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                            >
                                {processingUserId === selectedUser?.id ? 'Approving...' : 'Approve User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Reject User Registration
                        </h3>
                        <div className="mb-4">
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to reject <strong>{selectedUser?.name}</strong> ({selectedUser?.role})?
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                    rows="3"
                                    placeholder="Please provide a reason for rejection..."
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingUserId === selectedUser?.id || !rejectionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                            >
                                {processingUserId === selectedUser?.id ? 'Rejecting...' : 'Reject User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Change Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Change User Role
                        </h3>
                        <div className="mb-4">
                            <p className="text-gray-600 mb-4">
                                Change role for <strong>{selectedUser?.name}</strong>
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select New Role
                                </label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Employee">Employee</option>
                                    <option value="Vendor">Vendor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRoleModal(false)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRoleChange}
                                disabled={!newRole || newRole === selectedUser?.role}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                            >
                                Update Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Add this import
import DashboardStats from '../components/Dashboard/DashboardStats';
import api from '../utils/api';
import ContractNotifications from '../components/Dashboard/ContractNotifications';
import toast from 'react-hot-toast'; // Add for feedbackz

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate(); // Add this hook
const [recentActivity, setRecentActivity] = useState([]);
    const [showActivityModal, setShowActivityModal] = useState(false);

    // Close modal on ESC key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') setShowActivityModal(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);
    const [contractStats, setContractStats] = useState({
        total: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0
    });

    // ... your existing useEffect and fetchContractStats code stays the same
    useEffect(() =>  {
        fetchContractStats();
        const stored = localStorage.getItem('igl_recent_activity');
        if (stored) {
            try {
                setRecentActivity(JSON.parse(stored));
            } catch {
                setRecentActivity([]);
            }
        } else {
            const seed = [
                { action: 'Approved user registration for John Doe', time: '5 minutes ago', icon: 'fas fa-user-check' },
                { action: 'Updated system settings', time: '15 minutes ago', icon: 'fas fa-cog' },
                { action: 'Generated monthly report', time: '32 minutes ago', icon: 'fas fa-file-alt' },
                { action: 'Changed password', time: '1 hour ago', icon: 'fas fa-key' }
            ];
            setRecentActivity(seed);
            localStorage.setItem('igl_recent_activity', JSON.stringify(seed));
        }
        // keep list limited to 7 initially
        setRecentActivity(prev => (prev || []).slice(0, 7));
    }, []);
    const fetchContractStats = async () => {
        try {
            const response = await api.get('/contracts/stats/dashboard');
            if (response.data.success) {
                setContractStats(response.data.stats);
            }
        } catch (error) {
            console.error('Error fetching contract stats:', error);
            try {
                const contractsResponse = await api.get('/contracts');
                const contracts = contractsResponse.data.contracts || [];
                setContractStats({
                    total: contracts.length,
                    active: contracts.filter(c => c.calculated_status === 'Active').length,
                    expired: contracts.filter(c => c.calculated_status === 'Expired').length,
                    expiringSoon: contracts.filter(c => c.calculated_status === 'Expiring Soon').length
                });
            } catch (fallbackError) {
                // Keep default 0 values if both APIs fail
            }
        }
    };

    const getWelcomeMessage = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getRoleSpecificContent = () => {
        switch (user?.role) {
            case 'Admin':
                return {
                    title: 'Administrator Dashboard',
                    description: 'Manage contracts, users, and system settings',
                    color: 'from-blue-600 to-blue-700',
                    icon: 'fa-user-shield',
                    quickActions: [
                        { name: 'Manage Users', icon: 'fas fa-users', color: 'bg-blue-500 hover:bg-blue-600', route: '/users' },
                        { name: 'System Settings', icon: 'fas fa-cog', color: 'bg-purple-500 hover:bg-purple-600', route: '/settings' },
                        { name: 'Add Contract', icon: 'fas fa-plus-circle', color: 'bg-orange-500 hover:bg-orange-600', route: '/contracts' },
                        { name: 'Help & Support', icon: 'fas fa-question-circle', color: 'bg-green-500 hover:bg-green-600', route: '/help' }
                    ]
                };
            case 'Employee':
                return {
                    title: 'Employee Dashboard',
                    description: 'View your assigned tasks and contract details',
                    color: 'from-green-600 to-green-700',
                    icon: 'fa-user-tie',
                    quickActions: [
                        { name: 'My Tasks', icon: 'fas fa-tasks', color: 'bg-blue-500 hover:bg-blue-600', route: '/tasks' },
                        { name: 'View Contracts', icon: 'fas fa-file-contract', color: 'bg-purple-500 hover:bg-purple-600', route: '/contracts' },
                        { name: 'Manage Vendors', icon: 'fas fa-handshake', color: 'bg-indigo-500 hover:bg-indigo-600', route: '/vendor-contracts' },
                        { name: 'Settings', icon: 'fas fa-cog', color: 'bg-green-500 hover:bg-green-600', route: '/settings' }
                    ]
                };
            case 'Vendor':
                return {
                    title: 'Vendor Dashboard',
                    description: 'Manage your service contracts and payments',
                    color: 'from-purple-600 to-purple-700',
                    icon: 'fa-user-cog',
                    quickActions: [
                        { name: 'My Contracts', icon: 'fas fa-handshake', color: 'bg-blue-500 hover:bg-blue-600', route: '/vendor-contracts' },
                        { name: 'Submit Invoice', icon: 'fas fa-receipt', color: 'bg-green-500 hover:bg-green-600', route: '/invoices' },
                        { name: 'Payment Status', icon: 'fas fa-credit-card', color: 'bg-purple-500 hover:bg-purple-600', route: '/payments' }
                    ]
                };
            default:
                return {
                    title: 'Dashboard',
                    description: 'Welcome to IGL AMC System',
                    color: 'from-gray-600 to-gray-700',
                    icon: 'fa-tachometer-alt',
                    quickActions: []
                };
        }
    };

    // Updated handleQuickAction with navigation
    const handleQuickAction = (action) => {
        const verb = /view|report|contract|user|task|payment/i.test(action.name) ? 'Opened' : 'Visited';
        const newActivity = {
            action: `${verb} ${action.name}`,
            time: 'Just now',
            icon: action.icon
        };
        setRecentActivity(prev => {
            const updated = [newActivity, ...(prev || [])].slice(0, 7);
            localStorage.setItem('igl_recent_activity', JSON.stringify(updated));
            return updated;
        });

        if (action.route) {
            navigate(action.route);
            toast.success(`${verb} ${action.name}`);
        } else {
            toast.info(`${action.name} feature coming soon!`);
        }
    };

    const roleContent = getRoleSpecificContent();

    return (
        <div className="min-h-screen">
            <div className="space-y-6">
                {/* Header Section - same as before */}
                <div className={`bg-gradient-to-r ${roleContent.color} rounded-xl shadow-lg text-white p-6 relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white rounded-full"></div>
                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white rounded-full"></div>
                    </div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-2">
                                {getWelcomeMessage()}, {user?.name}!
                                <span className="inline-block ml-2">👋</span>
                            </h1>
                            <p className="text-xl opacity-90 mb-2">{roleContent.title}</p>
                            <p className="opacity-75 text-sm mb-4">{roleContent.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                                    <i className="fas fa-id-badge"></i>
                                    <span>{user?.empId}</span>
                                </div>
                                <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                                    <i className="fas fa-building"></i>
                                    <span>{user?.department || 'IGL AMC'}</span>
                                </div>
                                <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                                    <i className="fas fa-calendar"></i>
                                    <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <i className={`fas ${roleContent.icon} text-4xl opacity-75`}></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Analytics */}
                <DashboardStats limited={false} />

                {/* Quick Actions and Recent Activity Row - Side by Side for Employee */}
                {user?.role === 'Employee' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-96">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
                                <span className="text-xs text-gray-500">Frequently used features</span>
                            </div>
                            <div className="grid gap-3 grid-cols-1">
                                {roleContent.quickActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickAction(action)}
                                        className={`${action.color} text-white p-3 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg group flex items-center h-16`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                                <i className={`${action.icon} text-lg`}></i>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-sm">{action.name}</p>
                                                <p className="text-xs opacity-80">Click to navigate</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-96 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                                <button onClick={() => setShowActivityModal(true)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View All</button>
                            </div>
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                {recentActivity.map((item, index) => (
                                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className={`${item.icon} text-blue-600 text-sm`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">{item.action}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Original layout for Admin and other roles */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 h-64 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
                                    <span className="text-xs text-gray-500">Frequently used features</span>
                                </div>
                                <div className={`grid gap-2 flex-1 ${roleContent.quickActions.length === 1 ? 'grid-cols-1 place-items-center' : 'grid-cols-2'}`}>
                                    {roleContent.quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickAction(action)}
                                            className={`${action.color} text-white p-3 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg group flex items-center h-20`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                                    <i className={`${action.icon} text-lg`}></i>
                                                </div>
                                            <div className="text-left">
                                                    <p className="font-semibold text-sm">{action.name}</p>
                                                    <p className="text-xs opacity-80">Click to navigate</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {roleContent.quickActions.length === 3 && (
                                        <div className="col-span-2 flex justify-center">
                                            {/* spacer to center the third item visually */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Health Score section for non-employee roles */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 h-64 flex flex-col justify-between">
                                <h3 className="text-base font-bold text-gray-900 mb-2">Health Score</h3>
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="text-center mb-2">
                                        <div className="text-2xl font-bold text-green-600 mb-1">
                                            {contractStats.total > 0 ? Math.round((contractStats.active / contractStats.total) * 100) : 0}%
                                        </div>
                                        <div className="text-xs text-gray-500 mb-1">System Health</div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${contractStats.total > 0 ? (contractStats.active / contractStats.total) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between items-center p-1 bg-gray-50 rounded">
                                            <span className="text-gray-600">Total Contracts</span>
                                            <span className="font-bold text-blue-600">{contractStats.total}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-1 bg-gray-50 rounded">
                                            <span className="text-gray-600">Active Contracts</span>
                                            <span className="font-bold text-green-600">{contractStats.active}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-1 bg-gray-50 rounded">
                                            <span className="text-gray-600">Expiring Soon</span>
                                            <span className="font-bold text-orange-600">{contractStats.expiringSoon}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contract Notifications Row - Only for non-employee roles */}
                {user?.role !== 'Employee' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-80 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                                    <button onClick={() => setShowActivityModal(true)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View All</button>
                                </div>
                                <div className="space-y-2 flex-1 overflow-y-auto">
                                    {recentActivity.map((item, index) => (
                                        <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                                <i className={`${item.icon} text-blue-600 text-base`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 text-sm">{item.action}</p>
                                                <p className="text-xs text-gray-500">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-80 flex flex-col">
                                <div className="flex-1 overflow-y-auto">
                                    <ContractNotifications />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Activity Preview Modal */}
            {showActivityModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowActivityModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">All Recent Activity</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowActivityModal(false)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                    <i className="fas fa-arrow-left"></i>
                                    Back
                                </button>
                                <button onClick={() => setShowActivityModal(false)} className="text-gray-600 hover:text-gray-800">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
                            {JSON.parse(localStorage.getItem('igl_recent_activity') || '[]').map((item, idx) => (
                                <div key={idx} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                        <i className={`${item.icon} text-blue-600 text-base`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">{item.action}</p>
                                        <p className="text-xs text-gray-500">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

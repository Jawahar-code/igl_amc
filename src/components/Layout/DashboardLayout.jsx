import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [emergencyDropdownOpen, setEmergencyDropdownOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const emergencyRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emergencyRef.current && !emergencyRef.current.contains(event.target)) {
                setEmergencyDropdownOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNavItems = () => {
        const commonItems = [
            { name: 'Dashboard', path: '/dashboard', icon: 'fas fa-tachometer-alt' },
            { name: 'Settings', path: '/settings', icon: 'fas fa-cog' },
            { name: 'Help', path: '/help', icon: 'fas fa-question-circle' }
        ];

        switch(user?.role) {
            case 'Admin':
                return [
                    ...commonItems.slice(0, 1),
                    { name: 'Contracts', path: '/contracts', icon: 'fas fa-file-contract' },
                    { name: 'Users', path: '/users', icon: 'fas fa-users' },
                    ...commonItems.slice(1)
                ];
            case 'Employee':
                return [
                    ...commonItems.slice(0, 1),
                    { name: 'My Tasks', path: '/tasks', icon: 'fas fa-tasks' },
                    { name: 'Contracts', path: '/contracts', icon: 'fas fa-file-contract' },
                    { name: 'Manage Vendors', path: '/vendor-contracts', icon: 'fas fa-handshake' },
                    ...commonItems.slice(1)
                ];
            default:
                return commonItems;
        }
    };

    const emergencyContacts = [
        { name: 'Fire Dept', number: '101', icon: 'fas fa-fire-extinguisher', color: 'text-red-600' },
        { name: 'Police', number: '100', icon: 'fas fa-shield-alt', color: 'text-blue-600' },
        { name: 'Ambulance', number: '108', icon: 'fas fa-ambulance', color: 'text-green-600' },
        { name: 'Gas Emergency', number: '1906', icon: 'fas fa-gas-pump', color: 'text-orange-600' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Gradient Scrollbar Styles */}
            <style jsx>{`
                /* Custom Gradient Scrollbar */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%);
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #10B981 0%, #F59E0B 100%);
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #059669 0%, #D97706 100%);
                }
                
                .emergency-dropdown {
                    transform-origin: top right;
                    animation: dropdownSlide 0.2s ease-out;
                }
                @keyframes dropdownSlide {
                    from {
                        opacity: 0;
                        transform: translateY(-5px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>

            {/* Fixed Sidebar */}
            <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex-shrink-0 fixed left-0 top-0 h-full z-10">
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-yellow-400 rounded-xl flex items-center justify-center mr-4 shadow-md">
                            <i className="fas fa-industry text-white text-lg"></i>
                        </div>
                        <div>
                            <div className="font-bold text-gray-800 text-lg">IGL AMC</div>
                            <div className="text-xs text-gray-500">Dashboard System</div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <nav className="px-4 py-6 space-y-2 overflow-y-auto" style={{ height: 'calc(100vh - 100px)', scrollbarWidth: 'thin', scrollbarColor: '#10B981 #F3F4F6' }}>
                    {getNavItems().map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`
                                    group relative w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left font-medium
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm border-l-4 border-blue-600' 
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <div className={`
                                    flex items-center justify-center w-5 h-5 transition-all duration-200
                                    ${isActive 
                                        ? 'text-blue-600' 
                                        : 'text-gray-400 group-hover:text-gray-600'
                                    }
                                `}>
                                    <i className={`${item.icon} text-sm`}></i>
                                </div>

                                <span className={`
                                    transition-all duration-200
                                    ${isActive 
                                        ? 'text-blue-700 font-semibold' 
                                        : 'group-hover:translate-x-1'
                                    }
                                `}>
                                    {item.name}
                                </span>

                                {isActive && (
                                    <div className="absolute right-3 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content Area with margin-left for fixed sidebar */}
            <div className="flex-1 flex flex-col ml-64">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {getNavItems().find(item => item.path === location.pathname)?.name || 'Dashboard'}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Welcome back, {user?.name}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                {/* Smaller Emergency Dropdown */}
                                <div className="relative" ref={emergencyRef}>
                                    <button 
                                        onClick={() => setEmergencyDropdownOpen(!emergencyDropdownOpen)}
                                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                                    >
                                        <i className="fas fa-phone animate-pulse"></i>
                                        <span>Emergency</span>
                                        <i className={`fas fa-chevron-down transition-transform duration-200 ${emergencyDropdownOpen ? 'rotate-180' : ''}`}></i>
                                    </button>

                                    {emergencyDropdownOpen && (
                                        <div className="emergency-dropdown absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                                            <div className="p-3 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
                                                <h3 className="text-sm font-bold text-red-900 flex items-center">
                                                    <i className="fas fa-exclamation-triangle text-red-600 mr-2 text-sm"></i>
                                                    Emergency Contacts
                                                </h3>
                                            </div>
                                            <div className="py-1">
                                                {emergencyContacts.map((contact, index) => (
                                                    <div key={index} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center space-x-2">
                                                            <i className={`${contact.icon} ${contact.color} text-sm`}></i>
                                                            <span className="text-sm font-medium text-gray-800">{contact.name}</span>
                                                        </div>
                                                        <a 
                                                            href={`tel:${contact.number}`}
                                                            className={`${contact.color} font-mono text-xs font-bold hover:underline`}
                                                        >
                                                            {contact.number}
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Dropdown */}
                                <div className="relative" ref={profileRef}>
                                    <button
                                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                        className="flex items-center space-x-3 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 group"
                                    >
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${user?.name}&background=6b7280&color=fff`}
                                            alt={user?.name}
                                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
                                        />
                                        <div className="flex flex-col text-left">
                                            <span className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</span>
                                            <span className="text-xs text-gray-500">{user?.role}</span>
                                        </div>
                                        <i className={`fas fa-chevron-down text-gray-500 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}></i>
                                    </button>

                                    {profileDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-300 z-50 overflow-hidden">
                                            <div className="p-4 bg-gray-100 border-b border-gray-200">
                                                <div className="flex items-center space-x-3">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${user?.name}&background=6b7280&color=fff&size=48`}
                                                        alt={user?.name}
                                                        className="w-12 h-12 rounded-full border-3 border-white shadow-md"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{user?.name}</p>
                                                        <p className="text-sm text-gray-600">{user?.email}</p>
                                                        <p className="text-xs text-gray-500">{user?.empId}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="py-2 bg-gray-50">
                                                <button onClick={() => { setProfileDropdownOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors flex items-center space-x-3">
                                                    <i className="fas fa-user text-gray-500 w-4"></i>
                                                    <span>Profile Settings</span>
                                                </button>
                                                <button onClick={() => { setProfileDropdownOpen(false); navigate('/dashboard'); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors flex items-center space-x-3">
                                                    <i className="fas fa-bell text-gray-500 w-4"></i>
                                                    <span>Notifications</span>
                                                </button>
                                                <button onClick={() => { setProfileDropdownOpen(false); navigate('/help'); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors flex items-center space-x-3">
                                                    <i className="fas fa-question-circle text-gray-500 w-4"></i>
                                                    <span>Help & Support</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={logout}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Main Content */}
                <main className="flex-1 p-6 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

        </div>
    );
};

export default DashboardLayout;

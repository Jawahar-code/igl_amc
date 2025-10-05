import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    
    // Profile Update States
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        department: ''
    });
    const [isProfileUpdating, setIsProfileUpdating] = useState(false);

    // Password Reset States
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isPasswordChanging, setIsPasswordChanging] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Preferences States
    const [preferences, setPreferences] = useState({
        notifications: {
            email: JSON.parse(localStorage.getItem('emailNotifications') || 'true'),
            push: JSON.parse(localStorage.getItem('pushNotifications') || 'true'),
            contractExpiry: JSON.parse(localStorage.getItem('contractExpiryNotifications') || 'true'),
            userUpdates: JSON.parse(localStorage.getItem('userUpdateNotifications') || 'true')
        },
        display: {
            dateFormat: localStorage.getItem('dateFormat') || 'DD/MM/YYYY',
            timezone: localStorage.getItem('timezone') || 'Asia/Kolkata',
            itemsPerPage: parseInt(localStorage.getItem('itemsPerPage') || '10')
        },
        privacy: {
            profileVisibility: localStorage.getItem('profileVisibility') || 'team',
            activityTracking: JSON.parse(localStorage.getItem('activityTracking') || 'true'),
            dataSharing: JSON.parse(localStorage.getItem('dataSharing') || 'false')
        }
    });

    // Initialize profile data
    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                department: user.department || ''
            });
        }
    }, [user]);

    // Handle Profile Update
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        
        if (!profileData.name.trim() || !profileData.email.trim()) {
            toast.error('Name and email are required');
            return;
        }

        setIsProfileUpdating(true);
        try {
            // Try multiple endpoint variations for profile update
            let response;
            
            try {
                // Primary endpoint
                response = await api.put('/users/profile', {
                    name: profileData.name.trim(),
                    email: profileData.email.trim(),
                    phone: profileData.phone.trim(),
                    department: profileData.department.trim()
                });
            } catch (error) {
                if (error.response?.status === 404) {
                    // Fallback endpoint
                    response = await api.put(`/users/${user.id}`, {
                        name: profileData.name.trim(),
                        email: profileData.email.trim(),
                        phone: profileData.phone.trim(),
                        department: profileData.department.trim()
                    });
                } else {
                    throw error;
                }
            }

            if (response?.data?.success || response?.data?.user || response?.status === 200) {
                toast.success('✅ Profile updated successfully!');
                
                // Update local user data if available from response
                if (response.data?.user) {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const updatedUser = { ...currentUser, ...response.data.user };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            } else {
                toast.error(response?.data?.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            if (error.response?.status === 404) {
                toast.error('Profile update endpoint not found. Please contact administrator.');
            } else if (error.response?.status === 403) {
                toast.error('You do not have permission to update this profile.');
            } else if (error.response?.status === 400) {
                toast.error(error.response.data?.message || 'Invalid profile data provided.');
            } else {
                toast.error('Failed to update profile. Please try again.');
            }
        } finally {
            setIsProfileUpdating(false);
        }
    };

    // Handle Password Change
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('All password fields are required');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters long');
            return;
        }

        if (passwordData.newPassword === passwordData.currentPassword) {
            toast.error('New password must be different from current password');
            return;
        }

        setIsPasswordChanging(true);
        try {
            // Try multiple endpoint variations for password change
            let response;
            
            try {
                // Primary endpoint
                response = await api.put('/users/change-password', {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                });
            } catch (error) {
                if (error.response?.status === 404) {
                    // Fallback endpoint
                    response = await api.put('/auth/change-password', {
                        currentPassword: passwordData.currentPassword,
                        newPassword: passwordData.newPassword,
                        userId: user.id
                    });
                } else {
                    throw error;
                }
            }

            if (response?.data?.success || response?.status === 200) {
                toast.success('✅ Password changed successfully!');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setTimeout(() => {
                    toast.success('Please log in with your new password');
                    logout();
                }, 2000);
            } else {
                toast.error(response?.data?.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Password change error:', error);
            if (error.response?.status === 400 || error.response?.status === 401) {
                toast.error(error.response.data?.message || 'Current password is incorrect');
            } else if (error.response?.status === 403) {
                toast.error('You do not have permission to change password.');
            } else {
                toast.error('Failed to change password. Please try again.');
            }
        } finally {
            setIsPasswordChanging(false);
        }
    };

    // Handle Preference Updates
    const updatePreference = (category, key, value) => {
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));

        // Save to localStorage
        if (category === 'notifications') {
            localStorage.setItem(`${key}Notifications`, JSON.stringify(value));
        } else if (category === 'display') {
            localStorage.setItem(key, value.toString());
        } else if (category === 'privacy') {
            localStorage.setItem(key, JSON.stringify(value));
        }

        toast.success('Preference updated!');
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const tabs = [
        { id: 'profile', name: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'security', name: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: 'notifications', name: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        { id: 'preferences', name: 'Preferences', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' },
        { id: 'privacy', name: 'Privacy', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
    ];

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">{user?.role}: {user?.name}</span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Tab Content with Smooth Transitions */}
                <div className="relative">
                    {/* Profile Tab */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        activeTab === 'profile' 
                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                            : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'
                    }`}>
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">👤 Profile Information</h3>
                                    <p className="text-blue-700 text-sm">Update your personal information and contact details.</p>
                                </div>

                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={profileData.email}
                                                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                placeholder="+91 9876543210"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Department
                                            </label>
                                            <select
                                                value={profileData.department}
                                                onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                            >
                                                <option value="">Select Department</option>
                                                <option value="Engineering">Engineering</option>
                                                <option value="Operations">Operations</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Safety">Safety</option>
                                                <option value="Administration">Administration</option>
                                                <option value="IT">IT</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isProfileUpdating}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center transform hover:scale-105"
                                        >
                                            {isProfileUpdating ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Update Profile
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Security Tab */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        activeTab === 'security' 
                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                            : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'
                    }`}>
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-red-900 mb-2">🔒 Change Password</h3>
                                    <p className="text-red-700 text-sm">Update your account password. You'll be logged out after changing your password.</p>
                                </div>

                                <form onSubmit={handlePasswordChange} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Current Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.current ? 'text' : 'password'}
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('current')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                <svg className={`h-5 w-5 transition-colors duration-200 ${showPasswords.current ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords.current ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            New Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                minLength="6"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('new')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                <svg className={`h-5 w-5 transition-colors duration-200 ${showPasswords.new ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords.new ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirm New Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                <svg className={`h-5 w-5 transition-colors duration-200 ${showPasswords.confirm ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords.confirm ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setPasswordData({
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: ''
                                            })}
                                            className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-all duration-200 transform hover:scale-105"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPasswordChanging}
                                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center transform hover:scale-105"
                                        >
                                            {isPasswordChanging ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Changing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    Change Password
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Notifications Tab */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        activeTab === 'notifications' 
                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                            : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'
                    }`}>
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">🔔 Notification Preferences</h3>
                                    <p className="text-yellow-700 text-sm">Choose what notifications you want to receive and how.</p>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                                        { key: 'push', label: 'Browser Notifications', description: 'Show notifications in your browser' },
                                        { key: 'contractExpiry', label: 'Contract Expiry Alerts', description: 'Get notified when contracts are expiring' },
                                        { key: 'userUpdates', label: 'User Activity Updates', description: 'Notifications about user registrations and updates' }
                                    ].map(notification => (
                                        <div key={notification.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">{notification.label}</h4>
                                                <p className="text-sm text-gray-500">{notification.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.notifications[notification.key]}
                                                    onChange={(e) => updatePreference('notifications', notification.key, e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors duration-200"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preferences Tab */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        activeTab === 'preferences' 
                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                            : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'
                    }`}>
                        {activeTab === 'preferences' && (
                            <div className="space-y-6">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-green-900 mb-2">⚙️ Display Preferences</h3>
                                    <p className="text-green-700 text-sm">Customize how data is displayed in tables and forms.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                                        <select
                                            value={preferences.display.dateFormat}
                                            onChange={(e) => updatePreference('display', 'dateFormat', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        >
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                        <select
                                            value={preferences.display.timezone}
                                            onChange={(e) => updatePreference('display', 'timezone', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        >
                                            <option value="Asia/Kolkata">India Standard Time (IST)</option>
                                            <option value="UTC">Coordinated Universal Time (UTC)</option>
                                            <option value="America/New_York">Eastern Time (ET)</option>
                                            <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Items Per Page</label>
                                        <select
                                            value={preferences.display.itemsPerPage}
                                            onChange={(e) => updatePreference('display', 'itemsPerPage', parseInt(e.target.value))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        >
                                            <option value={5}>5 items</option>
                                            <option value={10}>10 items</option>
                                            <option value={20}>20 items</option>
                                            <option value={50}>50 items</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Privacy Tab */}
                    <div className={`transition-all duration-500 ease-in-out ${
                        activeTab === 'privacy' 
                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                            : 'opacity-0 translate-x-4 pointer-events-none absolute inset-0'
                    }`}>
                        {activeTab === 'privacy' && (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">🛡️ Privacy Settings</h3>
                                    <p className="text-indigo-700 text-sm">Control your privacy and data sharing preferences.</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                                        <select
                                            value={preferences.privacy.profileVisibility}
                                            onChange={(e) => updatePreference('privacy', 'profileVisibility', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                                        >
                                            <option value="public">Public - Visible to all users</option>
                                            <option value="team">Team - Visible to team members only</option>
                                            <option value="private">Private - Only visible to admins</option>
                                        </select>
                                    </div>

                                    {[
                                        { key: 'activityTracking', label: 'Activity Tracking', description: 'Allow system to track your activity for analytics' },
                                        { key: 'dataSharing', label: 'Data Sharing', description: 'Share anonymized usage data to improve the system' }
                                    ].map(privacy => (
                                        <div key={privacy.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">{privacy.label}</h4>
                                                <p className="text-sm text-gray-500">{privacy.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.privacy[privacy.key]}
                                                    onChange={(e) => updatePreference('privacy', privacy.key, e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors duration-200"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;


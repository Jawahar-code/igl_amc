import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (savedUser && token && savedUser !== 'null' && token !== 'null') {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    async function login(loginData) {
        try {
            let email, password, role;
            
            if (typeof loginData === 'object' && loginData !== null) {
                ({ email, password, role } = loginData);
            } else {
                email = loginData;
                password = arguments[1];
                role = arguments[2];
            }
            
            const response = await api.post('/auth/login', { 
                email: email?.toLowerCase(), 
                password, 
                role 
            });
            
            if (response.data.success) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
                // ❌ REMOVED: toast.success() - let SignIn handle it
                return response.data;
            }
        } catch (error) {
            // Do not leak sensitive backend error details
            const errorData = error.response?.data;
            if (errorData) {
                error.errorDetails = {
                    status: errorData.status,
                    message: errorData.message,
                    details: errorData.details
                };
            }
            throw error;
        }
    }

    async function demoLogin(loginData) {
        try {
            console.log('🎭 Demo login called with:', loginData);
            
            let email, password, role;
            
            if (typeof loginData === 'object' && loginData !== null) {
                ({ email, password, role } = loginData);
            } else {
                email = loginData;
                password = arguments[1];
                role = arguments[2];
            }
            
            const response = await api.post('/demo-login', { 
                email: email?.toLowerCase(), 
                password, 
                role 
            });
            
            if (response.data.success) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
                return response.data;
            }
        } catch (error) {
            console.error('🚨 Demo login error:', error);
            // REMOVED: toast.error to prevent duplicates
            throw error;
        }
    }

    async function register(userData) {
        try {
            console.log('📝 Register called with:', userData);
            
            const response = await api.post('/auth/register', userData);
            
            if (response.data.success) {
                toast.success('Registration submitted successfully!');
                return response.data;
            }
        } catch (error) {
            console.error('🚨 Registration error:', error);
            // REMOVED: toast.error to prevent duplicates
            throw error;
        }
    }

    function logout() {
        console.log('👋 Logging out user');
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        toast.success('Logged out successfully');
    }

    // Helper functions
    const isAuthenticated = () => {
        return !!user && !!localStorage.getItem('token');
    };

    const getCurrentRole = () => {
        return user?.role || null;
    };

    const hasRole = (requiredRole) => {
        return user?.role === requiredRole;
    };

    const value = {
        user,
        loading,
        login,
        demoLogin,
        register,
        logout,
        isAuthenticated,
        getCurrentRole,
        hasRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const SignIn = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Login form data
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
        role: ''
    });

    // Forgot password form data
    const [forgotPasswordData, setForgotPasswordData] = useState({
        email: '',
        role: ''
    });

    // SIMPLIFIED: Handle login form submission
    const handleLogin = async (e) => {
        e.preventDefault();
        
        // Simple validation
        const email = loginData.email?.trim();
        const password = loginData.password; // Don't trim password - spaces allowed
        const role = loginData.role?.trim();
        
        if (!email || !password || !role) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            const loginPayload = {
                email: email.toLowerCase(),
                password: password,
                role: role
            };
            
            const result = await login(loginPayload);
            
            if (result.success) {
                toast.success(`Welcome back, ${result.user.name}!`);
                navigate('/dashboard');
            } else {
                // Handle unsuccessful login response
                toast.error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle different error types with single toast
            const errorDetails = error.errorDetails;
            
            if (errorDetails?.status === 'pending_approval') {
                toast.error('Account pending admin approval', {
                    duration: 4000,
                    style: {
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #F59E0B'
                    }
                });
            } else if (errorDetails?.status === 'rejected') {
                toast.error('Account has been rejected', {
                    duration: 4000,
                    style: {
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #EF4444'
                    }
                });
            } else if (error.response?.status === 401) {
                toast.error('Invalid email, password, or role');
            } else if (error.response?.status === 404) {
                toast.error('User not found');
            } else if (error.response?.status === 403) {
                toast.error('Account not approved or suspended');
            } else if (error.request) {
                toast.error('Unable to connect to server');
            } else {
                toast.error(errorDetails?.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle forgot password form submission (only when clicked)
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        
        const email = forgotPasswordData.email?.trim();
        const role = forgotPasswordData.role?.trim();
        
        if (!email || !role) {
            toast.error('Please enter both email and role');
            return;
        }

        setForgotPasswordLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
                email: email.toLowerCase(),
                role: role
            });
            
            if (response.data.success) {
                setForgotPasswordSuccess(true);
                toast.success('Password reset instructions sent to your email!');
            } else {
                toast.error(response.data.message || 'Failed to send reset instructions');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to send reset instructions. Please try again.');
            }
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    // Switch to forgot password view
    const switchToForgotPassword = () => {
        setShowForgotPassword(true);
        setForgotPasswordSuccess(false);
        // Pre-fill email from login form if available
        setForgotPasswordData({
            email: loginData.email,
            role: loginData.role
        });
    };

    // Back to login view
    const backToLogin = () => {
        setShowForgotPassword(false);
        setForgotPasswordData({ email: '', role: '' });
        setForgotPasswordSuccess(false);
    };

    // Demo login credentials handler
    const fillDemoCredentials = (role, email, password) => {
        setLoginData({
            email: email,
            password: password,
            role: role
        });
        toast.success(`Demo ${role.toLowerCase()} credentials filled!`, {
            duration: 2000,
            style: {
                background: '#F0F9FF',
                color: '#0369A1',
                border: '1px solid #0EA5E9'
            }
        });
    };

    // Render forgot password success message
    const renderForgotPasswordSuccess = () => {
        if (!forgotPasswordSuccess) return null;

        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                    <div className="text-green-600 mr-3">
                        <i className="fas fa-check-circle text-lg"></i>
                    </div>
                    <div>
                        <h4 className="text-green-800 font-semibold mb-1">
                            Reset Instructions Sent!
                        </h4>
                        <p className="text-green-700 text-sm mb-2">
                            If an account with this email exists, you will receive password reset instructions.
                        </p>
                        <p className="text-green-600 text-xs">
                            Check your email inbox and spam folder.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // Render forgot password form
    const renderForgotPasswordForm = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-key text-2xl text-orange-600"></i>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Reset Password</h3>
                <p className="text-gray-600">Enter your email and role to receive reset instructions</p>
            </div>

            {/* Success Message */}
            {renderForgotPasswordSuccess()}

            {!forgotPasswordSuccess && (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type *
                        </label>
                        <div className="relative">
                            <select
                                value={forgotPasswordData.role}
                                onChange={(e) => setForgotPasswordData({...forgotPasswordData, role: e.target.value})}
                                className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 appearance-none cursor-pointer hover:border-gray-400"
                                required
                            >
                                <option value="" className="text-gray-500">Select Role</option>
                                <option value="Admin" className="text-gray-900 py-2">👨‍💼 Admin</option>
                                <option value="Employee" className="text-gray-900 py-2">👷‍♂️ Employee</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <i className="fas fa-chevron-down text-gray-400 text-sm"></i>
                            </div>
                        </div>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={forgotPasswordData.email}
                            onChange={(e) => setForgotPasswordData({...forgotPasswordData, email: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                            placeholder="your.email@company.com"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                            forgotPasswordLoading 
                                ? 'bg-gray-400 cursor-not-allowed text-white' 
                                : 'bg-orange-600 hover:bg-orange-700 text-white transform hover:scale-[1.02]'
                        }`}
                    >
                        {forgotPasswordLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Sending Instructions...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane mr-2"></i>
                                Send Reset Instructions
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* Back to Login */}
            <div className="text-center mt-6">
                <button
                    onClick={backToLogin}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                >
                    <i className="fas fa-arrow-left mr-2 transform group-hover:-translate-x-1 transition-transform"></i>
                    Back to Login
                </button>
            </div>
        </div>
    );

    // Render main login form
    const renderLoginForm = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h3>
                <p className="text-gray-600">Sign in to your IGL AMC account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                {/* Role Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Login as *
                    </label>
                    <div className="relative">
                        <select
                            value={loginData.role}
                            onChange={(e) => setLoginData({...loginData, role: e.target.value})}
                            className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 appearance-none cursor-pointer hover:border-gray-400"
                            required
                        >
                            <option value="" className="text-gray-500">Select Role</option>
                            <option value="Admin" className="text-gray-900 py-2">👨‍💼 Admin</option>
                            <option value="Employee" className="text-gray-900 py-2">👷‍♂️ Employee</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <i className="fas fa-chevron-down text-gray-400 text-sm"></i>
                        </div>
                    </div>
                </div>

                {/* Email Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="your.email@company.com"
                        required
                    />
                </div>

                {/* Password Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={loginData.password}
                            onChange={(e) => {
                                // Block spaces in password input
                                const value = e.target.value.replace(/\s/g, '');
                                setLoginData({...loginData, password: value});
                            }}
                            onKeyDown={(e) => {
                                // Prevent space key from being entered
                                if (e.key === ' ' || e.key === 'Spacebar') {
                                    e.preventDefault();
                                }
                            }}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder="Enter your password "
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                        </button>
                    </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex justify-between items-center">
                    <label className="flex items-center text-sm text-gray-600">
                        <input 
                            type="checkbox" 
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                        />
                        Remember me
                    </label>
                    <button
                        type="button"
                        onClick={switchToForgotPassword}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>

                {/* Login Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                        loading 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-[1.02]'
                    }`}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Signing In...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-sign-in-alt mr-2"></i>
                            Sign In
                        </>
                    )}
                </button>
            </form>

            {/* Demo Login Credentials Section */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="text-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center justify-center">
                        <i className="fas fa-rocket text-blue-600 mr-2 text-xs"></i>
                        Quick Demo Login
                    </h4>
                    <p className="text-xs text-gray-500">Click to auto-fill credentials for testing</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* Admin Demo Login */}
                    <button
                        type="button"
                        onClick={() => fillDemoCredentials('Admin', 'adminigl@yopmail.com', 'admin123')}
                        className="group flex flex-col items-center p-3 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                        disabled={loading}
                    >
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200">
                            <i className="fas fa-user-tie text-white text-sm"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors">Admin</span>
                        <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">adminigl@yopmail.com</span>
                    </button>

                    {/* Employee Demo Login */}
                    <button
                        type="button"
                        onClick={() => fillDemoCredentials('Employee', 'empigl@yopmail.com', 'emp123')}
                        className="group flex flex-col items-center p-3 bg-white hover:bg-green-50 border border-green-200 hover:border-green-300 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                        disabled={loading}
                    >
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-200">
                            <i className="fas fa-user-hard-hat text-white text-sm"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-green-700 transition-colors">Employee</span>
                        <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">empigl@yopmail.com</span>
                    </button>
                </div>

                <div className="mt-3 text-center">
                    <p className="text-xs text-gray-400">
                        <i className="fas fa-info-circle mr-1"></i>
                        Development credentials for easy testing
                    </p>
                </div>
            </div>

            {/* Professional Footer */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    Having trouble? Contact{' '}
                    <a href="mailto:adminigl@gmail.com" className="text-blue-600 hover:text-blue-700">
                        adminigl@gmail.com
                    </a>
                </p>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-md mx-auto">
            {showForgotPassword ? renderForgotPasswordForm() : renderLoginForm()}
        </div>
    );
};

export default SignIn;

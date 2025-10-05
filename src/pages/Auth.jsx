import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignIn from '../components/Auth/SignIn';
import SignUp from '../components/Auth/SignUp';
import axios from 'axios';
import toast from 'react-hot-toast';

const Auth = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showContent, setShowContent] = useState(true);
    
    // 🔐 NEW: Forgot Password State
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordData, setForgotPasswordData] = useState({
        email: '',
        role: ''
    });
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

    // Redirect if already logged in
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleToggle = () => {
        if (isTransitioning) return;
        
        setIsTransitioning(true);
        setShowForgotPassword(false); // Reset forgot password when toggling
        setForgotPasswordSuccess(false);
        
        // Phase 1: Fade out text content (200ms)
        setShowContent(false);
        
        // Phase 2: Change state after text fades (250ms)
        setTimeout(() => {
            setIsSignUp(!isSignUp);
        }, 200);
        
        // Phase 3: Fade in new text (350ms)
        setTimeout(() => {
            setShowContent(true);
        }, 250);
        
        // Phase 4: Complete transition (600ms total)
        setTimeout(() => {
            setIsTransitioning(false);
        }, 600);
    };

    // 🔐 NEW: Handle Forgot Password
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        
        if (!forgotPasswordData.email || !forgotPasswordData.role) {
            toast.error('Please provide both email and role');
            return;
        }

        setForgotPasswordLoading(true);

        try {
            const response = await axios.post('/api/auth/forgot-password', forgotPasswordData);
            
            if (response.data.success) {
                setForgotPasswordSuccess(true);
                toast.success('Password reset instructions sent to your email!');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            if (error.response?.data) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to send reset instructions. Please try again.');
            }
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    // 🔐 NEW: Switch to Forgot Password View
    const switchToForgotPassword = () => {
        setShowForgotPassword(true);
        setForgotPasswordSuccess(false);
    };

    // 🔐 NEW: Back to Login
    const backToLogin = () => {
        setShowForgotPassword(false);
        setForgotPasswordData({ email: '', role: '' });
        setForgotPasswordSuccess(false);
    };

    // 🔐 NEW: Render Forgot Password Form
    const renderForgotPasswordForm = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-key text-2xl text-orange-600"></i>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Reset Password</h3>
                <p className="text-gray-600">Enter your email and role to receive reset instructions</p>
            </div>

            {/* Success Message */}
            {forgotPasswordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center">
                        <div className="text-green-600 mr-3">
                            <i className="fas fa-check-circle text-lg"></i>
                        </div>
                        <div>
                            <h4 className="text-green-800 font-semibold mb-1">
                                Reset Instructions Sent!
                            </h4>
                            <p className="text-green-700 text-sm mb-1">
                                If an account with this email exists, you will receive password reset instructions.
                            </p>
                            <p className="text-green-600 text-xs">
                                Check your email inbox and spam folder.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!forgotPasswordSuccess && (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type
                        </label>
                        <select
                            value={forgotPasswordData.role}
                            onChange={(e) => setForgotPasswordData({...forgotPasswordData, role: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                            required
                        >
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="Employee">Employee</option>
                            {/* <option value="Vendor">Vendor</option> */}
                        </select>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={forgotPasswordData.email}
                            onChange={(e) => setForgotPasswordData({...forgotPasswordData, email: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                            placeholder="your.email@igl.co.in"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Enhanced Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100  to-red-100" 
                 style={{ 
                     background: 'linear-gradient(135deg, #dbeafe 0%, #dcfce7 25%, #fef3c7 50%, #fecaca 75%, #e0e7ff 100%)',
                     animation: 'gradientShift 8s ease-in-out infinite'
                 }}>
            </div>
            
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -left-10 w-80 h-80 bg-gradient-to-br from-blue-300/20 to-green-300/15 rounded-full animate-bounce" style={{ animationDuration: '25s' }}></div>
                <div className="absolute top-1/4 -right-16 w-72 h-72 bg-gradient-to-br from-green-300/15 to-yellow-300/10 rounded-full animate-pulse" style={{ animationDelay: '3s', animationDuration: '20s' }}></div>
                <div className="absolute -bottom-8 left-1/3 w-64 h-64 bg-gradient-to-br from-yellow-300/20 to-red-300/10 rounded-full animate-bounce" style={{ animationDelay: '6s', animationDuration: '22s' }}></div>
                <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-br from-red-300/10 to-blue-300/15 rounded-full animate-pulse" style={{ animationDelay: '9s', animationDuration: '18s' }}></div>
            </div>

            {/* Main Auth Container */}
            <div className="relative z-10 w-full max-w-[1400px] mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
                    <div className="relative h-[810px]"> {/* Increased height from 700px to 850px */}
                        
                        {/* Left Panel */}
                        <div className={`
                            absolute top-0 left-0 w-full lg:w-1/2 h-full
                            bg-gradient-to-br ${
                                showForgotPassword 
                                    ? 'from-orange-600 via-orange-700 to-red-600' 
                                    : isSignUp 
                                        ? 'from-green-600 via-blue-700 to-purple-600'
                                        : 'from-blue-600 via-blue-700 to-green-600'
                            }
                            text-white relative overflow-hidden z-10
                            transition-all duration-700 ease-in-out
                            ${isSignUp && !showForgotPassword
                                ? 'lg:translate-x-full' 
                                : 'lg:translate-x-0'
                            }
                        `}>
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-8 right-8 w-32 h-32 border border-white rounded-full animate-spin" style={{ animationDuration: '40s' }}></div>
                                <div className="absolute bottom-8 left-8 w-24 h-24 border border-white rounded-full animate-spin" style={{ animationDuration: '35s', animationDirection: 'reverse' }}></div>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
                            </div>

                            <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-12 py-8">
                                {/* Logo & Title - Always Visible */}
                                <div className="mb-8">
                                    <div className="flex items-center mb-6">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mr-4 transform hover:scale-110 transition-all duration-500">
                                            <i className={`fas ${showForgotPassword ? 'fa-key' : 'fa-industry'} text-3xl transform hover:rotate-12 transition-transform duration-300`}></i>
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-wider">IGL AMC</h1>
                                            <p className={`text-sm font-medium ${
                                                showForgotPassword 
                                                    ? 'text-orange-100' 
                                                    : isSignUp 
                                                        ? 'text-green-100' 
                                                        : 'text-blue-100'
                                            }`}>Dashboard System</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content with Smooth Text Transitions */}
                                <div className={`
                                    transition-all duration-300 ease-in-out transform
                                    ${showContent 
                                        ? 'opacity-100 translate-y-0' 
                                        : 'opacity-0 translate-y-2'
                                    }
                                `}>
                                    {/* Welcome Message */}
                                    <div className="mb-8">
                                        <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                                            {showForgotPassword 
                                                ? 'Reset Your Password!' 
                                                : isSignUp 
                                                    ? 'Join Our Team!' 
                                                    : 'Welcome Back!'
                                            }
                                        </h2>
                                        <p className={`text-lg leading-relaxed ${
                                            showForgotPassword 
                                                ? 'text-orange-100' 
                                                : isSignUp 
                                                    ? 'text-green-100' 
                                                    : 'text-blue-100'
                                        }`}>
                                            {showForgotPassword 
                                                ? "Don't worry! Enter your email and we'll send you reset instructions to get back into your account securely."
                                                : isSignUp 
                                                    ? 'Submit your registration for admin approval and gain access to our comprehensive AMC management system.'
                                                    : 'Access your AMC dashboard to manage contracts, track performance, and oversee operations.'
                                            }
                                        </p>
                                    </div>

                                    {/* Features List */}
                                    <div className="space-y-4 mb-10">
                                        {(showForgotPassword ? [
                                            'Secure Password Reset Process',
                                            'Admin-Verified Identity Check',
                                            'Email-Based Recovery System',
                                            'Account Security Protection'
                                        ] : [
                                            'Contract Management System',
                                            'Real-time Analytics Dashboard',
                                            'Secure Role-based Access', 
                                            'Professional Reporting Tools'
                                        ]).map((feature, index) => (
                                            <div 
                                                key={feature} 
                                                className="flex items-center space-x-3 transform transition-all duration-300 ease-in-out hover:translate-x-3 hover:scale-105"
                                            >
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transform hover:rotate-180 transition-transform duration-500 ${
                                                    showForgotPassword 
                                                        ? 'bg-orange-400' 
                                                        : 'bg-green-400'
                                                }`}>
                                                    <i className={`fas ${showForgotPassword ? 'fa-shield-alt' : 'fa-check'} text-white text-sm`}></i>
                                                </div>
                                                <span className="text-base font-medium">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Toggle Section */}
                                    <div className="pt-8 border-t border-white/20">
                                        <p className={`text-base mb-6 font-medium ${
                                            showForgotPassword 
                                                ? 'text-orange-100' 
                                                : isSignUp 
                                                    ? 'text-green-100' 
                                                    : 'text-blue-100'
                                        }`}>
                                            {showForgotPassword 
                                                ? 'Remember your password?' 
                                                : isSignUp 
                                                    ? 'Already have an approved account?' 
                                                    : "Don't have an account?"
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Button Outside Content Transition - Always Visible */}
                                {!showForgotPassword && (
                                    <button
                                        onClick={handleToggle}
                                        disabled={isTransitioning}
                                        className={`
                                            group relative bg-white/20 hover:bg-white/30 text-white px-10 py-4 rounded-2xl
                                            font-semibold text-lg border border-white/30
                                            transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl
                                            backdrop-blur-lg hover:backdrop-blur-xl
                                            ${isTransitioning 
                                                ? 'opacity-70 scale-95 cursor-wait' 
                                                : 'opacity-100 hover:shadow-white/20'
                                            }
                                        `}
                                    >
                                        {/* Background Glow Effect */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
                                        {/* Button Content with Subtle Animation */}
                                        <div className="relative flex items-center">
                                            <span className="transform group-hover:scale-105 transition-transform duration-300">
                                                {isSignUp ? 'Sign In Instead' : 'Request Access'}
                                            </span>
                                            <i className={`
                                                fas fa-${isSignUp ? 'sign-in-alt' : 'user-plus'} ml-3 
                                                transform group-hover:translate-x-2 group-hover:scale-110 
                                                transition-all duration-300
                                                ${isTransitioning ? 'animate-pulse' : ''}
                                            `}></i>
                                        </div>
                                    </button>
                                )}

                                {/* Back to Login Button (for Forgot Password) */}
                                {showForgotPassword && (
                                    <button
                                        onClick={backToLogin}
                                        className="group relative bg-white/20 hover:bg-white/30 text-white px-10 py-4 rounded-2xl
                                                 font-semibold text-lg border border-white/30
                                                 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl
                                                 backdrop-blur-lg hover:backdrop-blur-xl"
                                    >
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative flex items-center">
                                            <span className="transform group-hover:scale-105 transition-transform duration-300">
                                                Back to Sign In
                                            </span>
                                            <i className="fas fa-arrow-left ml-3 transform group-hover:-translate-x-2 group-hover:scale-110 transition-all duration-300"></i>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className={`
                            absolute top-0 right-0 w-full lg:w-1/2 h-full
                            bg-white transition-transform duration-700 ease-in-out z-10
                            ${isSignUp && !showForgotPassword
                                ? 'lg:-translate-x-full' 
                                : 'lg:translate-x-0'
                            }
                        `}>
                            <div className="h-full flex flex-col justify-center px-12 lg:px-20 py-12 relative">
                                {/* Subtle Background Pattern */}
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute top-10 right-10 w-20 h-20 border border-gray-300 rounded-full animate-pulse" style={{ animationDuration: '6s' }}></div>
                                    <div className="absolute bottom-10 left-10 w-16 h-16 border border-gray-300 rounded-full animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
                                </div>

                                <div className="w-full max-w-2xl mx-auto relative z-10">
                                    {/* Form with Subtle Transition */}
                                    <div className={`
                                        transition-all duration-400 ease-in-out transform
                                        ${showContent 
                                            ? 'opacity-100 scale-100' 
                                            : 'opacity-90 scale-98'
                                        }
                                    `}>
                                        {/* 🔐 RENDER DIFFERENT FORMS BASED ON STATE */}
                                        {showForgotPassword 
                                            ? renderForgotPasswordForm()
                                            : isSignUp 
                                                ? <SignUp /> 
                                                : <SignIn onForgotPassword={switchToForgotPassword} />
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtle Transition Overlay */}
                        <div className={`
                            absolute inset-0 bg-white/5 z-30 pointer-events-none
                            transition-opacity duration-300
                            ${isTransitioning ? 'opacity-100' : 'opacity-0'}
                        `}></div>
                    </div>
                </div>
            </div>

            {/* Enhanced CSS */}
            <style jsx>{`
                @keyframes gradientShift {
                    0% { filter: hue-rotate(0deg) brightness(1); }
                    25% { filter: hue-rotate(90deg) brightness(1.05); }
                    50% { filter: hue-rotate(180deg) brightness(0.95); }
                    75% { filter: hue-rotate(270deg) brightness(1.05); }
                    100% { filter: hue-rotate(360deg) brightness(1); }
                }

                /* Smooth scrollbar for form content */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.4);
                    border-radius: 10px;
                    transition: background-color 0.3s;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(156, 163, 175, 0.7);
                }
            `}</style>
        </div>
    );
};

export default Auth;

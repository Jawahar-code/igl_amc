import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const SignUp = () => {
    const navigate = useNavigate();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
    const [registrationResult, setRegistrationResult] = useState(null);
    
    // Form data state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: '',
        otp: '',
        empId: '',
        phone: '',
        department: '',
        requestReason: ''
    });

    // Error states
    const [errors, setErrors] = useState({});
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Step configuration
    const steps = [
        { number: 1, title: 'Basic\nInfo', icon: 'fas fa-user' },
        { number: 2, title: 'Verification', icon: 'fas fa-shield-alt' },
        { number: 3, title: 'Complete\nDetails', icon: 'fas fa-clipboard-list' },
        { number: 4, title: 'Review &\nSubmit', icon: 'fas fa-check-circle' }
    ];

    // Enhanced validation functions
    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.name.trim() && formData.email.trim() && formData.role;
            case 2:
                return otpVerified && formData.password && 
                       formData.confirmPassword && formData.password === formData.confirmPassword;
            case 3:
                return true;
            case 4:
                return true;
            default:
                return false;
        }
    };

    // Step 1: Request OTP
    const handleRequestOTP = async () => {
        if (!validateStep(1)) {
            toast.error('Please fill in all required fields');
            return;
        }

        setOtpLoading(true);
        setErrors({});

        try {
            const response = await axios.post('http://localhost:5000/api/auth/request-otp', {
                name: formData.name,
                email: formData.email,
                role: formData.role
            });

            if (response.data.success) {
                setOtpSent(true);
                setCurrentStep(2);
                toast.success('OTP sent to your email! Check your inbox.');
            } else {
                setErrors({ general: response.data.message });
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to send OTP. Please try again.';
            setErrors({ general: errorMsg });
            toast.error(errorMsg);
        } finally {
            setOtpLoading(false);
        }
    };

    // Verify OTP only
    const handleVerifyOTP = async () => {
        if (!formData.otp || formData.otp.length !== 6) {
            setOtpError('Please enter a valid 6-digit OTP');
            return;
        }

        setOtpVerifyLoading(true);
        setOtpError('');

        try {
            const response = await axios.post('http://localhost:5000/api/auth/verify-otp-only', {
                email: formData.email,
                otp: formData.otp
            });

            if (response.data.success) {
                setOtpVerified(true);
                toast.success('OTP verified successfully!');
            } else {
                setOtpError(response.data.message);
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Invalid OTP. Please try again.';
            setOtpError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setOtpVerifyLoading(false);
        }
    };

    // Request new OTP
    const handleRequestNewOTP = async () => {
        setOtpLoading(true);
        setOtpError('');
        setFormData({...formData, otp: ''});

        try {
            const response = await axios.post('http://localhost:5000/api/auth/request-otp', {
                name: formData.name,
                email: formData.email,
                role: formData.role
            });

            if (response.data.success) {
                toast.success('New OTP sent to your email!');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error('Failed to send new OTP. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Final registration
    const handleSubmitRegistration = async () => {
        if (!validateStep(2)) {
            toast.error('Please complete OTP verification and password fields');
            return;
        }

        setLoading(true);
        
        try {
            const response = await axios.post('http://localhost:5000/api/auth/verify-otp-and-register', formData);
            
            if (response.data.success) {
                setRegistrationResult(response.data);
                setCurrentStep(4);
                toast.success('Registration completed successfully!');
            } else {
                setErrors({ general: response.data.message });
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
            setErrors({ general: errorMsg });
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Enhanced navigation functions
    const nextStep = () => {
        if (currentStep === 1 && !otpSent) {
            handleRequestOTP();
        } else if (currentStep === 2 && !otpVerified) {
            handleVerifyOTP();
        } else if (currentStep === 2 && otpVerified) {
            setCurrentStep(3);
        } else if (currentStep === 3) {
            handleSubmitRegistration();
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            if (currentStep === 2) {
                setOtpVerified(false);
                setOtpError('');
            }
            setCurrentStep(currentStep - 1);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '', email: '', role: '', password: '', confirmPassword: '',
            otp: '', empId: '', phone: '', department: '', requestReason: ''
        });
        setCurrentStep(1);
        setRegistrationResult(null);
        setOtpSent(false);
        setOtpVerified(false);
        setOtpError('');
        setErrors({});
    };

    // ENHANCED Step 1: Basic Information with role-specific messages
    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Basic Information</h3>
                <p className="text-gray-600 text-sm">Let's start with your basic details</p>
            </div>

            {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-700 text-sm">{errors.general}</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Enter your full name"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="your.email@company.com"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Type *
                    </label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        required
                    >
                        <option value="">Select Account Type</option>
                        <option value="Admin">👨‍💼 Admin</option>
                        <option value="Employee">👷‍♂️ Employee</option>
                        {/* <option value="Vendor">Vendor</option> */}
                        
                    </select>
                    
                    {/* NEW: Role-specific messages */}
                    {formData.role === 'Employee' && (
                        <div className="text-sm text-blue-700 mt-3 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                            <div className="flex items-start">
                                <i className="fas fa-user-tie text-blue-600 mt-0.5 mr-3"></i>
                                <div>
                                    <h4 className="font-semibold mb-1">Employee Account</h4>
                                    <ul className="text-xs space-y-1">
                                        <li>• Access to contract management system</li>
                                        <li>• Real-time analytics dashboard</li>
                                        <li>• Operational reporting tools</li>
                                        <li>• Secure document management</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    
                    {/* {formData.role === 'Vendor' && (
                        <div className="text-sm text-purple-700 mt-3 bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                            <div className="flex items-start">
                                <i className="fas fa-handshake text-purple-600 mt-0.5 mr-3"></i>
                                <div>
                                    <h4 className="font-semibold mb-1">Vendor Account</h4>
                                    <ul className="text-xs space-y-1">
                                        <li>• View and manage your contracts</li>
                                        <li>• Submit proposals and documents</li>
                                        <li>• Track payment and invoice status</li>
                                        <li>• Communication portal with IGL AMC</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )} */}
                    
                    {formData.role === 'Admin' && (
                        <div className="text-sm text-amber-700 mt-3 bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                            <div className="flex items-start">
                                <i className="fas fa-user-shield text-amber-600 mt-0.5 mr-3"></i>
                                <div>
                                    <h4 className="font-semibold mb-1">Administrator Account</h4>
                                    <ul className="text-xs space-y-1 mb-2">
                                        <li>• Full system access and configuration</li>
                                        <li>• User management and permissions & system monitoring and security</li>
                                        <li>• Advanced reporting and analytics</li>
                                        <li>• Admin accounts require approval from existing administrators and additional verification.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!formData.role && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-3 rounded-lg border-l-4 border-gray-300">
                            <i className="fas fa-info-circle mr-1"></i>
                            Please select an account type to see available features and access levels
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    // Step 2: OTP Verification & Security (UNCHANGED)
    const renderStep2 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Email Verification</h3>
                <p className="text-gray-600 text-sm">Enter the OTP sent to your email and create your password</p>
            </div>

            {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-700 text-sm">{errors.general}</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Code *
                    </label>
                    <input
                        type="text"
                        value={formData.otp}
                        onChange={(e) => {
                            setFormData({...formData, otp: e.target.value});
                            if (otpError) setOtpError('');
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none text-center text-lg tracking-widest transition-all duration-300 ${
                            otpError 
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                : otpVerified 
                                    ? 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50'
                                    : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        required
                        disabled={otpVerified}
                    />
                    
                    {otpError && (
                        <p className="text-xs text-red-600 mt-2 flex items-center">
                            <i className="fas fa-exclamation-circle mr-1"></i>
                            {otpError}
                        </p>
                    )}
                    
                    {otpVerified && (
                        <p className="text-xs text-green-600 mt-2 flex items-center">
                            <i className="fas fa-check-circle mr-1"></i>
                            OTP verified successfully!
                        </p>
                    )}
                    
                    {!otpVerified && !otpError && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Check your email for the 6-digit verification code
                        </p>
                    )}

                    <div className="flex justify-between items-center mt-3">
                        <button
                            type="button"
                            onClick={handleRequestNewOTP}
                            disabled={otpLoading}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {otpLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-1"></i>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-redo mr-1"></i>
                                    Request New OTP
                                </>
                            )}
                        </button>

                        {!otpVerified && formData.otp.length === 6 && (
                            <button
                                type="button"
                                onClick={handleVerifyOTP}
                                disabled={otpVerifyLoading}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {otpVerifyLoading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-1"></i>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check mr-1"></i>
                                        Verify OTP
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {otpVerified && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => {
                                        // Block spaces in password input
                                        const value = e.target.value.replace(/\s/g, '');
                                        setFormData({...formData, password: value});
                                    }}
                                    onKeyDown={(e) => {
                                        // Prevent space key from being entered
                                        if (e.key === ' ' || e.key === 'Spacebar') {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                                    placeholder="Create a strong password "
                                    minLength={6}
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
                            <div className={`text-xs mt-1 ${formData.password.length >= 6 ? 'text-green-600' : 'text-gray-500'}`}>
                                <i className={`fas ${formData.password.length >= 6 ? 'fa-check' : 'fa-circle'} mr-1`}></i>
                                Minimum 6 characters
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => {
                                        // Block spaces in confirm password input
                                        const value = e.target.value.replace(/\s/g, '');
                                        setFormData({...formData, confirmPassword: value});
                                    }}
                                    onKeyDown={(e) => {
                                        // Prevent space key from being entered
                                        if (e.key === ' ' || e.key === 'Spacebar') {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                                    placeholder="Confirm your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                                </button>
                            </div>
                            {formData.password && formData.confirmPassword && (
                                <div className={`text-xs mt-1 ${
                                    formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'
                                }`}>
                                    <i className={`fas ${
                                        formData.password === formData.confirmPassword ? 'fa-check' : 'fa-times'
                                    } mr-1`}></i>
                                    {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!otpVerified && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-3"></i>
                            <div>
                                <h4 className="font-semibold text-blue-800 mb-1">Verification Required</h4>
                                <p className="text-blue-700 text-sm">Please verify your OTP before proceeding to create your password.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Step 3: Additional Details (UNCHANGED)
    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Additional Details</h3>
                <p className="text-gray-600 text-sm">Complete your profile (optional fields)</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee ID (Optional)
                    </label>
                    <input
                        type="text"
                        value={formData.empId}
                        onChange={(e) => setFormData({...formData, empId: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Auto-generated if not provided"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder="+91-9876543210"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Department
                        </label>
                        <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder="Operations, IT, Safety"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Reason
                    </label>
                    <textarea
                        value={formData.requestReason}
                        onChange={(e) => setFormData({...formData, requestReason: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-300"
                        placeholder="Brief reason for account request"
                        rows="3"
                    />
                </div>
            </div>
        </div>
    );

    // ENHANCED Step 4: Review & Success with role-specific messages
    const renderStep4 = () => {
        if (registrationResult) {
            return (
                <div className="space-y-5">
                    <div className="text-center mb-4">
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                            formData.role === 'Admin' ? 'bg-amber-100' : 
                            /* formData.role === 'Vendor' ? 'bg-purple-100' : */ 'bg-green-100'
                        }`}>
                            <i className={`fas fa-check-circle text-2xl ${
                                formData.role === 'Admin' ? 'text-amber-600' : 
                                /* formData.role === 'Vendor' ? 'text-purple-600' : */ 'text-green-600'
                            }`}></i>
                        </div>
                        <h3 className={`text-2xl font-semibold mb-2 ${
                            formData.role === 'Admin' ? 'text-amber-600' : 
                            /* formData.role === 'Vendor' ? 'text-purple-600' : */ 'text-green-600'
                        }`}>
                            {formData.role === 'Admin' ? 'Admin Registration Submitted!' :
                             /* formData.role === 'Vendor' ? 'Vendor Registration Completed!' : */
                             'Employee Registration Completed!'}
                        </h3>
                        <p className="text-gray-600 text-sm">
                            {formData.role === 'Admin' ? 'Your admin account request has been submitted for review' :
                             /* formData.role === 'Vendor' ? 'Your vendor account has been created and submitted for approval' : */
                             'Your employee account has been created successfully'}
                        </p>
                    </div>

                    <div className={`border rounded-lg p-4 ${
                        formData.role === 'Admin' ? 'bg-amber-50 border-amber-200' :
                        /* formData.role === 'Vendor' ? 'bg-purple-50 border-purple-200' : */
                        'bg-green-50 border-green-200'
                    }`}>
                        <h4 className={`font-semibold mb-3 ${
                            formData.role === 'Admin' ? 'text-amber-800' :
                            /* formData.role === 'Vendor' ? 'text-purple-800' : */
                            'text-green-800'
                        }`}>
                            Registration Summary
                        </h4>
                        <div className="text-sm space-y-2">
                            <div><span className="font-medium">Name:</span> {formData.name}</div>
                            <div><span className="font-medium">Email:</span> {formData.email}</div>
                            <div><span className="font-medium">Role:</span> {formData.role}</div>
                            <div><span className="font-medium">Employee ID:</span> {registrationResult.details?.empId}</div>
                            <div><span className="font-medium">Status:</span> 
                                <span className="text-orange-600 font-medium ml-1">
                                    {formData.role === 'Admin' ? 'Pending Admin Review' : 'Pending Admin Approval'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <h4 className="font-semibold text-blue-800 mb-3">Next Steps</h4>
                    <div className="flex items-center bg-blue-100 border border-blue-200 rounded-lg p-3 my-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center mr-3 text-sm font-bold">
                            <i className="fas fa-info"></i>
                        </span>
                        <span className="text-blue-800 text-sm">
                            Your email has been verified and your account is submitted for approval. Please wait for an email notification once your account is reviewed by the admin team.
                        </span>
                    </div>

                    <div className="flex justify-center space-x-3 pt-2">
                        <button
                            onClick={() => navigate('/auth/SignIn')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300 text-sm"
                        >
                            <i className="fas fa-sign-in-alt mr-2"></i>
                            Go to Login
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-300 text-sm"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Register Another
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-5">
                <div className="text-center mb-6">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                        formData.role === 'Admin' ? 'bg-amber-100' : 
                        /* formData.role === 'Vendor' ? 'bg-purple-100' : */ 'bg-blue-100'
                    }`}>
                        <i className={`fas fa-check-circle text-lg ${
                            formData.role === 'Admin' ? 'text-amber-600' : 
                            /* formData.role === 'Vendor' ? 'text-purple-600' : */ 'text-blue-600'
                        }`}></i>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Review & Submit</h3>
                    <p className="text-gray-600 text-sm">
                        {formData.role === 'Admin' ? 'Please review your admin account request before submitting' :
                         /* formData.role === 'Vendor' ? 'Please review your vendor account information before submitting' : */
                         'Please review your information before submitting'}
                    </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-800 mb-3">Account Information</h4>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Name:</span>
                            <span className="text-gray-900">{formData.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Email:</span>
                            <span className="text-gray-900">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Role:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                formData.role === 'Admin' ? 'bg-amber-100 text-amber-800' :
                                /* formData.role === 'Vendor' ? 'bg-purple-100 text-purple-800' : */
                                'bg-blue-100 text-blue-800'
                            }`}>
                                {formData.role}
                                {formData.role === 'Admin' && <i className="fas fa-crown ml-1"></i>}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Employee ID:</span>
                            <span className="text-gray-900">{formData.empId || 'Auto-generated'}</span>
                        </div>
                        {formData.phone && (
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Phone:</span>
                                <span className="text-gray-900">{formData.phone}</span>
                            </div>
                        )}
                        {formData.department && (
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Department:</span>
                                <span className="text-gray-900">{formData.department}</span>
                            </div>
                        )}
                    </div>
                    {formData.requestReason && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                            <span className="font-medium text-gray-600">Request Reason:</span>
                            <p className="text-gray-900 mt-1 text-sm">{formData.requestReason}</p>
                        </div>
                    )}
                </div>

                {/* NEW: Role-specific review messages */}
                <div className={`border rounded-lg p-4 ${
                    formData.role === 'Admin' ? 'bg-amber-50 border-amber-200' :
                    /* formData.role === 'Vendor' ? 'bg-purple-50 border-purple-200' : */
                    'bg-yellow-50 border-yellow-200'
                }`}>
                    <div className="flex items-start">
                        <i className={`fas fa-exclamation-triangle mt-0.5 mr-3 ${
                            formData.role === 'Admin' ? 'text-amber-600' :
                            /* formData.role === 'Vendor' ? 'text-purple-600' : */
                            'text-yellow-600'
                        }`}></i>
                        <div>
                            <h4 className={`font-semibold mb-1 ${
                                formData.role === 'Admin' ? 'text-amber-800' :
                                /* formData.role === 'Vendor' ? 'text-purple-800' : */
                                'text-yellow-800'
                            }`}>
                                {formData.role === 'Admin' ? 'Admin Account Notice' :
                                 /* formData.role === 'Vendor' ? 'Vendor Account Notice' : */
                                 'Important Notice'}
                            </h4>
                            <ul className={`text-xs space-y-1 ${
                                formData.role === 'Admin' ? 'text-amber-700' :
                                /* formData.role === 'Vendor' ? 'text-purple-700' : */
                                'text-yellow-700'
                            }`}>
                                {formData.role === 'Admin' ? (
                                    <>
                                        <li>• Admin accounts undergo thorough security review</li>
                                        <li>• Additional verification steps may be required</li>
                                        <li>• Review process typically takes 3-5 business days</li>
                                        <li>• You will receive detailed approval notification</li>
                                    </>
                                ) /* : formData.role === 'Vendor' ? (
                                    <>
                                        <li>• Vendor accounts are reviewed for contract eligibility</li>
                                        <li>• You may be contacted for additional documentation</li>
                                        <li>• Approval process typically takes 1-3 business days</li>
                                        <li>• Portal access will be granted upon approval</li>
                                    </>
                                ) */ : (
                                    <>
                                        <li>• Employee accounts are processed quickly</li>
                                        <li>• Approval typically within 24 hours</li>
                                        <li>• Full system access upon approval</li>
                                        <li>• Welcome email with getting started guide</li>
                                    </>
                                )}
                                <li>• Email has been verified successfully</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex items-center bg-blue-100 border border-blue-200 rounded-lg p-3 my-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center mr-3 text-sm font-bold">
                        <i className="fas fa-info"></i>
                    </span>
                    <span className="text-blue-800 text-sm">
                        Your email has been verified and your account is submitted for approval. Please wait for an email notification once your account is reviewed by the admin team.
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4">
            {/* Progress Steps */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-300 -z-10"></div>
                    <div 
                        className="absolute top-3 left-3 h-0.5 bg-blue-600 transition-all duration-500 -z-10"
                        style={{ 
                            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
                        }}
                    ></div>

                    <div className="flex justify-between items-start">
                        {steps.map((step) => (
                            <div key={step.number} className="flex flex-col items-center relative">
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 transform relative z-10
                                    ${currentStep >= step.number 
                                        ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' 
                                        : 'border-gray-300 text-gray-400 bg-white'
                                    }
                                `}>
                                    <i className={`${step.icon} text-xs`}></i>
                                </div>
                                
                                <div className={`
                                    mt-2 text-xs font-medium transition-colors duration-300 text-center whitespace-pre-line max-w-16
                                    ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-600'}
                                `}>
                                    {step.title}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-8 pt-6 pb-4">
                    <div className="min-h-[420px] flex flex-col justify-start">
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                        {currentStep === 4 && renderStep4()}
                    </div>
                </div>

                {/* Navigation Buttons */}
                {!registrationResult && (
                    <div className="px-8 pb-6">
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className={`
                                        px-4 py-2 text-gray-600 border border-gray-300 rounded-lg font-medium transition-all duration-300 text-sm
                                        ${currentStep === 1 ? 'invisible' : 'hover:bg-gray-50 hover:border-gray-400'}
                                    `}
                                >
                                    <i className="fas fa-chevron-left mr-1"></i>
                                    Back
                                </button>

                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={loading || otpLoading || otpVerifyLoading || !validateStep(currentStep)}
                                    className={`
                                        px-6 py-2 rounded-lg font-medium transition-all duration-300 transform text-sm
                                        ${(loading || otpLoading || otpVerifyLoading) 
                                            ? 'bg-gray-400 text-white cursor-not-allowed scale-95'
                                            : validateStep(currentStep)
                                                ? currentStep === 1
                                                    ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 shadow-md'
                                                    : currentStep === 2 && !otpVerified
                                                        ? 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 shadow-md'
                                                        : currentStep === 3
                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 shadow-md'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 shadow-md'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {(loading || otpLoading || otpVerifyLoading) ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            {otpLoading ? 'Sending...' : otpVerifyLoading ? 'Verifying...' : 'Processing...'}
                                        </>
                                    ) : currentStep === 1 ? (
                                        <>
                                            <i className="fas fa-paper-plane mr-2"></i>
                                            Send Code
                                        </>
                                    ) : currentStep === 2 && !otpVerified ? (
                                        <>
                                            <i className="fas fa-shield-alt mr-2"></i>
                                            Verify OTP
                                        </>
                                    ) : currentStep === 3 ? (
                                        <>
                                            <i className="fas fa-check mr-2"></i>
                                            Complete
                                        </>
                                    ) : (
                                        <>
                                            Next
                                            <i className="fas fa-chevron-right ml-1"></i>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignUp;
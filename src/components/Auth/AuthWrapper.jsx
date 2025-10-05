import { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';

const AuthWrapper = () => {
    const [isSignUpMode, setIsSignUpMode] = useState(false);

    return (
        <div className="min-h-screen animated-gradient flex items-center justify-center p-6">
            <div className={`relative w-full max-w-6xl h-[750px] bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden transition-all duration-700 ${isSignUpMode ? 'signup-mode' : ''}`}>
                
                {/* Welcome Panel - Left (Default) */}
                <div className={`absolute w-1/2 h-full bg-gradient-to-br from-teal-700 to-teal-800 text-white flex flex-col items-center justify-center px-16 py-12 transition-transform duration-700 ease-in-out ${isSignUpMode ? '-translate-x-full' : 'translate-x-0'}`}>
                    {/* Floating decorative elements */}
                    <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-pulse animation-delay-1000"></div>
                    
                    <div className="text-center z-10">
                        <div className="mb-10">
                            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <i className="fas fa-industry text-5xl"></i>
                            </div>
                            <div className="text-4xl font-bold mb-3">IGL AMC</div>
                            <div className="text-lg opacity-90">Dashboard</div>
                        </div>
                        
                        <h1 className="text-4xl font-bold mb-6">Hello, Friend!</h1>
                        <p className="text-lg opacity-90 mb-10 max-w-md leading-relaxed">
                            Enter your personal details and start your journey with us
                        </p>
                        
                        <button 
                            onClick={() => setIsSignUpMode(true)}
                            className="bg-white/20 hover:bg-white/30 text-white font-semibold py-4 px-10 rounded-xl transition-all duration-300 border border-white/30 hover:scale-105"
                        >
                            SIGN UP
                        </button>
                    </div>
                </div>

                {/* Welcome Panel - Right (Sign Up Mode) */}
                <div className={`absolute w-1/2 h-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex flex-col items-center justify-center px-16 py-12 transition-transform duration-700 ease-in-out ${isSignUpMode ? 'translate-x-0' : 'translate-x-full'}`}>
                    {/* Decorative elements */}
                    <div className="absolute top-16 left-10 w-16 h-16 bg-white/10 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-16 right-16 w-20 h-20 bg-white/10 rounded-full animate-pulse animation-delay-500"></div>
                    
                    <div className="text-center z-10">
                        <h1 className="text-4xl font-bold mb-6">Welcome Back!</h1>
                        <p className="text-lg opacity-90 mb-10 max-w-md leading-relaxed">
                            To keep connected with us please login with your personal info
                        </p>
                        
                        <button 
                            onClick={() => setIsSignUpMode(false)}
                            className="bg-white/20 hover:bg-white/30 text-white font-semibold py-4 px-10 rounded-xl transition-all duration-300 border border-white/30 hover:scale-105"
                        >
                            SIGN IN
                        </button>
                    </div>
                </div>

                {/* Sign In Form - Right (Default) */}
                <div className={`absolute w-1/2 h-full right-0 bg-white transition-transform duration-700 ease-in-out ${isSignUpMode ? 'translate-x-full' : 'translate-x-0'}`}>
                    <SignIn />
                </div>

                {/* Sign Up Form - Right (Hidden, slides in) */}
                <div className={`absolute w-1/2 h-full right-0 bg-white transition-transform duration-700 ease-in-out ${isSignUpMode ? 'translate-x-0' : 'translate-x-full'}`}>
                    <SignUp />
                </div>
            </div>
        </div>
    );
};

export default AuthWrapper;

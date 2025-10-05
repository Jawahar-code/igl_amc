const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Express app FIRST
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 IGL AMC Backend Server Starting...');

// Database connection
const db = require('./config/database');

// Middleware MUST come BEFORE route mounting
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NOW mount routes AFTER middleware
console.log('📂 Loading routes...');

// Load User Routes
try {
    const userRoutes = require('./routes/users');
    app.use('/api/users', userRoutes);
    console.log('✅ User routes loaded successfully');
} catch (error) {
    console.error('❌ Failed to load user routes:', error.message);
}

// Load Contract Routes - REAL ROUTES ONLY
try {
    const contractRoutes = require('./routes/contracts');
    app.use('/api/contracts', contractRoutes);
    console.log('✅ Contract routes loaded successfully - REAL DATABASE DATA');
} catch (error) {
    console.error('❌ Failed to load contract routes:', error.message);
    console.error('❌ Contract routes error details:', error.stack);
    
    // Create fallback contract routes if real routes fail
    app.get('/api/contracts', (req, res) => {
        console.log('⚠️ Using fallback contracts route - contracts.js failed to load');
        res.status(500).json({
            success: false,
            message: 'Contract system temporarily unavailable. Contract routes failed to load.',
            error: error.message
        });
    });
    
    app.get('/api/contracts/stats/dashboard', (req, res) => {
        console.log('⚠️ Using fallback dashboard stats - contracts.js failed to load');
        res.status(500).json({
            success: false,
            message: 'Dashboard stats temporarily unavailable. Contract routes failed to load.',
            error: error.message
        });
    });
}

// Load Auth Routes
try {
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.error('❌ Failed to load auth routes:', error.message);
    
    // Create a fallback login route if auth routes fail
    app.post('/api/auth/login', (req, res) => {
        console.log('⚠️ Using fallback login route - auth.js failed to load');
        res.status(500).json({
            success: false,
            message: 'Authentication system temporarily unavailable. Auth routes failed to load.',
            error: error.message
        });
    });
}

// Load Auth OTP Routes
try {
    const authOTPRoutes = require('./routes/auth-otp');
    app.use('/api/auth', authOTPRoutes);
    console.log('✅ Auth OTP routes loaded successfully');
} catch (error) {
    console.error('❌ Failed to load auth-otp routes:', error.message);
    // This is optional, so just log the error
}

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'IGL AMC API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Demo Login Route
app.post('/api/demo-login', (req, res) => {
    const { email, password, role } = req.body;
    
    console.log('🎭 Demo login attempt:', { email, role });
    
    const demoUsers = {
        'admin@igl.co.in': { 
            password: 'admin123', 
            role: 'Admin', 
            name: 'System Administrator', 
            empId: 'IGL-ADMIN-001'
        },
        'admin@gmail.com': { 
            password: 'admin123', 
            role: 'Admin', 
            name: 'ADMIN', 
            empId: 'ADMIN-001'
        },
        'jawahar.ms2005@gmail.com': { 
            password: 'emp123', 
            role: 'Employee', 
            name: 'Jawahar', 
            empId: 'EMP-001'
        },
        'vendor@gmail.com': { 
            password: 'ven123', 
            role: 'Vendor', 
            name: 'TechVendor Solutions', 
            empId: 'VEN-001'
        }
    };

    const user = demoUsers[email];
    
    if (!user || user.password !== password || user.role !== role) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid demo credentials. Check email, password, and role.' 
        });
    }

    console.log('✅ Demo login successful for:', user.name);
    
    res.json({
        success: true,
        message: `Welcome, ${user.name}!`,
        user: {
            id: Math.floor(Math.random() * 1000) + 10,
            name: user.name,
            email: email,
            role: user.role,
            empId: user.empId,
            phone: '+91-9876543210',
            department: user.role === 'Admin' ? 'IT Administration' : 
                       user.role === 'Employee' ? 'Operations' : 'External Services'
        },
        token: 'demo-token-' + Date.now()
    });
});

// Test OTP Route (for development)
app.post('/api/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address required'
            });
        }

        const emailService = require('./services/emailService');
        const result = await emailService.sendTestEmail(email);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.json({
        message: 'IGL AMC Dashboard API',
        version: '1.0.0',
        status: 'running',
        features: [
            'User Authentication with OTP',
            'Contract Management',
            'Email Notifications', 
            'Admin Approval Workflow'
        ]
    });
});

// Debug Route to Check What Routes Are Actually Loaded
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    
    res.json({
        success: true,
        message: 'Active routes in the application',
        routes: routes,
        routeCount: routes.length
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Enhanced 404 Handler
app.use('*', (req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found: ' + req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/debug/routes',
            'POST /api/demo-login',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/auth/request-otp',
            'POST /api/auth/verify-otp-and-register',
            'GET /api/contracts',
            'POST /api/contracts',
            'PUT /api/contracts/:id',
            'DELETE /api/contracts/:id',
            'GET /api/contracts/stats/dashboard',
            'GET /api/contracts/notifications',
            'POST /api/contracts/send-expiry-alerts',
            'GET /api/users/pending',
            'GET /api/users/all',
            'POST /api/users/approve',
            'POST /api/users/reject',
            'POST /api/test-email'
        ]
    });
});

// Start Server AFTER everything is initialized
app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('🚀 IGL AMC API Server Running');
    console.log('🚀 Port: ' + PORT);
    console.log('🚀 Express: 4.x (Stable)');
    console.log('🚀 Authentication: ✅ Enabled');
    console.log('🚀 Email System: ✅ Enabled');
    console.log('🚀 Contract System: ✅ Real Database');
    console.log('🚀 User Management: ✅ Enabled');
    console.log('🚀 ================================\n');
    
    console.log('📡 Available endpoints:');
    console.log('   Health: http://localhost:' + PORT + '/api/health');
    console.log('   Debug Routes: http://localhost:' + PORT + '/api/debug/routes');
    console.log('   Real Login: http://localhost:' + PORT + '/api/auth/login');
    console.log('   Register: http://localhost:' + PORT + '/api/auth/register');
    console.log('   Request OTP: http://localhost:' + PORT + '/api/auth/request-otp');
    console.log('   Contracts: http://localhost:' + PORT + '/api/contracts');
    console.log('   Dashboard Stats: http://localhost:' + PORT + '/api/contracts/stats/dashboard');
    console.log('   Contract Notifications: http://localhost:' + PORT + '/api/contracts/notifications');
    console.log('   Users: http://localhost:' + PORT + '/api/users/all');
    console.log('   Test Email: http://localhost:' + PORT + '/api/test-email\n');
    
    console.log('🎯 Server ready - Using REAL contract data from database!');
});

module.exports = app;

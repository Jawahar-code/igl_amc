require('dotenv').config({ quiet: true });
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/database');

// 📧 Email Service Integration
const emailService = require('../services/emailService');

console.log('🔑 JWT_SECRET status:', process.env.JWT_SECRET ? '✅ LOADED' : '❌ MISSING');

// @route   POST /api/auth/register
// @desc    Register new user with approval workflow + EMAIL INTEGRATION + DEBUG LOGS
router.post('/register', async (req, res) => {
    try {
        const { 
            name, email, password, confirmPassword, role, 
            empId, phone, department, requestReason 
        } = req.body;

        console.log('🚀 Registration attempt:', { email, role, name });

        // Enhanced Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields: name, email, password, and role' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // SECURITY: Block direct Admin registration
        if (role === 'Admin') {
            console.log('🚨 Blocked Admin registration attempt:', email);
            return res.status(403).json({
                success: false,
                message: 'Admin accounts can only be created by existing administrators. Please contact your system administrator.'
            });
        }

        // Check if user already exists or has pending requests
        const checkUserSql = `
            SELECT id, email, approval_status, is_active 
            FROM users 
            WHERE email = ?
        `;
        
        db.execute(checkUserSql, [email], async (err, results) => {
            if (err) {
                console.error('❌ Database error during user check:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error. Please try again.' 
                });
            }

            if (results.length > 0) {
                const existingUser = results[0];
                console.log('❌ User already exists:', email, 'Status:', existingUser.approval_status);

                let message, suggestion, actionButton;
                switch(existingUser.approval_status) {
                    case 'pending':
                        message = 'Your registration is already pending admin approval.';
                        suggestion = 'Please wait for admin approval. You will receive an email notification once approved.';
                        actionButton = 'Check Email for Updates';
                        break;
                    case 'rejected':
                        message = 'Your previous registration was rejected. Please contact the administrator for more information.';
                        suggestion = 'Please contact the administrator for clarification or submit a new request with different details.';
                        actionButton = 'Contact Support';
                        break;
                    case 'approved':
                        message = 'Welcome back! An account with this email already exists and is approved.';
                        suggestion = 'Please use the login form instead of creating a new account.';
                        actionButton = 'Go to Login';
                        break;
                    default:
                        message = 'An account with this email already exists.';
                        suggestion = 'Please try logging in or use a different email address.';
                        actionButton = 'Go to Login';
                }
                
                return res.status(400).json({ 
                    success: false, 
                    message: message,
                    suggestion: suggestion,
                    actionButton: actionButton,
                    userStatus: existingUser.approval_status,
                    showLoginLink: existingUser.approval_status === 'approved'
                });
            }

            try {
                // Hash password securely
                const saltRounds = 12;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Generate unique employee ID with timestamp to avoid duplicates
                const timestamp = Date.now().toString().slice(-6);
                const generatedEmpId = empId || `${role.toUpperCase()}-${timestamp}`;

                console.log('📋 Generated Employee ID:', generatedEmpId);

                // Insert new user with PENDING status and approval workflow
                const insertUserSql = `
                    INSERT INTO users (
                        name, email, password, role, emp_id, phone, department, 
                        is_active, approval_status, request_reason, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `;
                
                const userData = [
                    name.trim(),
                    email.toLowerCase().trim(),
                    hashedPassword,
                    role,
                    generatedEmpId,
                    phone?.trim() || null,
                    department?.trim() || null,
                    false, // is_active = false until approved
                    'pending', // approval_status = pending
                    requestReason?.trim() || 'Account access request'
                ];

                console.log('🔍 Inserting user with data:', {
                    name: userData[0],
                    email: userData[1],
                    role: userData,
                    empId: userData,
                    phone: userData,
                    department: userData,
                    isActive: userData,
                    approvalStatus: userData
                });

                db.execute(insertUserSql, userData, async (err, result) => {
                    if (err) {
                        console.error('❌ Database Insert Error:', err);
                        console.error('❌ Error Code:', err.code);
                        console.error('❌ Error Message:', err.sqlMessage);

                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ 
                                success: false, 
                                message: 'An account with this email or employee ID already exists' 
                            });
                        }

                        return res.status(500).json({ 
                            success: false, 
                            message: 'Failed to create account. Please try again.' 
                        });
                    }

                    const userId = result.insertId;
                    console.log('✅ Insert user success, new userId:', userId);

                    // 📧 EMAIL FUNCTIONALITY - Send Registration Emails
                    try {
                        console.log('📧 Attempting to send registration emails...');

                        const userEmailResult = await emailService.sendRegistrationConfirmation(email, {
                            name: name,
                            role: role,
                            empId: generatedEmpId
                        });

                        if (userEmailResult.success) {
                            console.log('✅ Registration confirmation email sent to user');
                        }

                        // Send notification to admins
                        const adminSql = 'SELECT email FROM users WHERE role = "Admin" AND is_active = TRUE AND approval_status = "approved"';
                        db.execute(adminSql, async (err, admins) => {
                            if (!err && admins.length > 0) {
                                const adminEmails = admins.map(admin => admin.email);
                                await emailService.sendNewUserRegistration(adminEmails, {
                                    name: name,
                                    email: email,
                                    role: role,
                                    empId: generatedEmpId,
                                    requestReason: requestReason
                                });
                                console.log('✅ Admin notification email sent');
                            }
                        });
                        
                        console.log('📧 Email sending process completed');
                    } catch (emailError) {
                        console.error('❌ Failed to send registration emails:', emailError);
                    }

                    // Success response
                    res.status(201).json({
                        success: true,
                        message: `Registration submitted successfully! Your ${role} account is pending admin approval.`,
                        details: {
                            userId: userId,
                            empId: generatedEmpId,
                            status: 'pending_approval',
                            nextSteps: [
                                'Admin will review your request within 24-48 hours',
                                'You will receive an email notification once approved',
                                'After approval, you can log in with your credentials'
                            ]
                        }
                    });
                });

            } catch (hashError) {
                console.error('❌ Password hashing error:', hashError);
                res.status(500).json({ 
                    success: false, 
                    message: 'Error processing your registration. Please try again.' 
                });
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again later.' 
        });
    }
});

// @route   POST /api/auth/login
// @desc    FIXED: Case-insensitive login (ONE-STOP SOLUTION)
router.post('/login', (req, res) => {
    try {
        const { email, password, role } = req.body;

        console.log('🔐 Login attempt:', { email, role });

        // Input validation
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide email, password, and role' 
            });
        }

        // FIXED: Case-insensitive search for email and role
        const loginSql = `
            SELECT 
                id, name, email, password, role, emp_id, phone, department, 
                is_active, approval_status, created_at, updated_at
            FROM users 
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) 
            AND LOWER(TRIM(role)) = LOWER(TRIM(?))
        `;

        console.log('🔍 Searching database with:', {
            email: email.trim().toLowerCase(),
            role: role.trim().toLowerCase()
        });

        db.execute(loginSql, [email.trim(), role.trim()], async (err, results) => {
            if (err) {
                console.error('❌ Database error during login:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error. Please try again.' 
                });
            }

            console.log('🔍 Database results found:', results.length);

            // User not found
            if (results.length === 0) {
                console.log('❌ User not found with email:', email, 'role:', role);
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found. Please check your email and role.'
                });
            }

            const user = results[0];
            console.log('👤 Found user:', user.email, 'role:', user.role, 'status:', user.approval_status);

            // Check approval status
            if (user.approval_status !== 'approved') {
                console.log('❌ User not approved:', user.approval_status);
                return res.status(403).json({
                    success: false,
                    message: 'Account not approved or suspended',
                    status: user.approval_status
                });
            }

            // Check if active
            if (!user.is_active) {
                console.log('❌ User not active');
                return res.status(403).json({
                    success: false,
                    message: 'Account deactivated'
                });
            }

            // Verify password
            try {
                const isValidPassword = await bcrypt.compare(password, user.password);
                
                if (!isValidPassword) {
                    console.log('❌ Invalid password for user:', email);
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Invalid password'
                    });
                }

                // Create JWT token
                const tokenPayload = {
                    userId: user.id,
                    role: user.role,
                    email: user.email,
                    empId: user.emp_id
                };

                const token = jwt.sign(
                    tokenPayload,
                    process.env.JWT_SECRET || 'fallback-secret-key-igl-amc-2024',
                    { expiresIn: '24h' }
                );

                // Update last login
                db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

                console.log('✅ Successful login:', user.email, 'Role:', user.role);

                // SUCCESS RESPONSE
                res.json({
                    success: true,
                    message: `Welcome back, ${user.name}!`,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        empId: user.emp_id,
                        phone: user.phone,
                        department: user.department
                    }
                });

            } catch (bcryptError) {
                console.error('❌ Password comparison error:', bcryptError);
                res.status(500).json({ 
                    success: false, 
                    message: 'Authentication error. Please try again.' 
                });
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again later.' 
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email (NEW FEATURE)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email, role } = req.body;

        console.log('🔄 Forgot password request:', { email, role });

        if (!email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and role'
            });
        }

        // Check if user exists
        const userSql = 'SELECT id, name, email, role, is_active, approval_status FROM users WHERE email = ? AND role = ?';
        db.execute(userSql, [email.toLowerCase().trim(), role], async (err, results) => {
            if (err) {
                console.error('❌ Database error during forgot password:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error. Please try again.'
                });
            }

            // Always return success message (security best practice to prevent email enumeration)
            const successMessage = 'If an account with this email exists, you will receive password reset instructions.';

            if (results.length === 0) {
                console.log('⚠️ Forgot password attempt for non-existent user:', email);
                return res.json({
                    success: true,
                    message: successMessage
                });
            }

            const user = results[0];

            // Check if account is active and approved
            if (user.approval_status !== 'approved' || !user.is_active) {
                console.log('⚠️ Forgot password attempt for inactive user:', email);
                return res.json({
                    success: true,
                    message: successMessage
                });
            }

            // Generate password reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

            console.log('🔐 Generated password reset token for:', user.email);

            try {
                await emailService.sendPasswordResetEmail(user.email, {
                    name: user.name,
                    role: user.role,
                    resetToken: resetToken
                });

                console.log('✅ Password reset email sent to:', user.email);
                res.json({
                    success: true,
                    message: successMessage
                });
            } catch (emailError) {
                console.error('❌ Failed to send password reset email:', emailError);
                // Still return success for security
                res.json({
                    success: true,
                    message: successMessage
                });
            }
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// @route   GET /api/auth/verify
// @desc    Verify JWT token and return user data
router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No authentication token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-igl-amc-2024');
        
        // Get fresh user data from database
        const verifySql = `
            SELECT id, name, email, role, emp_id, phone, department, is_active, approval_status
            FROM users 
            WHERE id = ? AND is_active = TRUE AND approval_status = 'approved'
        `;
        
        db.execute(verifySql, [decoded.userId], (err, results) => {
            if (err) {
                console.error('❌ Database error during token verification:', err);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token verification failed' 
                });
            }

            if (results.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found or account deactivated' 
                });
            }

            const user = results[0];
            res.json({ 
                success: true, 
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    empId: user.emp_id,
                    phone: user.phone,
                    department: user.department
                }
            });
        });
    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
});

// @route   GET /api/auth/pending-approvals (ADMIN ONLY)
// @desc    Get all pending user registrations for admin approval
router.get('/pending-approvals', (req, res) => {
    const sql = `
        SELECT 
            id, name, email, role, emp_id, phone, department, 
            request_reason, created_at
        FROM users 
        WHERE approval_status = 'pending' 
        ORDER BY created_at DESC
    `;
    
    db.execute(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching pending approvals:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch pending approvals' 
            });
        }

        res.json({
            success: true,
            count: results.length,
            pendingUsers: results
        });
    });
});

// @route   POST /api/auth/approve-user (ADMIN ONLY) - ENHANCED WITH EMAIL
// @desc    Approve or reject user registration
router.post('/approve-user', async (req, res) => {
    const { userId, action, adminNote } = req.body;
    
    console.log('🔄 User approval request:', { userId, action, adminNote });

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request. Provide userId and action (approve/reject)'
        });
    }

    try {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const isActive = action === 'approve';

        const sql = `
            UPDATE users 
            SET approval_status = ?, is_active = ?, admin_note = ?, approved_at = NOW(), updated_at = NOW()
            WHERE id = ? AND approval_status = 'pending'
        `;

        db.execute(sql, [newStatus, isActive, adminNote || null, userId], async (err, result) => {
            if (err) {
                console.error('❌ Error updating user status:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update user status'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found or not pending approval'
                });
            }

            // Send approval/rejection emails
            const userSql = 'SELECT * FROM users WHERE id = ?';
            db.execute(userSql, [userId], async (err, users) => {
                if (!err && users.length > 0) {
                    const user = users[0];
                    
                    try {
                        if (action === 'approve') {
                            const approvalResult = await emailService.sendAccountApproval(user.email, {
                                name: user.name,
                                role: user.role,
                                empId: user.emp_id
                            });
                            
                            if (approvalResult.success) {
                                console.log(`✅ Approval email sent to ${user.email}`);
                            }
                        } else {
                            const rejectionResult = await emailService.sendAccountRejection(
                                user.email, 
                                { name: user.name }, 
                                adminNote
                            );
                            
                            if (rejectionResult.success) {
                                console.log(`✅ Rejection email sent to ${user.email}`);
                            }
                        }
                    } catch (emailError) {
                        console.error('❌ Email sending error during approval:', emailError);
                    }
                }
            });

            console.log(`✅ User ${userId} ${action}d by admin`);

            res.json({
                success: true,
                message: `User ${action}d successfully`,
                userId: userId,
                newStatus: newStatus
            });
        });

    } catch (error) {
        console.error('❌ User approval error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during user approval' 
        });
    }
});

// @route   GET /api/auth/users
// @desc    Get all users with status ordering
router.get('/users', (req, res) => {
    try {
        const sql = `
            SELECT 
                id, name, email, role, emp_id, phone, department, 
                is_active, approval_status, request_reason, created_at, updated_at,
                admin_note, approved_at
            FROM users 
            ORDER BY 
                CASE approval_status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    WHEN 'rejected' THEN 3 
                    ELSE 4 
                END,
                created_at DESC
        `;
        
        db.execute(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching users:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch users' 
                });
            }

            res.json({
                success: true,
                count: results.length,
                users: results
            });
        });
    } catch (error) {
        console.error('❌ Users fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again later.' 
        });
    }
});

module.exports = router;

require('dotenv').config({ quiet: true });
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const emailService = require('../services/emailService');

console.log('🔐 OTP Authentication routes loaded');

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// @route   POST /api/auth/request-otp
// @desc    Step 1: Generate and send OTP for email verification
router.post('/request-otp', async (req, res) => {
    try {
        const { name, email, role } = req.body;

        console.log('📧 Step 1 - OTP Request:', { email, role, name });

        // Input validation
        if (!name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and role'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Role validation
        const validRoles = ['Admin', 'Employee', 'Vendor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid role'
            });
        }

        // Check if user already exists
        const checkUserSql = 'SELECT id, email, approval_status FROM users WHERE email = ?';
        db.execute(checkUserSql, [email.toLowerCase().trim()], async (err, results) => {
            if (err) {
                console.error('❌ Database error during user check:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error. Please try again.'
                });
            }

            if (results.length > 0) {
                const existingUser = results[0];
                console.log('❌ User already exists:', email);
                
                let message = 'An account with this email already exists.';
                if (existingUser.approval_status === 'pending') {
                    message = 'Your registration is already pending admin approval.';
                } else if (existingUser.approval_status === 'approved') {
                    message = 'Account exists and is approved. Please try logging in instead.';
                } else if (existingUser.approval_status === 'rejected') {
                    message = 'Your previous registration was rejected. Contact admin for details.';
                }

                return res.status(400).json({
                    success: false,
                    message: message,
                    showLoginLink: existingUser.approval_status === 'approved'
                });
            }

            // Generate OTP
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            console.log('🔐 Generated OTP for:', email.toLowerCase().trim());

            // Save/Update OTP in database
            const upsertOTPSql = `
                INSERT INTO user_otps (email, otp_code, expires_at, verified, attempts) 
                VALUES (?, ?, ?, FALSE, 0)
                ON DUPLICATE KEY UPDATE 
                otp_code = VALUES(otp_code), 
                expires_at = VALUES(expires_at), 
                verified = FALSE, 
                attempts = 0,
                updated_at = CURRENT_TIMESTAMP
            `;

            db.execute(upsertOTPSql, [email.toLowerCase().trim(), otp, expiresAt], async (err, result) => {
                if (err) {
                    console.error('❌ Failed to save OTP:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to generate OTP. Please try again.'
                    });
                }

                console.log('✅ OTP saved to database successfully');

                // Send OTP email
                try {
                    const emailResult = await emailService.sendOTPVerification(email, {
                        name: name.trim(),
                        role: role,
                        otp: otp
                    });

                    if (emailResult.success) {
                        console.log('✅ OTP email sent successfully to:', email);
                        res.json({
                            success: true,
                            message: 'Verification code sent to your email! Please check your inbox.',
                            details: {
                                email: email.toLowerCase().trim(),
                                expiresIn: '10 minutes',
                                maxAttempts: 3
                            }
                        });
                    } else {
                        console.error('❌ Failed to send OTP email:', emailResult.error);
                        res.status(500).json({
                            success: false,
                            message: 'Failed to send verification email. Please try again.'
                        });
                    }
                } catch (emailError) {
                    console.error('❌ OTP email error:', emailError);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to send verification email. Please try again.'
                    });
                }
            });
        });

    } catch (error) {
        console.error('❌ OTP request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// @route   POST /api/auth/verify-otp-only
// @desc    NEW: Verify OTP without registration (Step 2 validation)
router.post('/verify-otp-only', async (req, res) => {
    try {
        const { email, otp } = req.body;

        console.log('🔍 OTP verification only:', { email, otp });

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Check OTP
        const otpSql = 'SELECT * FROM user_otps WHERE email = ?';
        db.execute(otpSql, [email.toLowerCase().trim()], (err, otpResults) => {
            if (err) {
                console.error('❌ Database error during OTP verification:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error. Please try again.'
                });
            }

            if (otpResults.length === 0) {
                console.log('❌ OTP not found for:', email);
                return res.status(400).json({
                    success: false,
                    message: 'OTP not found. Please request a new verification code.'
                });
            }

            const otpRecord = otpResults[0];

            // Check if already verified
            if (otpRecord.verified) {
                console.log('✅ OTP already verified for:', email);
                return res.json({
                    success: true,
                    message: 'OTP already verified'
                });
            }

            // Check expiry
            if (new Date(otpRecord.expires_at) < new Date()) {
                console.log('❌ OTP expired for:', email);
                return res.status(400).json({
                    success: false,
                    message: 'Verification code expired. Please request a new one.'
                });
            }

            // Check attempts limit
            if (otpRecord.attempts >= 3) {
                console.log('❌ Too many attempts for:', email);
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please request a new verification code.'
                });
            }

            // Verify OTP code
            if (otpRecord.otp_code !== otp.trim()) {
                // Increment attempts
                db.execute('UPDATE user_otps SET attempts = attempts + 1 WHERE email = ?', [email.toLowerCase().trim()]);
                
                const remainingAttempts = 2 - otpRecord.attempts;
                console.log('❌ Invalid OTP for:', email, 'Remaining attempts:', remainingAttempts);
                
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification code. ${remainingAttempts} attempts remaining.`
                });
            }

            // OTP is valid - mark as verified but don't register user yet
            db.execute('UPDATE user_otps SET verified = TRUE WHERE email = ?', [email.toLowerCase().trim()], (updateErr) => {
                if (updateErr) {
                    console.error('❌ Failed to update OTP status:', updateErr);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to verify OTP. Please try again.'
                    });
                }

                console.log('✅ OTP verified successfully for:', email);
                res.json({
                    success: true,
                    message: 'OTP verified successfully'
                });
            });
        });

    } catch (error) {
        console.error('❌ OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// @route   POST /api/auth/verify-otp-and-register
// @desc    Step 2: Verify OTP and complete user registration
router.post('/verify-otp-and-register', async (req, res) => {
    try {
        const { 
            email, otp, name, password, confirmPassword, role, 
            empId, phone, department, requestReason 
        } = req.body;

        console.log('🔍 Step 2 - OTP Verification + Registration:', { email, role, name });

        // Comprehensive validation
        if (!email || !otp || !name || !password || !confirmPassword || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields including OTP'
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

        // Verify OTP
        const otpSql = 'SELECT * FROM user_otps WHERE email = ?';
        db.execute(otpSql, [email.toLowerCase().trim()], async (err, otpResults) => {
            if (err) {
                console.error('❌ Database error during OTP check:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error. Please try again.'
                });
            }

            if (otpResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP not found. Please request a new verification code.'
                });
            }

            const otpRecord = otpResults[0];

            // Check if OTP is verified (from the verify-otp-only step)
            if (!otpRecord.verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Please verify your OTP first before proceeding.'
                });
            }

            // Check expiry
            if (new Date(otpRecord.expires_at) < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification code expired. Please request a new one.'
                });
            }

            // OTP is valid and verified - proceed with user registration
            try {
                console.log('✅ OTP verification confirmed for registration:', email);

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 12);

                // Generate unique employee ID
                const timestamp = Date.now().toString().slice(-6);
                const generatedEmpId = empId?.trim() || `${role.toUpperCase()}-${timestamp}`;

                console.log('👤 Creating user with Employee ID:', generatedEmpId);

                // FIXED: Correct userData array structure
                const userData = [
                    name.trim(),                                    // name
                    email.toLowerCase().trim(),                     // email
                    hashedPassword,                                 // password
                    role,                                          // role
                    generatedEmpId,                                // emp_id
                    phone?.trim() || null,                         // phone
                    department?.trim() || null,                    // department
                    false,                                         // is_active
                    'pending',                                     // approval_status
                    requestReason?.trim() || 'Email verified account request'  // request_reason
                ];

                // Enhanced debug logging
                console.log('🔍 User data being inserted:', {
                    name: userData[0],
                    email: userData[1],
                    role: userData,
                    empId: userData,
                    phone: userData,
                    department: userData,
                    isActive: userData,
                    approvalStatus: userData
                });

                // Insert user into database
                const insertUserSql = `
                    INSERT INTO users (
                        name, email, password, role, emp_id, phone, department, 
                        is_active, approval_status, request_reason, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `;

                db.execute(insertUserSql, userData, async (err, result) => {
                    if (err) {
                        console.error('❌ Database Insert Error:', err);
                        console.error('❌ Error Code:', err.code);
                        console.error('❌ Error Message:', err.sqlMessage);
                        
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({
                                success: false,
                                message: 'An account with this email or employee ID already exists.'
                            });
                        }
                        
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to create account. Please try again.'
                        });
                    }

                    const userId = result.insertId;
                    console.log('✅ User created successfully with ID:', userId);

                    // Send confirmation emails
                    try {
                        // Send registration confirmation to user
                        const confirmationResult = await emailService.sendRegistrationConfirmation(email, {
                            name: name.trim(),
                            role: role,
                            empId: generatedEmpId
                        });

                        if (confirmationResult.success) {
                            console.log('✅ Registration confirmation email sent to user');
                        }

                        // Send admin notification
                        const adminSql = 'SELECT email FROM users WHERE role = "Admin" AND is_active = TRUE AND approval_status = "approved"';
                        db.execute(adminSql, async (err, admins) => {
                            if (!err && admins.length > 0) {
                                const adminEmails = admins.map(admin => admin.email);
                                console.log('📧 Sending admin notification to:', adminEmails);

                                const adminResult = await emailService.sendNewUserRegistration(adminEmails, {
                                    name: name.trim(),
                                    email: email.toLowerCase().trim(),
                                    role: role,
                                    empId: generatedEmpId,
                                    requestReason: requestReason?.trim()
                                });

                                if (adminResult.success) {
                                    console.log('✅ Admin notification email sent');
                                }
                            } else {
                                console.log('⚠️ No active admins found for notification');
                            }
                        });

                    } catch (emailError) {
                        console.error('❌ Email sending error (non-blocking):', emailError);
                    }

                    // Success response
                    res.status(201).json({
                        success: true,
                        message: `🎉 Email verified and account created successfully! Your ${role} registration is now pending admin approval.`,
                        details: {
                            userId: userId,
                            empId: generatedEmpId,
                            status: 'email_verified_pending_approval',
                            emailVerified: true,
                            nextSteps: [
                                'Email successfully verified',
                                'Account created and submitted for review',
                                'Admin will review within 24-48 hours',
                                'You will receive approval notification via email'
                            ]
                        }
                    });
                });

            } catch (hashError) {
                console.error('❌ Password hashing error:', hashError);
                res.status(500).json({
                    success: false,
                    message: 'Error processing registration. Please try again.'
                });
            }
        });

    } catch (error) {
        console.error('❌ OTP verification + registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

module.exports = router;

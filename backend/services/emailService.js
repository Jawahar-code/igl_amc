const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Register global handlebars helpers once
handlebars.registerHelper('inc', function (value) {
    try {
        return Number(value) + 1;
    } catch {
        return value;
    }
});
handlebars.registerHelper('formatDate', function (dateStr) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-IN');
    } catch {
        return '';
    }
});

class EmailService {
    constructor() {
        // Create email transporter (Gmail SMTP)
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // Use TLS
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        // Test connection on startup
        this.verifyConnection();
    }

    // Test email connection
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connected successfully');
        } catch (error) {
            console.error('❌ Email service connection failed:', error.message);
            console.log('💡 Please check your email credentials in .env file');
        }
    }

    // Load and compile email templates
    loadTemplate(templateName, data) {
        try {
            const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(templateContent);
            return template(data);
        } catch (error) {
            console.error('❌ Error loading email template:', error);
            // Return fallback HTML if template loading fails
            return `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>IGL AMC System</h2>
                    <p>Your OTP code is: <strong>${data.otp}</strong></p>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `;
        }
    }

    // Generic send email method
    async sendEmail({ to, subject, template, data, attachments = [] }) {
        try {
            const htmlContent = this.loadTemplate(template, data);

            const mailOptions = {
                from: {
                    name: process.env.EMAIL_FROM_NAME || 'IGL AMC Dashboard',
                    address: process.env.SMTP_USER
                },
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: htmlContent,
                attachments: attachments
            };

            console.log('📧 Sending email to:', to);
            console.log('📧 Subject:', subject);
            const result = await this.transporter.sendMail(mailOptions);

            console.log('✅ Email sent successfully to:', to);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔐 OTP Verification Email - THIS IS THE MISSING FUNCTION
    async sendOTPVerification(userEmail, userData) {
        return await this.sendEmail({
            to: userEmail,
            subject: '🔐 Your OTP Verification Code - IGL AMC',
            template: 'otp-verification',
            data: {
                userName: userData.name,
                userRole: userData.role,
                otp: userData.otp
            }
        });
    }

    // 🔐 User Registration Confirmation
    async sendRegistrationConfirmation(userEmail, userData) {
        return await this.sendEmail({
            to: userEmail,
            subject: 'Registration Submitted - IGL AMC Dashboard',
            template: 'registration-confirmation',
            data: {
                userName: userData.name,
                userRole: userData.role,
                empId: userData.empId,
                submissionDate: new Date().toLocaleDateString('en-IN'),
                loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth`
            }
        });
    }

    // 🔐 Account Approval Notification
    async sendAccountApproval(userEmail, userData) {
        return await this.sendEmail({
            to: userEmail,
            subject: 'Account Approved - Welcome to IGL AMC Dashboard!',
            template: 'account-approved',
            data: {
                userName: userData.name,
                userRole: userData.role,
                empId: userData.empId,
                loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth`,
                dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`
            }
        });
    }

    // 🔐 Account Rejection Notification
    async sendAccountRejection(userEmail, userData, rejectionReason) {
        return await this.sendEmail({
            to: userEmail,
            subject: 'Account Request Status - IGL AMC Dashboard',
            template: 'account-rejected',
            data: {
                userName: userData.name,
                rejectionReason: rejectionReason || 'No specific reason provided',
                contactEmail: process.env.ADMIN_EMAIL || 'adminigl@yopmail.com'
            }
        });
    }

    // 🔔 Admin Notification - New User Registration
    async sendNewUserRegistration(adminEmails, userData) {
        return await this.sendEmail({
            to: adminEmails,
            subject: `New ${userData.role} Registration - Approval Required`,
            template: 'admin-new-registration',
            data: {
                userName: userData.name,
                userEmail: userData.email,
                userRole: userData.role,
                empId: userData.empId,
                requestReason: userData.requestReason || 'No reason provided',
                registrationDate: new Date().toLocaleDateString('en-IN'),
                adminUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/users/pending`
            }
        });
    }

    // 🔐 Password Reset Email
    async sendPasswordResetEmail(userEmail, userData) {
        return await this.sendEmail({
            to: userEmail,
            subject: 'Password Reset Request - IGL AMC Dashboard',
            template: 'password-reset',
            data: {
                name: userData.name,
                role: userData.role,
                resetToken: userData.resetToken
            }
        });
    }

    // 📋 Contract Expiry Alert (single-contract legacy)
    async sendContractExpiryAlert(contractData) {
        try {
            const { contract_id, owner, type, amc_end_date, location, contract_value, oem, days_until_expiry } = contractData;
            
            // Determine urgency level
            let urgencyLevel = 'Medium Priority';
            if (days_until_expiry <= 7) urgencyLevel = 'HIGH PRIORITY';
            else if (days_until_expiry <= 15) urgencyLevel = 'Medium Priority';
            else urgencyLevel = 'Low Priority';

            const templateData = {
                contractId: contract_id,
                contractType: type,
                owner: owner,
                oem: oem || 'N/A',
                contractValue: parseFloat(contract_value || 0).toLocaleString('en-IN'),
                expiryDate: new Date(amc_end_date).toLocaleDateString('en-IN'),
                daysUntilExpiry: days_until_expiry,
                urgencyLevel: urgencyLevel,
                dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts`
            };

            return await this.sendEmail({
                to: process.env.ADMIN_EMAIL || 'adminigl@yopmail.com',
                subject: `🚨 Contract Expiry Alert - ${contract_id} (${days_until_expiry} days remaining)`,
                template: 'contract-expiry',
                data: templateData
            });
        } catch (error) {
            console.error('❌ Error sending contract expiry email:', error);
            return { success: false, error: error.message };
        }
    }

    // 📋 Contract Expiry Digest (aggregated)
    async sendContractExpiryDigest(toEmail, expired = [], soon = []) {
        const subject = 'IGL AMC – Contract Expiry Digest';
        return await this.sendEmail({
            to: toEmail,
            subject,
            template: 'contract-expiry',
            data: { expired, soon }
        });
    }

    // 🔧 Test Email Function
    async sendTestEmail(toEmail) {
        return await this.sendEmail({
            to: toEmail,
            subject: 'IGL AMC Dashboard - Email Service Test',
            template: 'test-email',
            data: {
                testDate: new Date().toLocaleString('en-IN'),
                message: 'Email service is working correctly!'
            }
        });
    }
}

module.exports = new EmailService();

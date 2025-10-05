const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('../services/emailService');

class EmailJobs {
    // Run daily at 9:00 AM IST
    startContractExpiryNotifications() {
        cron.schedule('0 9 * * *', async () => {
            console.log('🔍 Checking for expiring contracts...');
            
            try {
                // Check for contracts expiring in 90, 60, 30, and 7 days
                const intervals = [90, 60, 30, 7, 1]; // Added 1 day for final warning
                
                for (const days of intervals) {
                    const sql = `
                        SELECT c.*, u.email as created_by_email, u.name as created_by_name
                        FROM contracts c
                        LEFT JOIN users u ON c.created_by = u.id
                        WHERE c.status = 'Active'
                        AND DATEDIFF(c.amc_end_date, CURDATE()) = ?
                    `;
                    
                    db.execute(sql, [days], async (err, contracts) => {
                        if (err) {
                            console.error('❌ Error checking expiring contracts:', err);
                            return;
                        }

                        if (contracts.length > 0) {
                            console.log(`📋 Found ${contracts.length} contracts expiring in ${days} days`);
                            
                            for (const contract of contracts) {
                                // Get all admin and employee emails
                                const adminSql = `
                                    SELECT DISTINCT email FROM users 
                                    WHERE role IN ('Admin', 'Employee') 
                                    AND is_active = TRUE 
                                    AND approval_status = 'approved'
                                    AND email IS NOT NULL
                                `;
                                
                                db.execute(adminSql, async (err, admins) => {
                                    if (err) return;
                                    
                                    const recipients = [
                                        ...admins.map(admin => admin.email),
                                        contract.created_by_email
                                    ].filter(Boolean);

                                    // Remove duplicates
                                    const uniqueRecipients = [...new Set(recipients)];

                                    if (uniqueRecipients.length > 0) {
                                        await emailService.sendContractExpiryAlert(
                                            uniqueRecipients,
                                            contract,
                                            days
                                        );
                                        console.log(`📧 Expiry alert sent for contract ${contract.contract_id}`);
                                    }
                                });
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Contract expiry job failed:', error);
            }
        }, {
            timezone: "Asia/Kolkata"
        });
    }

    // Start all email jobs
    startAllJobs() {
        console.log('📅 Starting automated email notification jobs...');
        this.startContractExpiryNotifications();
        console.log('✅ All email jobs started successfully');
    }
}

module.exports = new EmailJobs();

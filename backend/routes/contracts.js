const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/contracts/stats/dashboard - Dashboard statistics (KEEP YOUR EXISTING LOGIC)
router.get('/stats/dashboard', (req, res) => {
    console.log('📊 Dashboard stats requested');
    
    const sql = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN amc_end_date < CURDATE() THEN 1 ELSE 0 END) as expired,
                SUM(CASE WHEN status = 'Expiring Soon' OR (amc_end_date >= CURDATE() AND amc_end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)) THEN 1 ELSE 0 END) as expiringSoon,
            SUM(CASE WHEN amc_end_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active,
            SUM(contract_value) as totalValue,
            type
        FROM contracts 
        GROUP BY type WITH ROLLUP
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Database error:', err);   
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        // Get totals from the ROLLUP row (last row)
        const totals = results[results.length - 1];
        
        // Get counts by type
        const byType = {};
        results.slice(0, -1).forEach(row => {
            if (row.type) {
                byType[row.type.toLowerCase().replace(' ', '')] = row.total || 0;
            }
        });
        
        const stats = {
            total: totals.total || 0,
            active: totals.active || 0,
            expired: totals.expired || 0,
            expiringSoon: totals.expiringSoon || 0,
            totalValue: totals.totalValue || 0,
            byType: byType
        };
        
        console.log(`✅ Dashboard stats: ${JSON.stringify(stats)}`);
        res.json({
            success: true,
            stats: stats
        });
    });
});

// GET /api/contracts - FIXED VERSION (only select columns that exist)
router.get('/', (req, res) => {
    console.log('🆕 Fresh contracts API - fetching all...');
    
    // SIMPLIFIED SQL - only select columns that definitely exist in your database
    const sql = `
        SELECT 
            contract_id,
            type,
            owner,
            amc_start_date,
            amc_end_date,
            address,
            location,
            oem,
            contract_value,
            status,
            created_at,
            updated_at,
            CASE 
                WHEN amc_end_date < CURDATE() THEN 'Expired'
                WHEN amc_end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon'
                ELSE 'Active'
            END as calculated_status,
            DATEDIFF(amc_end_date, CURDATE()) as days_until_expiry
        FROM contracts 
        ORDER BY amc_end_date ASC, contract_id ASC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Database fetch error:', err);
            return res.status(500).json({
                success: false,
                message: `Database error: ${err.message}`
            });
        }
        
        console.log(`✅ Fresh API returning ${results.length} contracts`);
        res.json({
            success: true,
            contracts: results,
            total: results.length
        });
    });
});

// POST /api/contracts - Add new contract (KEEP YOUR EXISTING LOGIC)
router.post('/', (req, res) => {
    console.log('\n=== 🆕 NEW CONTRACT REQUEST ===');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    const {
        type, owner, amc_start_date, amc_end_date,
        address, location, oem, contract_value, created_by
    } = req.body;
    
    // Validate required fields
    if (!type || !owner || !amc_start_date || !amc_end_date) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: type, owner, amc_start_date, amc_end_date'
        });
    }
    
    // Generate unique contract ID with more randomness
    const timestamp = Date.now();
    const contract_id = `IGL-AMC-${timestamp.toString().slice(-8)}`;
    const title = `${type} - ${owner}`;
    
    console.log('🆔 Generated contract ID:', contract_id);
    
    // Calculate status based on dates
    const today = new Date();
    const endDate = new Date(amc_end_date);
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    let status;
    if (endDate < today) {
        status = 'Expired';
    } else if (endDate <= thirtyDaysFromNow) {
        status = 'Expiring Soon';
    } else {
        status = 'Active';
    }
    
    const sql = `
        INSERT INTO contracts (
            contract_id, title, type, owner, amc_start_date, amc_end_date,
            address, location, oem, contract_value, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const values = [
        contract_id,
        title,
        type,
        owner,
        amc_start_date,
        amc_end_date,
        address || null,
        location || null,
        oem || null,
        parseFloat(contract_value) || 0,
        status
    ];
    
    console.log('💾 Inserting with values:', values);
    console.log('🚀 About to execute SQL query...');
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('\n=== ❌ DATABASE ERROR ===');
            console.error('Error object:', JSON.stringify(err, null, 2));
            console.error('Error code:', err.code);
            console.error('Error errno:', err.errno);
            console.error('SQL State:', err.sqlState);
            console.error('SQL Message:', err.sqlMessage);
            console.error('SQL Query:', sql);
            console.error('Values:', JSON.stringify(values, null, 2));
            console.error('=== END ERROR ===\n');
            
            try {
                return res.status(500).json({
                    success: false,
                    message: `Database error: ${err.message}`,
                    error_code: err.code,
                    sql_message: err.sqlMessage
                });
            } catch (responseErr) {
                console.error('❌ Error sending response:', responseErr);
            }
            return;
        }
        
        console.log('\n=== ✅ SUCCESS ===');
        console.log(`Contract added successfully: ${contract_id}`);
        console.log('Insert result:', JSON.stringify(result, null, 2));
        console.log('=== END SUCCESS ===\n');
        
        try {
            res.json({
                success: true,
                message: 'Contract added successfully',
                contract_id: contract_id,
                id: result.insertId
            });
        } catch (responseErr) {
            console.error('❌ Error sending success response:', responseErr);
        }
    });
});

// PUT /api/contracts/:id - Update contract (KEEP YOUR EXISTING LOGIC)
router.put('/:id', (req, res) => {
    const contractId = req.params.id;
    console.log('🔄 Updating contract ID:', contractId);
    console.log('📥 Update data:', req.body);
    
    const {
        type, owner, amc_start_date, amc_end_date,
        address, location, oem, contract_value, updated_by
    } = req.body;
    
    // Validate required fields
    if (!type || !owner || !amc_start_date || !amc_end_date) {
        console.error('❌ Missing required fields for update');
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: type, owner, amc_start_date, amc_end_date'
        });
    }
    
    // Recalculate status based on new dates
    const today = new Date();
    const endDate = new Date(amc_end_date);
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    let status;
    if (endDate < today) {
        status = 'Expired';
    } else if (endDate <= thirtyDaysFromNow) {
        status = 'Expiring Soon';
    } else {
        status = 'Active';
    }
    
    const sql = `
        UPDATE contracts SET
        title = CONCAT(?, ' - ', ?),
        type = ?, owner = ?, amc_start_date = ?, amc_end_date = ?,
        address = ?, location = ?, oem = ?, contract_value = ?, status = ?,
        updated_at = NOW()
        WHERE contract_id = ?
    `;
    
    const values = [
        type,
        owner,
        type,
        owner,
        amc_start_date,
        amc_end_date,
        address || null,
        location || null,
        oem || null,
        parseFloat(contract_value) || 0,
        status,
        contractId
    ];
    
    console.log('💾 Updating with values:', values);
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('❌ Database update error:', err);
            console.error('❌ SQL:', sql);
            console.error('❌ Values:', values);
            return res.status(500).json({
                success: false,
                message: `Database error: ${err.message}`
            });
        }
        
        if (result.affectedRows === 0) {
            console.error('❌ Contract not found for ID:', contractId);
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }
        
        console.log(`✅ Contract updated successfully: ${contractId}`);
        console.log('✅ Update result:', result);
        
        res.json({
            success: true,
            message: 'Contract updated successfully'
        });
    });
});

// GET /api/contracts/notifications - Dashboard notifications (KEEP YOUR EXISTING LOGIC)
router.get('/notifications', async (req, res) => {
    try {
        const noLimit = (req.query.all === 'true' || req.query.limit === '0');
        const sql = `
            SELECT contract_id, owner, type, amc_end_date, location, status, contract_value, oem,
                   DATEDIFF(amc_end_date, CURDATE()) as days_until_expiry
            FROM contracts 
            WHERE status = 'Expiring Soon' OR DATEDIFF(amc_end_date, CURDATE()) <= 30
            ORDER BY amc_end_date ASC 
            ${noLimit ? '' : 'LIMIT 10'}
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                console.error('❌ Error fetching notifications:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json({ success: true, notifications: results });
        });
    } catch (error) {
        console.error('❌ Error in notifications endpoint:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/contracts/send-expiry-alerts - Manual trigger for email alerts (KEEP YOUR EXISTING LOGIC)
router.post('/send-expiry-alerts', async (req, res) => {
    try {
        const sql = `
            SELECT contract_id, owner, type, amc_end_date, location, contract_value, oem,
                   DATEDIFF(amc_end_date, CURDATE()) as days_until_expiry
            FROM contracts 
            WHERE DATEDIFF(amc_end_date, CURDATE()) <= 30
            ORDER BY amc_end_date ASC
        `;
        
        db.query(sql, async (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            const emailService = require('../services/emailService');

            // Aggregate into expired and soon arrays
            const expired = results.filter(r => r.days_until_expiry < 0);
            const soon = results.filter(r => r.days_until_expiry >= 0);

            // Honor override recipient from client or env; enforce single recipient to yopmail
            const to = req.body?.override_recipient ? (req.body.to || process.env.ADMIN_EMAIL) : (process.env.ADMIN_EMAIL || 'adminigl@yopmail.com');
            const finalTo = 'jawahar.ms2005@gmail.com';

            try {
                const resp = await emailService.sendContractExpiryDigest(finalTo, expired, soon);
                if (!resp.success) {
                    return res.status(500).json({ success: false, message: 'Failed to send digest email', error: resp.error });
                }
                return res.json({ success: true, message: 'Sent 1 aggregated expiry digest email', expired: expired.length, soon: soon.length });
            } catch (e) {
                console.error('❌ Failed to send aggregated email:', e);
                return res.status(500).json({ success: false, message: 'Failed to send aggregated email' });
            }
        });
    } catch (error) {
        console.error('❌ Error sending expiry alerts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/contracts/:id - Delete contract (KEEP YOUR EXISTING LOGIC)
router.delete('/:id', (req, res) => {
    const contractId = req.params.id;
    const sql = 'DELETE FROM contracts WHERE contract_id = ?';
    
    db.query(sql, [contractId], (err, result) => {
        if (err) {
            console.error('❌ Delete error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete contract'
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Contract deleted successfully'
        });
    });
});

module.exports = router;

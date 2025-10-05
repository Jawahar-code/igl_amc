const express = require('express');
const router = express.Router();
const db = require('../config/database');


// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
    const userId = req.body.adminId || req.query.adminId;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Admin verification required' });
    }

    const sql = `
        SELECT role FROM users
        WHERE id = ? AND role = 'Admin' AND approval_status = 'approved' AND is_active = TRUE
    `;

    db.execute(sql, [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        req.adminId = userId;
        next();
    });
};

// @route GET /api/users/pending
// @desc Get all pending approval requests (Admin only)
router.get('/pending', verifyAdmin, (req, res) => {
    const sql = `
        SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.emp_id,
            u.phone,
            u.department,
            u.request_reason,
            u.created_at,
            ar.request_reason as approval_request_reason,
            ar.status as request_status
        FROM users u
        LEFT JOIN approval_requests ar ON u.id = ar.user_id
        WHERE u.approval_status = 'pending'
        ORDER BY u.created_at ASC
    `;

    db.execute(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching pending users:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log('✅ Retrieved', results.length, 'pending approval requests');
        res.json({
            success: true,
            pendingUsers: results
        });
    });
});

// @route GET /api/users/all
// @desc Get all users (Admin only)
router.get('/all', verifyAdmin, (req, res) => {
    const sql = `
        SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.emp_id,
            u.phone,
            u.department,
            u.is_active,
            u.approval_status,
            u.created_at,
            u.approved_at,
            approver.name as approved_by_name
        FROM users u
        LEFT JOIN users approver ON u.approved_by = approver.id
        ORDER BY u.created_at DESC
    `;

    db.execute(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching all users:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log('✅ Retrieved', results.length, 'total users');
        res.json({
            success: true,
            users: results
        });
    });
});

// @route POST /api/users/approve
// @desc Approve pending user (Admin only)
router.post('/approve', verifyAdmin, (req, res) => {
    const { userId, adminNotes } = req.body;
    const adminId = req.adminId;

    console.log('👍 Approving user:', userId, 'by admin:', adminId);

    const updateUserSql = `
        UPDATE users SET
        approval_status = 'approved',
        is_active = TRUE,
        approved_by = ?,
        approved_at = NOW()
        WHERE id = ? AND approval_status = 'pending'
    `;

    db.execute(updateUserSql, [adminId, userId], (err, result) => {
        if (err) {
            console.error('❌ User approval error:', err);
            return res.status(500).json({ success: false, message: 'Failed to approve user' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or already processed'
            });
        }

        const updateRequestSql = `
            UPDATE approval_requests SET
            status = 'approved',
            admin_notes = ?,
            processed_at = NOW(),
            processed_by = ?
            WHERE user_id = ? AND status = 'pending'
        `;

        db.execute(updateRequestSql, [adminNotes || 'Approved by admin', adminId, userId], (err) => {
            if (err) {
                console.error('❌ Approval request update error:', err);
            }
        });

        console.log('✅ User approved successfully:', userId);
        res.json({
            success: true,
            message: 'User approved successfully'
        });
    });
});

// @route POST /api/users/reject
// @desc Reject pending user (Admin only) - FIXED VERSION
router.post('/reject', verifyAdmin, (req, res) => {
    const { userId, rejectionReason } = req.body;
    const adminId = req.adminId;

    console.log('👎 Rejecting user:', userId, 'by admin:', adminId);
    console.log('📝 Rejection reason:', rejectionReason);

    // Validate required fields
    if (!userId || !rejectionReason || !rejectionReason.trim()) {
        console.error('❌ Missing userId or rejectionReason');
        return res.status(400).json({
            success: false,
            message: 'User ID and rejection reason are required'
        });
    }

    // Update user rejection status
    const updateUserSql = `
        UPDATE users SET
        approval_status = 'rejected',
        is_active = FALSE,
        rejection_reason = ?
        WHERE id = ? AND approval_status = 'pending'
    `;

    db.execute(updateUserSql, [rejectionReason.trim(), userId], (err, result) => {
        if (err) {
            console.error('❌ User rejection error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to reject user: ' + err.message 
            });
        }

        if (result.affectedRows === 0) {
            console.error('❌ No rows affected - user not found or already processed');
            return res.status(404).json({
                success: false,
                message: 'User not found or already processed'
            });
        }

        // Update approval request (optional but good practice)
        const updateRequestSql = `
            UPDATE approval_requests SET
            status = 'rejected',
            admin_notes = ?,
            processed_at = NOW(),
            processed_by = ?
            WHERE user_id = ? AND status = 'pending'
        `;

        db.execute(updateRequestSql, [rejectionReason.trim(), adminId, userId], (err) => {
            if (err) {
                console.error('❌ Approval request update error:', err);
                // Don't fail the main operation for this
            }
        });

        console.log('✅ User rejected successfully:', userId);
        res.json({
            success: true,
            message: 'User registration rejected successfully'
        });
    });
});


// @route PUT /api/users/:id/role
// @desc Update user role (Admin only) - NEW ROUTE
router.put('/:id/role', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;
    const adminId = req.adminId;

    console.log('🔄 Updating role for user:', userId, 'to:', role, 'by admin:', adminId);

    // Validate role
    if (!role || !['Admin', 'Employee', 'Vendor'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Must be Admin, Employee, or Vendor'
        });
    }

    const sql = `UPDATE users SET role = ? WHERE id = ?`;

    db.execute(sql, [role, userId], (err, result) => {
        if (err) {
            console.error('❌ Role update error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error',
                error: err.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        console.log(`✅ User role updated: ${userId} → ${role}`);
        res.json({ 
            success: true, 
            message: 'Role updated successfully' 
        });
    });
});

// @route PUT /api/users/:id/status
// @desc Update user active status (Admin only) - NEW ROUTE
router.put('/:id/status', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const { isActive } = req.body;
    const adminId = req.adminId;

    console.log('🔄 Updating status for user:', userId, 'to:', isActive ? 'active' : 'inactive', 'by admin:', adminId);

    const sql = `UPDATE users SET is_active = ? WHERE id = ?`;

    db.execute(sql, [isActive ? 1 : 0, userId], (err, result) => {
        if (err) {
            console.error('❌ Status update error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error',
                error: err.message 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        console.log(`✅ User status updated: ${userId} → ${isActive ? 'active' : 'inactive'}`);
        res.json({ 
            success: true, 
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully` 
        });
    });
});

module.exports = router;

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ContractNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingAlerts, setSendingAlerts] = useState(false);

    useEffect(() => {
        fetchNotifications();
        // refresh every 60s for near real-time data
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            // Request all notifications without server-side paging; add cache-buster
            const response = await api.get(`/contracts/notifications?all=true&limit=0&_ts=${Date.now()}`);
            if (response.data.success) {
                setNotifications(response.data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    let lastSentAt = 0;
    const sendExpiryAlerts = async () => {
        // simple debounce: block if sent within last 5 seconds
        if (Date.now() - lastSentAt < 5000) return;
        lastSentAt = Date.now();
        setSendingAlerts(true);
        try {
            // Build a single aggregated email payload for expired and expiring contracts
            const expired = notifications.filter(n => (n.days_until_expiry ?? 0) < 0);
            const soon = notifications.filter(n => (n.days_until_expiry ?? 0) >= 0);

            const buildTableRows = (items) => items.map((c, idx) => `
                <tr>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${idx + 1}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;"><strong>${c.contract_id}</strong></td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.type || ''}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.owner || ''}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.location || ''}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${new Date(c.amc_end_date).toLocaleDateString('en-IN')}</td>
                    <td style="padding:8px;border:1px solid #e5e7eb;">${c.days_until_expiry}</td>
                </tr>
            `).join('');

            const html = `
                <div style="font-family:Inter,Arial,sans-serif;color:#111827;">
                    <h2 style="margin:0 0 12px;">IGL AMC – Contract Expiry Digest</h2>
                    <p style="margin:0 0 16px;">This is an automated summary of contracts nearing or past expiry.</p>

                    <h3 style="margin:16px 0 8px;color:#b91c1c;">Expired Contracts (${expired.length})</h3>
                    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">
                        <thead>
                            <tr style="background:#fef2f2;">
                                <th style="padding:8px;border:1px solid #e5e7eb;">#</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Contract ID</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Type</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Owner</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Location</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">End Date</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Days (negative = days ago)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expired.length ? buildTableRows(expired) : `<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280;">No expired contracts 🎉</td></tr>`}
                        </tbody>
                    </table>

                    <h3 style="margin:24px 0 8px;color:#92400e;">Expiring Soon (${soon.length})</h3>
                    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">
                        <thead>
                            <tr style="background:#fffbeb;">
                                <th style="padding:8px;border:1px solid #e5e7eb;">#</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Contract ID</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Type</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Owner</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Location</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">End Date</th>
                                <th style="padding:8px;border:1px solid #e5e7eb;">Days left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${soon.length ? buildTableRows(soon) : `<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280;">No contracts expiring soon.</td></tr>`}
                        </tbody>
                    </table>

                    <p style="margin:16px 0 0;color:#6b7280;font-size:12px;">This is a system generated email from IGL AMC.</p>
                </div>
            `;

            // Post a single email to the backend (update endpoint to accept aggregated email)
            const response = await api.post('/contracts/send-expiry-alerts', {
                to: 'jawahar.ms2005@gmail.com',
                subject: 'IGL AMC – Contract Expiry Digest',
                html,
                mode: 'aggregate',
                force_single: true,
                override_recipient: true
            });
            if (response.data.success) {
                toast.success('✅ Expiry digest sent to jawahar.ms2005@gmail.com');
            }
        } catch (error) {
            toast.error('Failed to send expiry alerts');
        } finally {
            setSendingAlerts(false);
        }
    };

    const getUrgencyInfo = (daysUntilExpiry) => {
        if (daysUntilExpiry < 0) {
            return {
                bgColor: 'bg-gray-100 border-gray-300',
                textColor: 'text-gray-600',
                icon: 'fas fa-times-circle text-gray-400',
                badge: 'bg-gray-200 text-gray-700',
                status: 'Expired'
            };Cur
        } else if (daysUntilExpiry <= 7) {
            return {
                bgColor: 'bg-red-50 border-red-200',
                textColor: 'text-red-800',
                icon: 'fas fa-exclamation-triangle text-red-500',
                badge: 'bg-red-100 text-red-800',
                status: 'Critical'
            };
        } else if (daysUntilExpiry <= 15) {
            return {
                bgColor: 'bg-orange-50 border-orange-200',
                textColor: 'text-orange-800',
                icon: 'fas fa-exclamation-circle text-orange-500',
                badge: 'bg-orange-100 text-orange-800',
                status: 'Warning'
            };
        } else {
            return {
                bgColor: 'bg-yellow-50 border-yellow-200',
                textColor: 'text-yellow-800',
                icon: 'fas fa-info-circle text-yellow-500',
                badge: 'bg-yellow-100 text-yellow-800',
                status: 'Notice'
            };
        }
    };

    const getDaysText = (days) => {
        if (days < 0) return `${Math.abs(days)} days ago`;
        return `${days} days left`;
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-bell text-orange-500 mr-2"></i>
                    Contract Notifications
                    {notifications.length > 0 && (
                        <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                            {notifications.length}
                        </span>
                    )}
                </h3>
                {notifications.length > 0 && (
                    <button
                        onClick={sendExpiryAlerts}
                        disabled={sendingAlerts}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-md text-sm flex items-center space-x-1 transition-colors"
                    >
                        {sendingAlerts ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fas fa-envelope"></i>
                        )}
                        <span>Send Alerts</span>
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                    <p className="font-medium">No contract notifications</p>
                    <p className="text-sm">All contracts are up to date!</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto">
                    {notifications.map((contract) => {
                        const urgency = getUrgencyInfo(contract.days_until_expiry);
                        return (
                            <div
                                key={contract.contract_id}
                                className={`border rounded-lg p-3 transition-all hover:shadow-sm ${urgency.bgColor}`}
                            >
                                <div className="flex items-start space-x-3">
                                    <i className={`${urgency.icon} mt-0.5 flex-shrink-0`}></i>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`font-medium text-sm truncate ${urgency.textColor}`}>
                                                {contract.title || `${contract.type} Contract`}
                                            </h4>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.badge} flex-shrink-0 ml-2`}>
                                                {getDaysText(contract.days_until_expiry)}
                                            </span>
                                        </div>
                                        
                                        <div className={`text-xs ${urgency.textColor} space-y-0.5`}>
                                            <p>
                                                <span className="font-medium">{contract.contract_id}</span> • {contract.type}
                                            </p>
                                            <p>
                                                Owner: {contract.owner} • {contract.location}
                                            </p>
                                            <p>
                                                Expires: {new Date(contract.amc_end_date).toLocaleDateString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ContractNotifications;

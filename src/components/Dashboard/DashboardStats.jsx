import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const DashboardStats = ({ limited = false }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 300000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/contracts/stats/dashboard');
            if (response.data.success) {
                setStats(response.data.stats);
            }
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            // Fetch from regular contracts endpoint as fallback
            try {
                const contractsResponse = await api.get('/contracts');
                const contracts = contractsResponse.data.contracts || [];
                
                const fallbackStats = {
                    total: contracts.length,
                    active: contracts.filter(c => c.calculated_status === 'Active').length,
                    expired: contracts.filter(c => c.calculated_status === 'Expired').length,
                    expiringSoon: contracts.filter(c => c.calculated_status === 'Expiring').length,
                    totalValue: contracts.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0),
                    byType: {
                        scada: contracts.filter(c => c.type === 'SCADA Systems').length,
                        network: contracts.filter(c => c.type === 'Network Equipment').length,
                        safety: contracts.filter(c => c.type === 'Safety Equipment').length,
                        server: contracts.filter(c => c.type === 'Server').length,
                        storage: contracts.filter(c => c.type === 'Storage').length,
                        laptop: contracts.filter(c => c.type === 'Laptop').length
                    }
                };
                setStats(fallbackStats);
            } catch (fallbackError) {
                // If both fail, keep default values
                setStats({
                    total: 0, active: 0, expired: 0, expiringSoon: 0, totalValue: 0,
                    byType: { scada: 0, network: 0, safety: 0, server: 0, storage: 0, laptop: 0 }
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-24">
                            <div className="animate-pulse">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                                    <div className="ml-3 flex-1">
                                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 h-72">
                            <div className="animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                                <div className="h-56 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-8">
                <i className="fas fa-chart-bar text-gray-300 text-4xl mb-4"></i>
                <p className="text-gray-500 mb-4">Unable to load statistics</p>
                <button 
                    onClick={fetchStats}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const statusChartData = {
        labels: ['Active', 'Expired', 'Expiring Soon'],
        datasets: [
            {
                data: [stats.active, stats.expired, stats.expiringSoon],
                backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                borderColor: ['#059669', '#DC2626', '#D97706'],
                borderWidth: 2,
                hoverOffset: 6,
            },
        ],
    };

    // DYNAMIC EQUIPMENT TYPES CHART DATA - AUTO-INCREMENT LOGIC
    const typeLabelsRaw = Object.keys(stats.byType);
    const typeDataValuesRaw = Object.values(stats.byType);
    // Show all equipment types for all roles since limited is set to false
    const pairs = typeLabelsRaw.map((k, i) => ({ k, v: typeDataValuesRaw[i] }));
    const sorted = [...pairs].sort((a, b) => (b.v || 0) - (a.v || 0));
    const visible = sorted; // Show all equipment types regardless of role
    const typeLabels = visible.map(p => p.k);
    const typeDataValues = visible.map(p => p.v);
    const maxTypeValue = Math.max(...typeDataValues, 14); // Dynamic max based on data or minimum 15

    const typeChartData = {
        labels: typeLabels, // Show ALL equipment types dynamically
        datasets: [
            {
                label: 'Contracts',
                data: typeDataValues, // Show ALL data values dynamically
                backgroundColor: [
                    '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#6B7280',
                    '#2563eb', '#7c3aed', '#dc2626', '#059669', '#d97706', '#4b5563',
                    '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#6B7280'
                ],
                borderColor: [
                    '#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#4B5563',
                    '#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#4B5563',
                    '#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#4B5563'
                ],
                borderWidth: 1,
                borderRadius: 3,
                maxBarThickness: 50,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 12,
                    usePointStyle: true,
                    font: { size: 11, family: 'Inter, sans-serif' }
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                cornerRadius: 6,
                displayColors: false,
                titleFont: { size: 12 },
                bodyFont: { size: 11 }
            }
        },
    };

    // DYNAMIC BAR CHART OPTIONS - AUTO-INCREMENT Y-AXIS
    const barChartOptions = {
        ...chartOptions,
        scales: {
            y: {
                beginAtZero: true,
                max: maxTypeValue + 2, // Dynamic max based on actual data + buffer
                ticks: { stepSize: 1, font: { size: 10 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                ticks: { font: { size: 10 } },
                grid: { display: false },
                categoryPercentage: 0.8,
                barPercentage: 0.9
            }
        },
        layout: {
            padding: {
                top: 15,
                bottom: 15,
                left: 15,
                right: 15
            }
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Analytics Overview</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <i className="fas fa-sync-alt animate-spin text-xs"></i>
                    <span>Auto-refreshing</span>
                </div>
            </div>

            {/* Bigger Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md text-white p-4 transform hover:scale-105 transition-all duration-200 h-24">
                    <div className="flex items-center justify-between h-full">
                        <div>
                            <p className="text-blue-100 text-xs font-medium mb-1">Total Contracts</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <i className="fas fa-file-contract text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md text-white p-4 transform hover:scale-105 transition-all duration-200 h-24">
                    <div className="flex items-center justify-between h-full">
                        <div>
                            <p className="text-green-100 text-xs font-medium mb-1">Active Contracts</p>
                            <p className="text-2xl font-bold">{stats.active}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <i className="fas fa-check-circle text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md text-white p-4 transform hover:scale-105 transition-all duration-200 h-24">
                    <div className="flex items-center justify-between h-full">
                        <div>
                            <p className="text-orange-100 text-xs font-medium mb-1">Expiring Soon</p>
                            <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <i className="fas fa-exclamation-triangle text-lg"></i>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md text-white p-4 transform hover:scale-105 transition-all duration-200 h-24">
                    <div className="flex items-center justify-between h-full">
                        <div>
                            <p className="text-purple-100 text-xs font-medium mb-1">Total Value</p>
                            <p className="text-xl font-bold">₹{(stats.totalValue / 1000000).toFixed(1)}M</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <i className="fas fa-rupee-sign text-lg"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bigger Charts - Same Height */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Contract Status Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow h-72">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900">Contract Status</h3>
                        <div className="text-sm text-gray-500">{stats.total} total</div>
                    </div>
                    <div className="h-36">
                        <Doughnut data={statusChartData} options={chartOptions} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                            <div className="text-lg font-bold text-green-600">{stats.active}</div>
                            <div className="text-xs text-gray-600">Active</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                            <div className="text-lg font-bold text-red-600">{stats.expired}</div>
                            <div className="text-xs text-gray-600">Expired</div>
                        </div>
                        <div className="p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="text-lg font-bold text-orange-600">{stats.expiringSoon}</div>
                            <div className="text-xs text-gray-600">Expiring</div>
                        </div>
                    </div>
                </div>

                {/* Equipment Type Chart - DYNAMIC AUTO-INCREMENT */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow h-72">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900">Equipment Types</h3>
                        <div className="text-sm text-gray-500">By count</div>
                    </div>
                    <div className="h-56">
                        <Bar data={typeChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;

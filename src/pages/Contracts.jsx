import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { 
  FaPen, 
  FaTrash, 
  FaPlus, 
  FaTimes, 
  FaDownload, 
  FaSearch, 
  FaFileContract, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaChevronLeft, 
  FaChevronRight, 
  FaCaretUp, 
  FaCaretDown 
} from "react-icons/fa";



const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d)) return 'N/A';
        return d.toLocaleDateString('en-IN');
    } catch {
        return 'N/A';
    }
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d)) return 'N/A';
        return `${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
        return 'N/A';
    }
};

const formatCurrency = (amt) =>
    `₹${parseFloat(amt || 0).toLocaleString('en-IN')}`;

// Utility function to generate contract ID
const generateContractId = (type, owner) => {
    const typePrefix = type ? type.substring(0, 3).toUpperCase() : 'CTR';
    const ownerPrefix = owner ? owner.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'XXX';
    const timestamp = Date.now().toString().slice(-6);
    return `${typePrefix}-${ownerPrefix}-${timestamp}`;
};

// Utility function to validate dates
const validateDates = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Both start and end dates are required';
    if (new Date(startDate) >= new Date(endDate)) return 'End date must be after start date';
    return null;
};



// Utility to coerce various date strings to yyyy-MM-dd for <input type="date">
const toDateInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        return dateString.slice(0, 10);
    }
    const ddmmyyyyDash = /^([0-3]?\d)-([0-1]?\d)-(\d{4})$/;
    const ddmmyyyySlash = /^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/;
    let m;
    if ((m = String(dateString).match(ddmmyyyyDash)) || (m = String(dateString).match(ddmmyyyySlash))) {
        const [, dd, mm, yyyy] = m;
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return '';
};

// Utility function to validate form data
const validateFormData = (formData) => {
    const errors = [];
    
    if (!formData.type?.trim()) errors.push('Equipment type is required');
    if (!formData.owner?.trim()) errors.push('Owner is required');
    if (!formData.amc_start_date) errors.push('AMC start date is required');
    if (!formData.amc_end_date) errors.push('AMC end date is required');
    
    const dateError = validateDates(formData.amc_start_date, formData.amc_end_date);
    if (dateError) errors.push(dateError);
    
    if (formData.contract_value && parseFloat(formData.contract_value) < 0) {
        errors.push('Contract value must be positive');
    }
    
    return errors;
};

const Contracts = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterType, setFilterType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [contractToDelete, setContractToDelete] = useState(null);

    // Equipment Types filter options
    const equipmentTypes = useMemo(() => {
        const typesFromData = [...new Set(contracts.map(c => c.type))].filter(Boolean);
        return typesFromData.length ? typesFromData : [
            'Server', 'Laptop', 'Storage', 'Network Equipment', 'SCADA Systems', 'Safety Equipment'
        ];
    }, [contracts]);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/contracts');
            setContracts(response.data.contracts || []);
        } catch (error) {
            console.error('❌ Fetch error:', error);
            toast.error('Failed to load contracts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, []);

    const filteredAndSorted = useMemo(() => {
        let filtered = contracts;
        if (filterType) {
            filtered = filtered.filter(c => (c.type || '').toLowerCase() === filterType.toLowerCase());
        }
        if (searchTerm) {
            const q = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(c => {
                const fields = [
                    c.contract_id,
                    c.type,
                    c.owner,
                    c.location,
                    c.oem,
                    c.calculated_status
                ];
                return fields.some(v => (v ?? '').toString().toLowerCase().includes(q));
            });
        }
        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue == null || bValue == null) return 0;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [contracts, sortConfig, filterType, searchTerm]);

    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentContracts = filteredAndSorted.slice(startIndex, endIndex);

    useEffect(() => { 
        setCurrentPage(1); 
    }, [filterType, searchTerm, sortConfig.key]);



    const handleSort = (key) => {
        setSortConfig({
            key,
            direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active':
                return 'bg-green-100 text-green-800';
            case 'Expiring Soon':
                return 'bg-orange-100 text-orange-800';
            case 'Expired':
                return 'bg-red-100 text-red-800';
            case 'Suspending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const handleAddContract = async (contractData) => {
        try {
            // Validate form data
            const validationErrors = validateFormData(contractData);
            if (validationErrors.length > 0) {
                toast.error(validationErrors[0]);
                return false;
            }
            if (!user?.id) {
                toast.error('User not authenticated');
                return false;
            }

            const payload = {
                ...contractData,
contract_id: contractData.contract_id || generateContractId(contractData.type, contractData.owner),
                amc_start_date: toDateInput(contractData.amc_start_date),
                amc_end_date: toDateInput(contractData.amc_end_date),
                created_by: user.id,
                contract_value: contractData.contract_value ? parseFloat(contractData.contract_value) : 0
            };

            console.log('🚀 Sending contract data:', payload);
            console.log('🚀 User ID:', user.id);

            const response = await api.post('/contracts', payload);

            console.log('📥 Response:', response.data);

            if (response.data.success) {
                toast.success('Contract added successfully!');
                await fetchContracts();
                setShowAddModal(false);
                return true;
            } else {
                console.error('❌ Server error:', response.data);
                toast.error(response.data.message || 'Failed to add contract');
                return false;
            }
        } catch (error) {
            console.error('❌ Error adding contract:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to add contract';
            toast.error(`Error: ${errorMessage}`);
            return false;
        }
    };

    const handleEditContract = async (contractData) => {
        try {
            // Validate form data
            const validationErrors = validateFormData(contractData);
            if (validationErrors.length > 0) {
                toast.error(validationErrors[0]);
                return false;
            }
            if (!user?.id) {
                toast.error('User not authenticated');
                return false;
            }

            const idParam = editingContract?.id ?? editingContract?.contract_id;
            if (!idParam) {
                toast.error('No identifier for this contract');
                return false;
            }

            const payload = {
                ...contractData,
                amc_start_date: toDateInput(contractData.amc_start_date),
                amc_end_date: toDateInput(contractData.amc_end_date),
                contract_value: contractData.contract_value ? parseFloat(contractData.contract_value) : 0,
                updated_by: user.id
            };

            console.log('🚀 Updating contract ID:', idParam);
            console.log('🚀 Sending update data:', payload);
            console.log('🚀 User ID:', user.id);

            const response = await api.put(`/contracts/${encodeURIComponent(idParam)}`, payload);

            console.log('📥 Update response:', response.data);

            if (response.data.success) {
                toast.success('Contract updated successfully!');
                await fetchContracts();
                setEditingContract(null);
                setShowEditModal(false);
                return true;
            } else {
                console.error('❌ Server update error:', response.data);
                toast.error(response.data.message || 'Failed to update contract');
                return false;
            }
        } catch (error) {
            console.error('❌ Error updating contract:', error);
            console.error('❌ Update error response:', error.response?.data);
            console.error('❌ Update error status:', error.response?.status);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update contract';
            toast.error(`Update Error: ${errorMessage}`);
            return false;
        }
    };
const handleDeleteContract = async (contractId) => {
        try {
            const response = await api.delete(`/contracts/${encodeURIComponent(contractId)}`);
            if (response.data.success) {
                toast.success('Contract deleted successfully!');
                await fetchContracts();
            } else {
                toast.error(response.data.message || 'Failed to delete contract');
            }
        } catch (error) {
            console.error('❌ Error deleting contract:', error);
            toast.error(error.response?.data?.message || 'Failed to delete contract');
        } finally {
            setShowDeleteModal(false);
            setContractToDelete(null);
        }
    };

    const handleRequestDelete = (contract) => {
        setContractToDelete(contract);
        setShowDeleteModal(true);
    };

    const PaginationControls = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        return (
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, filteredAndSorted.length)}</span> of{' '}
                        <span className="font-medium">{filteredAndSorted.length}</span> contracts
                    </div>
                    <select
                        value={itemsPerPage}
                        onChange={e => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <div className="flex space-x-1">
                        {startPage > 1 && (
                            <React.Fragment>
                                <button onClick={() => setCurrentPage(1)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">1</button>
                                {startPage > 2 && <span className="px-2 py-2 text-gray-500">...</span>}
                            </React.Fragment>
                        )}
                        {pageNumbers.map(number => (
                            <button 
                                key={number} 
                                onClick={() => setCurrentPage(number)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    currentPage === number ? 'bg-blue-600 text-white border border-blue-600' : 
                                    'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {number}
                            </button>
                        ))}
                        {endPage < totalPages && (
                            <React.Fragment>
                                {endPage < totalPages - 1 && <span className="px-2 py-2 text-gray-500">...</span>}
                                <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">{totalPages}</button>
                            </React.Fragment>
                        )}
                    </div>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    const exportToCSV = () => {
        const headers = ['Contract ID', 'Type', 'Owner', 'Start Date', 'End Date', 'Address', 'Location', 'OEM', 'Value', 'Status'];
        const csvContent = [
            headers.join(','),
            ...filteredAndSorted.map(contract => [
                contract.contract_id, contract.type, `"${contract.owner}"`, contract.amc_start_date, contract.amc_end_date, `"${contract.address}"`, contract.location, contract.oem, contract.contract_value || 0, contract.calculated_status
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IGL_AMC_Contracts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Contract data exported successfully!');
    };


    useEffect(() => {
        const escHandler = (e) => { if (e.key === 'Escape' && showDeleteModal) { setShowDeleteModal(false); setContractToDelete(null); navigate('/contracts'); } };
        document.addEventListener('keydown', escHandler);
        return () => document.removeEventListener('keydown', escHandler);
    }, [showDeleteModal, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading contracts...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
                    <p className="text-gray-600 mt-1">
                        Manage AMC contracts and equipment maintenance • {filteredAndSorted.length} contracts
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={exportToCSV}
                        disabled={filteredAndSorted.length === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <FaDownload />
                        <span>Export CSV</span>
                    </button>
                    {user?.role === 'Admin' && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <FaPlus />
                            <span>Add Contract</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FaFileContract className="text-blue-600 text-xl" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Contracts</p>
                            <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FaCheckCircle className="text-green-600 text-xl" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {contracts.filter(c => c.calculated_status === 'Active').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <FaExclamationTriangle className="text-orange-600 text-xl" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {contracts.filter(c => c.calculated_status === 'Expiring Soon').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <FaTimes className="text-red-600 text-xl" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Expired</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {contracts.filter(c => c.calculated_status === 'Expired').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Type
                        </label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types ({contracts.length})</option>
                            {equipmentTypes.map(type => {
                                const count = contracts.filter(c => (c.type || '').toLowerCase() === type.toLowerCase()).length;
                                return (
                                    <option key={type} value={type}>
                                        {type} ({count})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Contracts
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by Contract ID, Type, Owner, Locations"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilterType('');
                                setSearchTerm('');
                                setSortConfig({ key: null, direction: 'asc' });
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <FaTimes />
                            <span>Clear Filters</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Contracts Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="min-w-full">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    { key: 'contract_id', label: 'Contract ID' },
                                    { key: 'type', label: 'Type' },
                                    { key: 'owner', label: 'Owner' },
                                    { key: 'amc_start_date', label: 'Start Date' },
                                    { key: 'amc_end_date', label: 'End Date' },
                                    { key: 'location', label: 'Location' },
                                    { key: 'oem', label: 'OEM' },
                                    { key: 'contract_value', label: 'Value' },
                                    { key: 'calculated_status', label: 'Status' },
                                    ...(user?.role === 'Admin' ? [{ key: 'actions', label: 'Actions' }] : [])
                                ].map(column => (
                                    <th
                                        key={column.key}
                                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                            column.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''
                                        } transition-colors`}
                                        onClick={() => column.key !== 'actions' && handleSort(column.key)}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span className="truncate">{column.label}</span>
                                            {column.key !== 'actions' && (
                                                <div className="flex flex-col">
                                                    <FaCaretUp className={`text-xs ${
                                                        sortConfig.key === column.key && sortConfig.direction === 'asc' 
                                                            ? 'text-blue-600' 
                                                            : 'text-gray-300'
                                                    }`}></FaCaretUp>
                                                    <FaCaretDown className={`text-xs -mt-1 ${
                                                        sortConfig.key === column.key && sortConfig.direction === 'desc' 
                                                            ? 'text-blue-600' 
                                                            : 'text-gray-300'
                                                    }`}></FaCaretDown>
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentContracts.map((contract) => (
                                <tr key={contract.id || contract.contract_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                                            {contract.contract_id}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                            {contract.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm text-gray-900 truncate max-w-48" title={contract.owner}>
                                            {contract.owner}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(contract.amc_start_date)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(contract.amc_end_date)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="truncate max-w-24" title={contract.location}>
                                            {contract.location}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="truncate max-w-20" title={contract.oem}>
                                            {contract.oem}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(contract.contract_value)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.calculated_status)}`}>
                                            {contract.calculated_status}
                                        </span>
                                    </td>
{user?.role === 'Admin' && (
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={() => {
                                                        setEditingContract(contract);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 transition-colors"
                                                    title="Edit Contract"
                                                >
                                                    <FaPen />
                                                </button>
                                                <button
                                                    onClick={() => handleRequestDelete(contract)}
                                                    className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 transition-colors"
                                                    title="Delete Contract"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredAndSorted.length === 0 && (
                    <div className="text-center py-12">
                        <FaFileContract className="text-gray-300 text-4xl mb-4" />
                        <p className="text-gray-500 text-lg mb-2">No contracts found</p>
                        <p className="text-gray-400">
                            {searchTerm || filterType 
                                ? 'Try adjusting your filters' 
                                : 'Click "Add Contract" to create your first contract'
                            }
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredAndSorted.length > 0 && <PaginationControls />}
            </div>

            {/* Add/Edit Contract Modal */}
{showAddModal && (
                <ContractModal
                    key="add"
                    mode="add"
                    isOpen={showAddModal}
                    onClose={() => { setShowAddModal(false); navigate('/contracts'); }}
                    onSubmit={handleAddContract}
                    existingContracts={contracts}
                />
            )}
            {showEditModal && editingContract && (
                <ContractModal
                    key="edit"
                    mode="edit"
                    contract={editingContract}
                    isOpen={showEditModal}
onClose={() => {
                        setShowEditModal(false);
                        setEditingContract(null);
                        navigate('/contracts');
                    }}
                    onSubmit={handleEditContract}
                    existingContracts={contracts}
                />
            )}

{showDeleteModal && contractToDelete && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => { setShowDeleteModal(false); setContractToDelete(null); navigate('/contracts'); }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Delete Contract</h3>
                        </div>
                        <div className="p-5 space-y-3 text-sm text-gray-700">
                            <p>Are you sure you want to delete this contract?</p>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="font-mono text-gray-900 font-semibold">{contractToDelete.contract_id}</div>
                                <div className="text-xs text-gray-600 mt-1">{contractToDelete.type} • {formatDate(contractToDelete.amc_start_date)} → {formatDate(contractToDelete.amc_end_date)}</div>
                            </div>
                        </div>
                        <div className="px-5 pb-5 flex justify-end gap-3">
                            <button onClick={() => { setShowDeleteModal(false); setContractToDelete(null); navigate('/contracts'); }} className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg">Cancel</button>
                            <button onClick={() => handleDeleteContract(contractToDelete.contract_id)} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
const ContractModal = ({ isOpen, onClose, onSubmit, contract = {}, mode = "add", existingContracts = [] }) => {
    const [formData, setFormData] = useState({
        type: '',
        owner: '',
        amc_start_date: '',
        amc_end_date: '',
        address: '',
        location: '',
        oem: '',
        contract_value: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState([]);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (isOpen && !initialized) {
            if (mode === "edit" && contract && (contract.id || contract.contract_id)) {
                setFormData({
                    type: contract.type ?? '',
                    owner: contract.owner ?? '',
                    amc_start_date: toDateInput(contract.amc_start_date),
                    amc_end_date: toDateInput(contract.amc_end_date),
                    address: contract.address ?? '',
                    location: contract.location ?? '',
                    oem: contract.oem ?? '',
                    contract_value: contract.contract_value !== undefined && contract.contract_value !== null ? String(contract.contract_value) : ''
                });
            } else if (mode === "add") {
                setFormData({
                    type: '',
                    owner: '',
                    amc_start_date: '',
                    amc_end_date: '',
                    address: '',
                    location: '',
                    oem: '',
                    contract_value: ''
                });
            }
            setErrors([]);
            setInitialized(true);
        }
        
        if (!isOpen) {
            setInitialized(false);
            setIsSubmitting(false);
            setErrors([]);
        }
    }, [isOpen, mode, contract?.id, contract?.contract_id]);

    
    if (!isOpen) return null;

    useEffect(() => {
        const escHandler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', escHandler);
        return () => document.removeEventListener('keydown', escHandler);
    }, [onClose]);
    
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
        
        // Clear errors when user starts typing
        if (errors.length > 0) {
            setErrors([]);
        }
    }, [errors.length]);

    
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setErrors([]);
        
        // Validate form data
        const validationErrors = validateFormData(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        
        try {
            const success = await onSubmit(formData);
            if (success) {
                // Reset form only if submission was successful
                if (mode === 'add') {
                    setFormData({
                        type: '',
                        owner: '',
                        amc_start_date: '',
                        amc_end_date: '',
                        address: '',
                        location: '',
                        oem: '',
                        contract_value: ''
                    });
                }
            }
        } catch (error) {
            console.error('Error in form submission:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, onSubmit, mode]);
    
    const contractTypes = useMemo(() => ['SCADA Systems', 'Network Equipment', 'Safety Equipment', 'Server', 'Storage', 'Laptop'], []);
    
return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {mode === "edit" ? 'Edit Contract' : 'Add New Contract'}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Error Display */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <FaExclamationTriangle className="text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Please correct the following errors:
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        {errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <form className="p-6 space-y-8" onSubmit={handleSubmit}>
                    {/* Basic Information Section */}
                    <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                        </div>
                        {mode === 'edit' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contract ID</label>
                                <input
                                    type="text"
                                    value={contract?.contract_id || ''}
                                    readOnly
                                    disabled
                                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type *</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select Equipment Type</option>
                                    {contractTypes.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Owner *</label>
                                <input
                                    type="text"
                                    name="owner"
                                    value={formData.owner}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Enter owner name"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contract Duration Section */}
                    <div className="space-y-6">
                        <div className="border-l-4 border-green-500 pl-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Contract Duration</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">AMC Start Date *</label>
                                <input
                                    type="date"
                                    name="amc_start_date"
                                    value={formData.amc_start_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">AMC End Date *</label>
                                <input
                                    type="date"
                                    name="amc_end_date"
                                    value={formData.amc_end_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    min={formData.amc_start_date}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location & Vendor Information Section */}
                    <div className="space-y-6">
                        <div className="border-l-4 border-purple-500 pl-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Location & Vendor Details</h4>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    rows="2"
                                    placeholder="Enter full address"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="e.g., Building A, Floor 2"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">OEM/Vendor</label>
                                    <input
                                        type="text"
                                        name="oem"
                                        value={formData.oem}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="Enter OEM or vendor name"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Information Section */}
                    <div className="space-y-6">
                        <div className="border-l-4 border-orange-500 pl-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h4>
                        </div>
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contract Value (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    name="contract_value"
                                    value={formData.contract_value}
                                    onChange={handleChange}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Enter the total contract value in Indian Rupees</p>
                        </div>
                    </div>

                    {/* Metadata for edit mode */}
                    {mode === 'edit' && contract && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600">
                                <div className="flex justify-between items-center">
                                    {(() => {
                                        const createdRaw = contract.created_at || contract.createdAt || contract.created || contract.created_on;
                                        const updatedRaw = contract.updated_at || contract.updatedAt || contract.updated || contract.updated_on;
                                        return (
                                            <>
                                                <span>Created: {createdRaw ? formatDateTime(createdRaw) : 'N/A'}</span>
                                                <span>Updated: {updatedRaw ? formatDateTime(updatedRaw) : 'N/A'}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center space-x-2"
                        >
                            {isSubmitting ? (
                                <React.Fragment>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <i className={`fas fa-${mode === 'edit' ? 'save' : 'plus'}`}></i>
                                    <span>{mode === 'edit' ? 'Update' : 'Add'} Contract</span>
                                </React.Fragment>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Contracts;

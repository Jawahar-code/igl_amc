import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Help = () => {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('getting-started');
    const [openFAQ, setOpenFAQ] = useState(null);

    const toggleFAQ = (index) => {
        setOpenFAQ(openFAQ === index ? null : index);
    };

    // FAQ Data organized by categories
    const faqData = {
        'getting-started': [
            {
                question: "How do I access the IGL AMC Dashboard?",
                answer: "You can access the dashboard by visiting the application URL and logging in with your approved credentials. If you don't have an account, you'll need to register and wait for admin approval."
            },
            {
                question: "What do I do after registering an account?",
                answer: "After registration, your account will be in 'pending' status. An administrator will review and approve your account within 24-48 hours. You'll receive an email notification once approved."
            },
            {
                question: "How do I reset my password?",
                answer: "Go to Settings > Security tab and use the 'Change Password' form. You'll need your current password to set a new one. After changing your password, you'll be logged out and need to log in again."
            },
            {
                question: "What roles are available in the system?",
                answer: "There are three roles: Admin (full system access), Employee (view and limited edit access), and Vendor (specific access to vendor-related contracts)."
            }
        ],
        'contracts': [
            {
                question: "How do I add a new contract?",
                answer: "Navigate to the Contracts page and click the 'Add Contract' button. Fill in all required fields including equipment type, owner, AMC dates, and contract value. Only Admin users can add contracts."
            },
            {
                question: "What does each contract status mean?",
                answer: "Active: Contract is currently valid. Expiring: Contract expires within 30 days. Expired: Contract has passed its end date. The system automatically calculates these statuses based on AMC dates."
            },
            {
                question: "How are Contract IDs generated?",
                answer: "Contract IDs are automatically generated in the format 'IGL-AMC-XXXXXXXX' where X represents an 8-digit unique timestamp. You cannot manually edit contract IDs."
            },
            {
                question: "Can I delete a contract?",
                answer: "Yes, Admin users can delete contracts. Click the trash icon next to any contract, and you'll see a confirmation modal with contract details before permanent deletion."
            },
            {
                question: "How do I search and filter contracts?",
                answer: "Use the search bar to find contracts by ID, type, owner, location, or OEM. You can also filter by equipment type using the dropdown. The table supports sorting by clicking column headers."
            }
        ],
        'users': [
            {
                question: "How do I approve new user registrations?",
                answer: "Admin users can go to Users > Pending Approvals tab. Review user details and click 'Approve' or 'Reject'. You can add admin notes when approving users."
            },
            {
                question: "How do I change a user's role?",
                answer: "In the Users page, click on the user's current role badge or use the 'Edit Role' button. Select the new role (Admin, Employee, or Vendor) from the dropdown."
            },
            {
                question: "What happens when I deactivate a user?",
                answer: "Deactivated users cannot log into the system but their account data remains. You can reactivate them at any time. The status is shown by the colored circle next to their approval status."
            },
            {
                question: "Can I see who approved a user?",
                answer: "Yes, in the All Users table, there's an 'Approved By' column that shows which admin approved each user account."
            }
        ],
        'technical': [
            {
                question: "Which browsers are supported?",
                answer: "The dashboard works best on modern browsers including Chrome 80+, Firefox 75+, Safari 13+, and Edge 80+. Mobile browsers are supported but desktop experience is recommended."
            },
            {
                question: "Is my data secure?",
                answer: "Yes, all data is encrypted in transit and at rest. User authentication uses secure tokens, and admin actions are logged. Regular backups are performed automatically."
            },
            {
                question: "What if I encounter an error?",
                answer: "Most errors show helpful toast notifications. If you encounter a persistent issue, note the error message and contact your system administrator with details about what you were doing when the error occurred."
            },
            {
                question: "How do I export contract data?",
                answer: "Currently, you can copy contract data from the table. Future updates will include CSV export functionality. Contact your admin if you need bulk data exports."
            }
        ]
    };

    const categories = [
        { id: 'getting-started', name: 'Getting Started', icon: '🚀', description: 'Basic setup and account management' },
        { id: 'contracts', name: 'Contract Management', icon: '📄', description: 'Adding, editing, and managing contracts' },
        { id: 'users', name: 'User Management', icon: '👥', description: 'User roles, approvals, and permissions' },
        { id: 'technical', name: 'Technical Support', icon: '🔧', description: 'Browser support and troubleshooting' }
    ];

    // Filter categories based on user role
    const availableCategories = categories.filter(category => {
        if (category.id === 'users' && user?.role !== 'Admin') {
            return false;
        }
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
                        <p className="text-gray-600 mt-1">Find answers to common questions and learn how to use the system</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Welcome, {user?.name}</span>
                    </div>
                </div>

                {/* Quick Access Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {availableCategories.map(category => (
                        <div
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                                activeCategory === category.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">{category.icon}</div>
                            <h3 className={`font-semibold mb-1 ${
                                activeCategory === category.id ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                                {category.name}
                            </h3>
                            <p className={`text-sm ${
                                activeCategory === category.id ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                                {category.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* FAQ Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-6">
                        <span className="text-2xl mr-3">
                            {categories.find(c => c.id === activeCategory)?.icon}
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {categories.find(c => c.id === activeCategory)?.name}
                            </h2>
                            <p className="text-gray-600 text-sm">
                                {categories.find(c => c.id === activeCategory)?.description}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {faqData[activeCategory]?.map((faq, index) => (
                            <div key={index} className="bg-white rounded-lg border border-gray-200">
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transform transition-transform ${
                                            openFAQ === index ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFAQ === index && (
                                    <div className="px-6 pb-4">
                                        <div className="border-t border-gray-100 pt-4">
                                            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Support */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Still Need Help?</h3>
                            <p className="text-blue-700 mb-4">
                                If you can't find the answer you're looking for, don't hesitate to reach out to our support team.
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center text-blue-800">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>Email: admin@igl-amc.com</span>
                                </div>
                                <div className="flex items-center text-blue-800">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Response Time: Within 24 hours</span>
                                </div>
                                <div className="flex items-center text-blue-800">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>System Status: All services operational</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Version Information */}
                <div className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-200">
                    <p>IGL AMC Dashboard v1.0 • Last updated: August 2025</p>
                    <p>For technical issues, contact your system administrator</p>
                </div>
            </div>
        </div>
    );
};

export default Help;

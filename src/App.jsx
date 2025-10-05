import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import DashboardLayout from './components/Layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Users from './pages/users';
import Tasks from './pages/Tasks';
import VendorContracts from './pages/VendorContracts';
import Payments from './pages/Payments';
import RequestVendor from './pages/RequestVendor';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Auth Route */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
            
            {/* Protected Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/contracts" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Contracts />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Tasks />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route
             path ="/users"
             element={
               <ProtectedRoute>
                 <DashboardLayout>
                   <Users />
                 </DashboardLayout>
               </ProtectedRoute>
             }
            />
            <Route
              path="/vendor-contracts"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <VendorContracts />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Payments />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/new-vendor"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <RequestVendor />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/help" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Help />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

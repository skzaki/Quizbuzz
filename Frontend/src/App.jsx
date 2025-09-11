import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminRoute from "./components/AdminRoute";
import Layout from './components/Layout/Layout';
import ThankYouScreen from './components/LiveContest/ThankYouScreen';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AdminContestDetail from './pages/admin/AdminContestDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import ContestManagement from './pages/admin/ContestManagement';
import PaymentManagement from './pages/admin/PaymentManagement';
import QuestionBank from './pages/admin/QuestionBank';
import ContestJoin from './pages/ContestJoin';
import ContestResult from './pages/ContestResult';
import Landing from './pages/Landing';
import LiveContest from './pages/LiveContest';
import Login from './pages/Login';
import WaitingRoom from './pages/WaitingRoom';

function App() {

    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter >
                {/* User Routes */}
                    <Routes>
                        <Route path='/' element={<Landing/>} />
                        <Route path="/login" element={<Login />} />
                        
                        <Route path="/" element={<Layout/>} > 
    
                            {/* Admin Routes */}
                            <Route path="/admin" element={<AdminRoute> <AdminDashboard /> </AdminRoute>} />
                            <Route path="/admin/contests" element={<AdminRoute> <ContestManagement /> </AdminRoute>} />
                            <Route path="/admin/contests/:id" element={<AdminRoute> <AdminContestDetail /> </AdminRoute>} />
                            <Route path="/admin/questions" element={<AdminRoute> <QuestionBank /> </AdminRoute>} />
                            <Route path="/admin/payments" element={<AdminRoute> <PaymentManagement /> </AdminRoute>} />
                            <Route path="/admin/analytics" element={<AdminRoute> <Analytics /> </AdminRoute>} />



                        </Route>
                         {/*User Routes*/}
                            <Route path="/contest/join" element={<ContestJoin />} />
                            <Route path="/contest/waiting-room" element={<WaitingRoom />} />
                            <Route path="/contest/live/:contestId" element={<LiveContest />} />
                            <Route path="/contest/result/:submissionId" element={<ContestResult/>} />
                            <Route path="/contest/result/evaluate/:submissionId" element={<ThankYouScreen/>} />
                            {/* <Route path="/exam-protection-test" element={<ExamProtectionTest />} /> */}

                </Routes>
                 <Toaster
                    position="top-center"
                    reverseOrder={false}
                    gutter={8}
                    containerClassName=""
                    containerStyle={{
                        top: 20,
                        left: 20,
                        right: 20,
                        bottom: 20,
                    }}
                    toastOptions={{
                        // Default options for all toasts
                        duration: 5000,
                        style: {
                            background: '#fff',
                            color: '#363636',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '14px',
                            fontWeight: '500',
                            padding: '12px 16px',
                            maxWidth: '90vw',
                            wordBreak: 'break-word',
                        },
                        // Success toast styling
                        success: {
                            duration: 3000,
                            style: {
                                background: '#10b981',
                                color: '#fff',
                                border: '1px solid #059669',
                            },
                            iconTheme: {
                                primary: '#fff',
                                secondary: '#10b981',
                            },
                        },
                        // Error toast styling
                        error: {
                            duration: 4500,
                            style: {
                                background: '#ef4444',
                                color: '#fff',
                                border: '1px solid #dc2626',
                            },
                            iconTheme: {
                                primary: '#fff',
                                secondary: '#ef4444',
                            },
                        },
                        // Loading toast styling
                        loading: {
                            style: {
                                background: '#3b82f6',
                                color: '#fff',
                                border: '1px solid #2563eb',
                            },
                        },
                    }}
                />
                </BrowserRouter >
            </AuthProvider>
        </ThemeProvider>
  );
}

export default App

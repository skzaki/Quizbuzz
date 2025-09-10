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
                </BrowserRouter >
            </AuthProvider>
        </ThemeProvider>
  );
}

export default App

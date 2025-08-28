import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ContestJoin from './pages/ContestJoin';
import ContestResult from './pages/ContestResult';
import LiveContest from './pages/LiveContest';
import WaitingRoom from './pages/WaitingRoom';
import AdminContestDetail from './pages/admin/AdminContestDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import ContestManagement from './pages/admin/ContestManagement';
import PaymentManagement from './pages/admin/PaymentManagement';
import QuestionBank from './pages/admin/QuestionBank';

function App() {

    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter >
                {/* User Routes */}
                    <Routes>
                        <Route path="/" element={<Layout/>} > 
                            {/*User Routes*/}
                            <Route path="/contest/join" element={<ContestJoin />} />
                            <Route path="/contest/waiting-room" element={<WaitingRoom />} />
                            <Route path="/contest/live/:contestId" element={<LiveContest />} />
                            <Route path="/contest/result/:submissionId" element={<ContestResult/>} />

                            {/*Admin Routes */}
                            <Route path="/admin" element={<AdminDashboard/>} />
                            <Route path="/admin/contests" element={<ContestManagement />} />
                            <Route path="/admin/contests/:id" element={<AdminContestDetail/>} />
                            <Route path="/admin/questions" element={<QuestionBank />} />
                            <Route path="/admin/payments" element={<PaymentManagement />} />
                            <Route path="/admin/analytics" element={<Analytics />} />

                        </Route>
                </Routes>
                </BrowserRouter >
            </AuthProvider>
        </ThemeProvider>
  );
}

export default App

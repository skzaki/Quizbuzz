import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ContestJoin from './pages/ContestJoin';
import ContestResult from './pages/ContestResult';
import LiveContest from './pages/LiveContest';
import WaitingRoom from './pages/WaitingRoom';

function App() {

    return (
    <BrowserRouter>
        <Routes>
            <Route path="/contest/join" element={<ContestJoin />} />
            <Route path="/contest/waiting-room" element={<WaitingRoom />} />
            <Route path="/contest/live/:contestId" element={<LiveContest />} />
            <Route path="/contest/result/" element={<ContestResult/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/LandingPage';
import Unlock from './pages/UnlockPage';
import Tool from './pages/Tool';
import Admin from './pages/AdminPage';
import LicenseGate from './components/LicenseGate';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/admin" element={<Admin />} />
          <Route 
            path="/tool" 
            element={
              <LicenseGate>
                <Tool />
              </LicenseGate>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toaster position="top-center" />
    </Router>
  );
}

export default App;

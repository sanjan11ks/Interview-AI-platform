import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import RoleConfirm from './pages/RoleConfirm';
import Interview from './pages/Interview';
import ThankYou from './pages/ThankYou';
import Admin from './pages/Admin';
import InviteLanding from './pages/InviteLanding';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/upload"          element={<Upload />} />
        <Route path="/invite/:token"   element={<InviteLanding />} />
        <Route path="/confirm"         element={<RoleConfirm />} />
        <Route path="/interview"       element={<Interview />} />
        <Route path="/done"            element={<ThankYou />} />
        <Route path="/admin"           element={<Admin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

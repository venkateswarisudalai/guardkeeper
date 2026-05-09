import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Areas from './pages/Areas';
import Guards from './pages/Guards';
import Attendance from './pages/Attendance';
import Salary from './pages/Salary';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/guards" element={<Guards />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

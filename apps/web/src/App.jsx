import { Routes, Route, Navigate } from 'react-router-dom';
import Protected from './components/Protected.jsx';
import Shell from './components/Shell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';
import AgentPage from './pages/AgentPage.jsx';
import History from './pages/History.jsx';
import Usage from './pages/Usage.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminServices from './pages/AdminServices.jsx';
import AdminData from './pages/AdminData.jsx';
import AdminDocs from './pages/AdminDocs.jsx';
import AdminReports from './pages/AdminReports.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Shell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/itinerary" element={<AgentPage mode="itinerary" />} />
          <Route path="/adjust" element={<AgentPage mode="adjust" />} />
          <Route path="/history" element={<History />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/services" element={<AdminServices />} />
          <Route path="/admin/data" element={<AdminData />} />
          <Route path="/admin/docs" element={<AdminDocs />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Timeline from './pages/Timeline';
import Reports from './pages/Reports';
import { ConfirmationManager } from './components/tracking/ConfirmationManager';

// プレースホルダーページ（後で実装）
const Settings = () => <div className="p-8 text-white">設定（実装予定）</div>;

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      {/* グローバル確認ダイアログ */}
      <ConfirmationManager />
    </BrowserRouter>
  );
}

export default App;


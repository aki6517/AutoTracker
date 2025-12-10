import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';

// プレースホルダーページ（後で実装）
const Timeline = () => <div className="p-8 text-white">タイムライン（実装予定）</div>;
const Projects = () => <div className="p-8 text-white">プロジェクト（実装予定）</div>;
const Reports = () => <div className="p-8 text-white">レポート（実装予定）</div>;
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
    </BrowserRouter>
  );
}

export default App;


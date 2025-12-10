import { useEffect } from 'react';

function Dashboard() {
  useEffect(() => {
    // IPC通信のテスト
    if (window.api?.test?.ping) {
      window.api.test
        .ping()
        .then((response: string) => {
          console.log('IPC Test Response:', response);
        })
        .catch((error: unknown) => {
          console.error('IPC Test Error:', error);
        });
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-4">AutoTracker</h1>
      <p className="text-gray-400">AI-Powered Automatic Time Tracking for Freelancers</p>
      <div className="mt-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Welcome</h2>
          <p className="text-gray-300">
            Electron + React + TypeScript プロジェクトが正常に起動しました。
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;


import { Dashboard } from './components/Dashboard';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <Dashboard />
    </div>
  );
}

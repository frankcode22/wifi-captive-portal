// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/WifiPortalHome';
import { Toaster } from 'react-hot-toast';
import './App.css';

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
           <Route path="/login" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 80,
          zIndex: 9999,
        }}
      />
    </Router>
  );
}

export default App;
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Search from '@/pages/Search';
import AllFiles from '@/pages/AllFiles';
import Images from '@/pages/Images';
import PDFs from '@/pages/PDFs';
import Notes from '@/pages/Notes';
import Settings from '@/pages/Settings';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/files" element={<AllFiles />} />
        <Route path="/images" element={<Images />} />
        <Route path="/pdfs" element={<PDFs />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;

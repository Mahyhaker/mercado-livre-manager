import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ListingsPage from '../pages/ListingsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
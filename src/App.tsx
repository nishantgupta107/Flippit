import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './screens/Home';
import { Singleplayer } from './screens/Singleplayer';
import { Game } from './screens/Game';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/singleplayer" element={<Singleplayer />} />
        <Route path="/game" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

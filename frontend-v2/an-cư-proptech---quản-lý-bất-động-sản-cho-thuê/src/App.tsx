import { AuthProvider } from '@/providers/AuthProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import { BrowserRouter } from 'react-router';
import { VneidProvider } from '@/providers/VneidProvider';

export default function App() {
  return <BrowserRouter><VneidProvider><AuthProvider><AppRoutes /></AuthProvider></VneidProvider></BrowserRouter>;
}

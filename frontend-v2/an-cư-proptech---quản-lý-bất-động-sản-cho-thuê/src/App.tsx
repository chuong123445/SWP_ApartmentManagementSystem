import { AuthProvider } from '@/providers/AuthProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import { BrowserRouter } from 'react-router';
import { VneidProvider } from '@/providers/VneidProvider';
import { FloatingMessages } from '@/components/navigation/FloatingMessages';

export default function App() {
  return <BrowserRouter><VneidProvider><AuthProvider><FloatingMessages><AppRoutes /></FloatingMessages></AuthProvider></VneidProvider></BrowserRouter>;
}

import { AuthProvider } from '@/providers/AuthProvider';
import { AppRoutes } from '@/routes/AppRoutes';
import { BrowserRouter } from 'react-router';

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}

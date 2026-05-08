import { Navigate } from 'react-router-dom';

/**
 * HomePage — redirige directamente al login.
 * La pantalla de bienvenida intermedia no aportaba valor y generaba
 * un paso extra innecesario. El LoginPage es el punto de entrada real.
 */
export default function HomePage() {
  return <Navigate to="/login" replace />;
}

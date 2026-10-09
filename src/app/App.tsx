import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthCallback } from '../features/auth/AuthCallback';
import { ForgotPassword } from '../features/auth/ForgotPassword';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { ResetPassword } from '../features/auth/ResetPassword';
import { Legal } from '../features/legal/Legal';
import { Settings } from '../features/settings/Settings';
import { Today } from '../features/today/Today';
import { Welcome } from '../features/today/Welcome';
import { PublicOnly, RequireAuth } from './guards';
import { Start } from './Start';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/" element={<Start />} />
            <Route path="/registrieren" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/passwort-vergessen" element={<ForgotPassword />} />
          </Route>

          <Route path="/passwort-neu" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/agb" element={<Legal titleKey="legal.terms" />} />
          <Route path="/datenschutz" element={<Legal titleKey="legal.privacy" />} />
          <Route path="/impressum" element={<Legal titleKey="legal.imprint" />} />

          <Route element={<RequireAuth />}>
            <Route path="/willkommen" element={<Welcome />} />
            <Route path="/heute" element={<Today />} />
            <Route path="/einstellungen" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

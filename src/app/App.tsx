import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Admin } from '../features/admin/Admin';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthCallback } from '../features/auth/AuthCallback';
import { ForgotPassword } from '../features/auth/ForgotPassword';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { ResetPassword } from '../features/auth/ResetPassword';
import { Legal } from '../features/legal/Legal';
import { GroupDetail } from '../features/groups/GroupDetail';
import { Groups } from '../features/groups/Groups';
import { JoinByLink } from '../features/groups/JoinByLink';
import { NewGroup } from '../features/groups/NewGroup';
import { ProfilePage } from '../features/profile/ProfilePage';
import { Ranking } from '../features/ranking/Ranking';
import { Settings } from '../features/settings/Settings';
import { Submit } from '../features/today/Submit';
import { Today } from '../features/today/Today';
import { Welcome } from '../features/today/Welcome';
import { PublicOnly, RequireAdmin, RequireAuth } from './guards';
import { AppShell } from './AppShell';
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
          <Route path="/beitreten/:code" element={<JoinByLink />} />

          <Route path="/agb" element={<Legal titleKey="legal.terms" />} />
          <Route path="/datenschutz" element={<Legal titleKey="legal.privacy" />} />
          <Route path="/impressum" element={<Legal titleKey="legal.imprint" />} />

          <Route element={<RequireAuth />}>
            <Route path="/willkommen" element={<Welcome />} />
            <Route element={<AppShell />}>
              <Route path="/heute" element={<Today />} />
              <Route path="/heute/abgabe" element={<Submit />} />
              <Route path="/gruppen" element={<Groups />} />
              <Route path="/gruppen/neu" element={<NewGroup />} />
              <Route path="/gruppen/:id" element={<GroupDetail />} />
              <Route path="/rangliste" element={<Ranking />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/einstellungen" element={<Settings />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

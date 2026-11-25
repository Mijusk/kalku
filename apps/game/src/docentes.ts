import { pickPrivacyLocale, readStoredProgress } from './privacyLocale';
import { appTeacherBackend } from './teacher';
import { TeacherPanel } from './ui/TeacherPanel';
import './ui/styles.css';
import './docentes.css';

// Entrada propia (sin Phaser), como /privacidad. El cliente del adulto lee aquí el enlace de acceso del correo.
const root = document.getElementById('teacher');
if (root) {
  const locale = pickPrivacyLocale(location.search, readStoredProgress(), navigator.languages ?? []);
  document.documentElement.lang = locale;
  new TeacherPanel(root, locale, { backend: appTeacherBackend(), onClose: () => location.assign('/') });
}

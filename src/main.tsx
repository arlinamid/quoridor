import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function bootstrap() {
  // Harmadik féltől származó iframe kontextusban (pl. böngésző plugin) a
  // localStorage és sütik csak az allow="storage-access" + requestStorageAccess()
  // után érhetők el. Sikertelen hívás esetén az app korlátozott storage-dzsal fut tovább.
  if (typeof document.requestStorageAccess === 'function') {
    try {
      await document.requestStorageAccess();
    } catch {
      // hozzáférés megtagadva vagy nem releváns — a játék folytatódik
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();

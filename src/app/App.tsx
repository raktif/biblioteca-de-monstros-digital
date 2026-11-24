import { useEffect, useState } from 'react';
import { initializeRuntime, type RuntimeInfo } from '../infrastructure/runtime';

export function App() {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    initializeRuntime()
      .then((result) => {
        if (active) setRuntime(result);
      })
      .catch(() => {
        if (active) setError('Não foi possível inicializar a aplicação.');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="startup" aria-labelledby="app-title">
      <section className="startup-card">
        <span className="eyebrow">BESTIÁRIO LOCAL</span>
        <h1 id="app-title">Biblioteca de Monstros Digital</h1>
        <p className="startup-copy">
          A fundação do aplicativo está pronta. As bibliotecas e fichas serão adicionadas nas próximas etapas.
        </p>
        <div className="status" role="status" aria-live="polite">
          {error ?? (runtime ? `Ambiente ${runtime.environment} inicializado.` : 'Inicializando…')}
        </div>
      </section>
    </main>
  );
}

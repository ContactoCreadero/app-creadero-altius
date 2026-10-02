'use client';

import { useState } from 'react';
import { useDatos } from '@/components/DataProvider';

export default function LoginAdmin({ onCerrar }: { onCerrar: () => void }) {
  const { ingresarAdmin } = useDatos();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Ingresa la contraseña.');
    setEnviando(true);
    setError('');
    const r = await ingresarAdmin(password);
    setEnviando(false);
    if (r.ok) onCerrar();
    else setError(r.error || 'No se pudo ingresar');
  };

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={enviar} aria-label="Ingreso administrador">
        <div className="modal-cabecera">
          <h3>🔐 Ingreso administrador</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        <p className="muted small">
          Uso interno de Creadero. Permite agregar, editar, duplicar y eliminar actividades y facturas, y subir documentos.
        </p>
        <label className="campo" style={{ marginTop: 12 }}>
          <span>Contraseña</span>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-acciones">
          <span className="nav-spacer" />
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
        </div>
      </form>
    </div>
  );
}

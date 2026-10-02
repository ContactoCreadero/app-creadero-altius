'use client';

import { useState } from 'react';
import { LogoAltius, LogoCreadero } from '@/components/Logos';
import { CONFIG_INICIAL } from '@/lib/constants';
import type { UsuarioIngreso } from '@/components/DataProvider';

interface Props {
  ingresar: (usuario: UsuarioIngreso, password: string) => Promise<{ ok: boolean; error?: string }>;
  altiusRequierePassword: boolean;
}

const PERFILES: {
  id: UsuarioIngreso;
  nombre: string;
  rol: string;
  descripcion: string;
  logo: 'creadero' | 'altius';
}[] = [
  {
    id: 'creadero',
    nombre: 'Creadero',
    rol: 'Administrador',
    descripcion: 'Registra y actualiza actividades, facturas, documentos y estados de pago.',
    logo: 'creadero',
  },
  {
    id: 'altius',
    nombre: 'ALTIUS',
    rol: 'Visualización',
    descripcion: 'Consulta el avance del programa, montos utilizados, obras y facturación.',
    logo: 'altius',
  },
];

/** Pantalla de inicio: elegir perfil (Creadero / Altius) e ingresar. */
export default function PantallaIngreso({ ingresar, altiusRequierePassword }: Props) {
  const [elegido, setElegido] = useState<UsuarioIngreso | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const requierePassword = (u: UsuarioIngreso) => u === 'creadero' || altiusRequierePassword;

  const elegir = (u: UsuarioIngreso) => {
    setElegido(u);
    setPassword('');
    setError('');
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elegido) return;
    if (requierePassword(elegido) && !password) return setError('Ingresa la contraseña.');
    setEnviando(true);
    setError('');
    const r = await ingresar(elegido, password);
    setEnviando(false);
    if (!r.ok) setError(r.error || 'No se pudo ingresar');
  };

  return (
    <div className="ingreso">
      <div className="ingreso-contenido">
        <div className="ingreso-cabecera">
          <LogoCreadero height={46} />
          <span className="eyebrow">Estado de avance</span>
          <h1>{CONFIG_INICIAL.programa}</h1>
          <p className="muted">Selecciona tu perfil para ingresar</p>
        </div>

        <div className="ingreso-perfiles">
          {PERFILES.map((p) => {
            const activo = elegido === p.id;
            return (
              <div key={p.id} className={`perfil perfil-${p.id}` + (activo ? ' activo' : '')}>
                <button type="button" className="perfil-boton" onClick={() => elegir(p.id)} aria-pressed={activo}>
                  <div className="perfil-logo">
                    {p.logo === 'creadero' ? <LogoCreadero height={40} /> : <LogoAltius height={46} />}
                  </div>
                  <div className="perfil-texto">
                    <strong>{p.nombre}</strong>
                    <span className="perfil-rol">{p.rol}</span>
                    <span className="muted small">{p.descripcion}</span>
                  </div>
                </button>

                {activo && (
                  <form className="perfil-form" onSubmit={enviar}>
                    {requierePassword(p.id) && (
                      <label className="campo">
                        <span>Contraseña</span>
                        <input
                          type="password"
                          autoFocus
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                        />
                      </label>
                    )}
                    {error && <p className="error">{error}</p>}
                    <button type="submit" className="btn btn-primario" disabled={enviando}>
                      {enviando ? 'Ingresando…' : `Ingresar como ${p.nombre}`}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        <p className="ingreso-pie muted small">
          Elaborado por <strong>Creadero Consultoría y Capacitación</strong> · OTEC con franquicia SENCE
        </p>
      </div>
    </div>
  );
}

"use client";
import { useState } from 'react';

export default function TorneoExpressPage() {
  const [tabActiva, setTabActiva] = useState('posiciones');

  // --- ESTADOS DE LA BASE DE DATOS LOCAL ---
  const [equipos, setEquipos] = useState([
    { id: 1, nombre: "Equipo 1", grupo: "Grupo A Varones", encargado: "Juan Pérez", pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0 },
    { id: 2, nombre: "Equipo 2", grupo: "Grupo A Varones", encargado: "Diego Gómez", pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0 },
    { id: 3, nombre: "Equipo A", grupo: "Grupo B Varones", encargado: "Carlos Tapia", pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0 },
    { id: 4, nombre: "Equipo 1 Damas", grupo: "Damas", encargado: "Ana Silva", pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0 },
  ]);

  const [jugadores, setJugadores] = useState([
    { id: 1, nombre: "Carlos", equipoId: 1, goles: 3, amarillas: 1, rojas: 0 },
    { id: 2, nombre: "Felipe", equipoId: 2, goles: 1, amarillas: 0, rojas: 0 },
    { id: 3, nombre: "María", equipoId: 4, goles: 4, amarillas: 0, rojas: 0 },
  ]);

  const [partidos, setPartidos] = useState([
    { id: 1, local: "Equipo 1", visita: "Equipo 2", golesLocal: 2, golesVisita: 1, faltasLocal: 3, faltasVisita: 2, estado: "En Curso", grupo: "Grupo A Varones" }
  ]);

  // --- ESTADOS PARA LOS MODALES (VENTANAS EMERGENTES) ---
  const [modalEquipo, setModalEquipo] = useState(false);
  const [modalJugador, setModalJugador] = useState(false);

  // Formulario Nuevo Equipo
  const [formEquipo, setFormEquipo] = useState({ nombre: '', encargado: '', grupo: '' });
  
  // Formulario Administrar Plantel
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState('');
  const [nuevoNombreJugador, setNuevoNombreJugador] = useState('');
  const [jugadorEditando, setJugadorEditando] = useState(null); // Guarda el ID del jugador que se está editando
  const [nombreEdicion, setNombreEdicion] = useState('');

  // --- FUNCIONES DE EQUIPOS ---
  const registrarEquipo = () => {
    if (!formEquipo.nombre || !formEquipo.grupo || !formEquipo.encargado) {
      alert("Completa todos los campos del equipo");
      return;
    }
    const nuevoEquipo = {
      id: Date.now(),
      ...formEquipo,
      pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0
    };
    setEquipos([...equipos, nuevoEquipo]);
    setFormEquipo({ nombre: '', encargado: '', grupo: '' }); // Limpiar
    setModalEquipo(false); // Cerrar modal
  };

  // --- FUNCIONES DE JUGADORES (CRUD) ---
  const agregarJugador = () => {
    if (!nuevoNombreJugador.trim() || !equipoSeleccionadoId) return;
    
    const nuevoJugador = {
      id: Date.now(),
      nombre: nuevoNombreJugador,
      equipoId: Number(equipoSeleccionadoId),
      goles: 0, amarillas: 0, rojas: 0
    };
    setJugadores([...jugadores, nuevoJugador]);
    setNuevoNombreJugador('');
  };

  const eliminarJugador = (id) => {
    if(window.confirm("¿Eliminar este jugador del plantel?")) {
      setJugadores(jugadores.filter(j => j.id !== id));
    }
  };

  const iniciarEdicionJugador = (jugador) => {
    setJugadorEditando(jugador.id);
    setNombreEdicion(jugador.nombre);
  };

  const guardarEdicionJugador = (id) => {
    setJugadores(jugadores.map(j => j.id === id ? { ...j, nombre: nombreEdicion } : j));
    setJugadorEditando(null);
  };

  // --- COMPONENTES VISUALES INTERNOS ---
  const RenderTabla = ({ titulo, grupoFiltro }) => {
    const equiposFiltrados = equipos.filter(eq => eq.grupo === grupoFiltro).sort((a, b) => b.pf - a.pf || b.dg - a.dg);

    return (
      <div className="mb-8 bg-neutral-800 p-4 rounded-lg border border-purple-900/50">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">{titulo}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm text-gray-300 min-w-max">
            <thead className="bg-neutral-900/50 text-purple-400">
              <tr>
                <th className="p-2 text-left">Equipo</th>
                <th className="p-2" title="Partidos Jugados">PJ</th>
                <th className="p-2" title="Faltas Acumuladas">FA</th>
                <th className="p-2" title="Partidos Ganados">PG</th>
                <th className="p-2" title="Partidos Empatados">PE</th>
                <th className="p-2" title="Partidos Perdidos">PP</th>
                <th className="p-2" title="Goles a Favor">GF</th>
                <th className="p-2" title="Goles en Contra">GC</th>
                <th className="p-2" title="Diferencia de Goles">DG</th>
                <th className="p-2 text-white font-bold" title="Puntaje Final">PF</th>
              </tr>
            </thead>
            <tbody>
              {equiposFiltrados.length === 0 && (
                <tr><td colSpan="10" className="p-4 text-gray-500">Aún no hay equipos inscritos en este grupo.</td></tr>
              )}
              {equiposFiltrados.map((eq, i) => (
                <tr key={eq.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30">
                  <td className="p-2 text-left font-medium text-white">
                    {i + 1}. {eq.nombre}
                    <span className="block text-[10px] text-gray-500 font-normal">DT: {eq.encargado}</span>
                  </td>
                  <td className="p-2">{eq.pj}</td>
                  <td className="p-2 text-amber-500 font-medium">{eq.fa}</td>
                  <td className="p-2 text-green-400">{eq.pg}</td>
                  <td className="p-2 text-gray-400">{eq.pe}</td>
                  <td className="p-2 text-red-400">{eq.pp}</td>
                  <td className="p-2">{eq.gf}</td>
                  <td className="p-2">{eq.gc}</td>
                  <td className="p-2">{eq.dg}</td>
                  <td className="p-2 font-bold text-white bg-purple-900/20">{eq.pf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 relative">
      <h1 className="text-3xl font-bold text-purple-500 mb-6 text-center">Torneo Express ⚡</h1>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-700 pb-2 justify-center">
        <button onClick={() => setTabActiva('posiciones')} className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${tabActiva === 'posiciones' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Tablas de Posiciones</button>
        <button onClick={() => setTabActiva('partidos')} className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${tabActiva === 'partidos' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Marcador en Vivo</button>
        <button onClick={() => setTabActiva('estadisticas')} className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${tabActiva === 'estadisticas' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Estadísticas y Jugadores</button>
      </div>

      {tabActiva === 'posiciones' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in">
          <RenderTabla titulo="Grupo A Varones" grupoFiltro="Grupo A Varones" />
          <RenderTabla titulo="Grupo B Varones" grupoFiltro="Grupo B Varones" />
          <RenderTabla titulo="Damas" grupoFiltro="Damas" />
        </div>
      )}

      {tabActiva === 'partidos' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in flex flex-col gap-6">
          <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded w-fit">+ Nuevo Partido</button>
          
          {partidos.map(partido => (
            <div key={partido.id} className="bg-neutral-800 p-6 rounded-lg border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col items-center flex-1">
                <span className="text-xl font-bold text-white mb-2">{partido.local}</span>
                <div className="flex gap-2 mb-2">
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-xl">-</button>
                  <span className="text-4xl font-black text-white w-12 text-center">{partido.golesLocal}</span>
                  <button className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xl">+</button>
                </div>
                <span className="text-sm text-amber-500 font-medium">Faltas Acum. (FA): {partido.faltasLocal}</span>
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/50 uppercase tracking-widest animate-pulse">
                  {partido.estado}
                </span>
                <span className="text-gray-500 text-sm">{partido.grupo}</span>
                <button className="text-purple-400 hover:text-white text-sm underline mt-2">Agregar Tarjetas/Goleadores</button>
              </div>

              <div className="flex flex-col items-center flex-1">
                <span className="text-xl font-bold text-white mb-2">{partido.visita}</span>
                <div className="flex gap-2 mb-2">
                  <button className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-xl">-</button>
                  <span className="text-4xl font-black text-white w-12 text-center">{partido.golesVisita}</span>
                  <button className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xl">+</button>
                </div>
                <span className="text-sm text-amber-500 font-medium">Faltas Acum. (FA): {partido.faltasVisita}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tabActiva === 'estadisticas' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">⚽ Tabla de Goleadores</h3>
            <ul className="flex flex-col gap-2">
              {jugadores.filter(j => j.goles > 0).sort((a,b) => b.goles - a.goles).map((jug, index) => (
                <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/50 rounded border border-neutral-800">
                  <div className="flex gap-3">
                    <span className="text-gray-500 font-bold w-4">{index + 1}.</span>
                    <span className="text-white font-medium">{jug.nombre}</span>
                  </div>
                  <span className="text-purple-400 font-bold">{jug.goles} Goles</span>
                </li>
              ))}
              {jugadores.filter(j => j.goles > 0).length === 0 && (
                <li className="text-gray-500 text-sm">Aún no hay goles registrados.</li>
              )}
            </ul>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
             <h3 className="text-xl font-bold text-white mb-4">Administrar</h3>
             <div className="flex flex-col gap-3">
               <button onClick={() => setModalEquipo(true)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white p-3 rounded font-medium text-left border border-neutral-600 flex justify-between transition-colors">
                 ➕ Inscribir Equipo Nuevo <span className="text-gray-400">→</span>
               </button>
               <button onClick={() => setModalJugador(true)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white p-3 rounded font-medium text-left border border-neutral-600 flex justify-between transition-colors">
                 👤 Administrar Planteles <span className="text-gray-400">→</span>
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 1: INSCRIBIR EQUIPO NUEVO           */}
      {/* ========================================= */}
      {modalEquipo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-md border border-purple-900/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Inscribir Equipo</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del Equipo</label>
                <input type="text" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none" placeholder="Ej. Los Titanes"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del Encargado / DT</label>
                <input type="text" value={formEquipo.encargado} onChange={e => setFormEquipo({...formEquipo, encargado: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none" placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría / Grupo</label>
                <select value={formEquipo.grupo} onChange={e => setFormEquipo({...formEquipo, grupo: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none">
                  <option value="">Seleccionar Grupo...</option>
                  <option value="Grupo A Varones">Grupo A Varones</option>
                  <option value="Grupo B Varones">Grupo B Varones</option>
                  <option value="Damas">Damas</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalEquipo(false)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded font-medium transition-colors">Cancelar</button>
              <button onClick={registrarEquipo} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-bold transition-colors shadow-lg shadow-purple-900/20">Guardar Equipo</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: ADMINISTRAR JUGADORES (CRUD)     */}
      {/* ========================================= */}
      {modalJugador && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-lg border border-purple-900/50 shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Administrar Planteles</h2>
            
            <label className="block text-sm text-purple-400 mb-1 font-medium">1. Seleccionar Equipo:</label>
            <select 
              value={equipoSeleccionadoId} 
              onChange={e => setEquipoSeleccionadoId(e.target.value)} 
              className="w-full p-2.5 rounded bg-neutral-900 text-white border border-purple-900 focus:border-purple-500 outline-none mb-4"
            >
              <option value="">-- Elige un equipo --</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.grupo})</option>
              ))}
            </select>

            {equipoSeleccionadoId && (
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                <div className="bg-neutral-900/50 p-3 rounded border border-neutral-700">
                  <label className="block text-sm text-gray-400 mb-1">2. Inscribir nuevo jugador:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={nuevoNombreJugador} 
                      onChange={e => setNuevoNombreJugador(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && agregarJugador()}
                      placeholder="Nombre del jugador" 
                      className="flex-1 p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none"
                    />
                    <button onClick={agregarJugador} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold transition-colors">Agregar</button>
                  </div>
                </div>

                <div>
                  <h4 className="text-gray-300 font-bold mb-2">3. Nómina Actual:</h4>
                  <ul className="flex flex-col gap-2">
                    {jugadores.filter(j => j.equipoId === Number(equipoSeleccionadoId)).length === 0 && (
                      <li className="text-gray-500 text-sm">No hay jugadores inscritos en este equipo.</li>
                    )}
                    
                    {jugadores.filter(j => j.equipoId === Number(equipoSeleccionadoId)).map((jug, idx) => (
                      <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/80 rounded border border-neutral-700">
                        
                        {/* Modo Edición vs Modo Vista */}
                        {jugadorEditando === jug.id ? (
                          <input 
                            type="text" 
                            value={nombreEdicion} 
                            onChange={(e) => setNombreEdicion(e.target.value)}
                            className="p-1 rounded bg-neutral-800 text-white border border-purple-500 outline-none w-full mr-2 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-white font-medium text-sm"><span className="text-gray-500 mr-2">{idx + 1}.</span>{jug.nombre}</span>
                        )}

                        {/* Botones de Acción */}
                        <div className="flex gap-2 shrink-0">
                          {jugadorEditando === jug.id ? (
                            <button onClick={() => guardarEdicionJugador(jug.id)} className="text-green-400 hover:text-green-300 bg-neutral-800 px-2 py-1 rounded text-xs font-bold">Guardar</button>
                          ) : (
                            <button onClick={() => iniciarEdicionJugador(jug)} className="text-purple-400 hover:text-purple-300 bg-neutral-800 px-2 py-1 rounded text-xs">✏️</button>
                          )}
                          <button onClick={() => eliminarJugador(jug.id)} className="text-red-400 hover:text-red-300 bg-neutral-800 px-2 py-1 rounded text-xs">🗑️</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button onClick={() => {setModalJugador(false); setEquipoSeleccionadoId('');}} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded font-medium transition-colors mt-4">Cerrar Administrador</button>
          </div>
        </div>
      )}

    </main>
  );
}
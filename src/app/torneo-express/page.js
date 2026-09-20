"use client";
import { useState, useEffect } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx'; 

// Configuración de Firebase integrada directamente con tus credenciales
const firebaseConfig = {
  apiKey: "AIzaSyCyfuU05U_gEYQiIA15GcAWZM8uRyqXdjY",
  authDomain: "real-san-fabian.firebaseapp.com",
  databaseURL: "https://real-san-fabian-default-rtdb.firebaseio.com",
  projectId: "real-san-fabian",
  storageBucket: "real-san-fabian.firebasestorage.app",
  messagingSenderId: "29980827155",
  appId: "1:29980827155:web:d60492d5f0c63aa47de9e6"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default function TorneoExpressPage() {
  const [tabActiva, setTabActiva] = useState('posiciones');

  // --- ESTADOS DE LA BASE DE DATOS ---
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado para el botón de Carga Masiva
  const [procesandoExcel, setProcesandoExcel] = useState(false);

  // --- ESTADOS PARA LOS MODALES ---
  const [modalEquipo, setModalEquipo] = useState(false);
  const [modalJugador, setModalJugador] = useState(false);

  // Formularios
  const [formEquipo, setFormEquipo] = useState({ nombre: '', encargado: '', grupo: '' });
  
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState('');
  const [nuevoNombreJugador, setNuevoNombreJugador] = useState('');
  const [jugadorEditando, setJugadorEditando] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');

  // --- 1. CARGAR DATOS DESDE FIREBASE ---
  const cargarDatos = async () => {
    try {
      const eqSnap = await getDocs(collection(db, 'torneo_equipos'));
      setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const jugSnap = await getDocs(collection(db, 'torneo_jugadores'));
      setJugadores(jugSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const parSnap = await getDocs(collection(db, 'torneo_partidos'));
      setPartidos(parSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setCargando(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // FUNCIÓN MEJORADA: CARGA MASIVA EXCEL
  // ==========================================
 // ==========================================
  // FUNCIÓN ULTRA-INTELIGENTE: CARGA MASIVA EXCEL
  // ==========================================
  const procesarCargaMasiva = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcesandoExcel(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });

        // Normalizador para ignorar mayúsculas y espacios
        const normalizar = (str) => String(str).trim().toLowerCase();

        // 1. Buscar hojas inteligentemente
        const nombreHojaEquipos = wb.SheetNames.find(n => normalizar(n).includes("equipo"));
        const nombreHojaJugadores = wb.SheetNames.find(n => normalizar(n).includes("jugador"));

        if (!nombreHojaEquipos) throw new Error("No se encontró una pestaña que se llame 'Equipos'.");
        if (!nombreHojaJugadores) throw new Error("No se encontró una pestaña que se llame 'Jugadores'.");

        const dataEquipos = XLSX.utils.sheet_to_json(wb.Sheets[nombreHojaEquipos]);
        const dataJugadores = XLSX.utils.sheet_to_json(wb.Sheets[nombreHojaJugadores]);

        if (dataEquipos.length === 0) throw new Error("La pestaña de Equipos está vacía.");

        const mapaIDsFirebase = {}; 

        // Función para buscar columnas sin importar cómo se escribieron
        const buscarColumna = (obj, palabraClave) => {
          return Object.keys(obj).find(k => normalizar(k).includes(palabraClave));
        };

        // 2. Subir Equipos
        for (let eq of dataEquipos) {
          const colNombreEq = buscarColumna(eq, "nombre") || buscarColumna(eq, "equipo");
          const colDT = buscarColumna(eq, "encargado") || buscarColumna(eq, "dt");
          const colGrupo = buscarColumna(eq, "grupo") || buscarColumna(eq, "categor");

          if (!colNombreEq || !colGrupo) {
             throw new Error(`Faltan columnas en Equipos. Necesita 'Nombre Equipo' y 'Grupo'.`);
          }

          const nombreEquipoVal = String(eq[colNombreEq]).trim();
          if (!nombreEquipoVal) continue;

          const nuevoEquipo = {
            nombre: nombreEquipoVal,
            encargado: eq[colDT] ? String(eq[colDT]).trim() : "Sin DT",
            grupo: String(eq[colGrupo]).trim(),
            pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0
          };
          
          const docRef = await addDoc(collection(db, 'torneo_equipos'), nuevoEquipo);
          // Guardamos el nombre en minúsculas para compararlo fácil después
          mapaIDsFirebase[nombreEquipoVal.toLowerCase()] = docRef.id; 
        }

        // 3. Subir Jugadores
        for (let jug of dataJugadores) {
          const colNombreJug = buscarColumna(jug, "nombre") || buscarColumna(jug, "jugador");
          const colEqPert = buscarColumna(jug, "equipo") || buscarColumna(jug, "pertenec");

          if (!colNombreJug || !colEqPert || !jug[colNombreJug] || !jug[colEqPert]) continue; 
          
          const nombreEqEnExcel = String(jug[colEqPert]).trim().toLowerCase();
          const equipoIdReal = mapaIDsFirebase[nombreEqEnExcel]; 

          if (equipoIdReal) {
            const nuevoJugador = {
              nombre: String(jug[colNombreJug]).trim(),
              equipoId: equipoIdReal,
              goles: 0, amarillas: 0, rojas: 0
            };
            await addDoc(collection(db, 'torneo_jugadores'), nuevoJugador);
          } else {
             console.warn(`Jugador omitido: ${jug[colNombreJug]}. No se encontró el equipo "${jug[colEqPert]}"`);
          }
        }

        alert("✅ Carga Masiva completada con éxito. Actualizando tablas...");
        await cargarDatos(); 
      } catch (error) {
        console.error("Error leyendo Excel: ", error);
        alert("Error de Formato: " + error.message); 
      } finally {
        setProcesandoExcel(false);
        e.target.value = null; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- 2. FUNCIONES DE EQUIPOS ---
  const registrarEquipo = async () => {
    if (!formEquipo.nombre || !formEquipo.grupo || !formEquipo.encargado) {
      alert("Completa todos los campos del equipo");
      return;
    }
    const nuevoEquipo = { ...formEquipo, pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0 };
    
    try {
      const docRef = await addDoc(collection(db, 'torneo_equipos'), nuevoEquipo);
      setEquipos([...equipos, { id: docRef.id, ...nuevoEquipo }]);
      setFormEquipo({ nombre: '', encargado: '', grupo: '' });
      setModalEquipo(false);
    } catch (error) {
      console.error("Error al guardar equipo:", error);
      alert("Error al guardar el equipo en la nube.");
    }
  };

  const eliminarEquipo = async (idEquipo) => {
    if(window.confirm("🚨 ¿ESTÁS SEGURO? Eliminar este equipo borrará toda su estadística y a todos sus jugadores inscritos. Esta acción NO se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'torneo_equipos', idEquipo));
        
        const q = query(collection(db, 'torneo_jugadores'), where('equipoId', '==', idEquipo));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
           await deleteDoc(doc(db, 'torneo_jugadores', docSnap.id));
        });

        setEquipos(equipos.filter(eq => eq.id !== idEquipo));
        setJugadores(jugadores.filter(j => j.equipoId !== idEquipo));
      } catch (error) {
        console.error("Error al eliminar equipo:", error);
      }
    }
  };

  // --- 3. FUNCIONES DE JUGADORES (CRUD) ---
  const agregarJugador = async () => {
    if (!nuevoNombreJugador.trim() || !equipoSeleccionadoId) return;
    
    const nuevoJugador = {
      nombre: nuevoNombreJugador,
      equipoId: equipoSeleccionadoId,
      goles: 0, amarillas: 0, rojas: 0
    };

    try {
      const docRef = await addDoc(collection(db, 'torneo_jugadores'), nuevoJugador);
      setJugadores([...jugadores, { id: docRef.id, ...nuevoJugador }]);
      setNuevoNombreJugador('');
    } catch (error) {
      console.error("Error al guardar jugador:", error);
    }
  };

  const eliminarJugador = async (id) => {
    if(window.confirm("¿Eliminar este jugador del plantel?")) {
      try {
        await deleteDoc(doc(db, 'torneo_jugadores', id));
        setJugadores(jugadores.filter(j => j.id !== id));
      } catch (error) {
        console.error("Error al eliminar jugador:", error);
      }
    }
  };

  const iniciarEdicionJugador = (jugador) => {
    setJugadorEditando(jugador.id);
    setNombreEdicion(jugador.nombre);
  };

  const guardarEdicionJugador = async (id) => {
    try {
      await updateDoc(doc(db, 'torneo_jugadores', id), { nombre: nombreEdicion });
      setJugadores(jugadores.map(j => j.id === id ? { ...j, nombre: nombreEdicion } : j));
      setJugadorEditando(null);
    } catch (error) {
      console.error("Error al editar jugador:", error);
    }
  };

  // --- COMPONENTES VISUALES INTERNOS ---
  const RenderTabla = ({ titulo, grupoFiltro }) => {
    const equiposFiltrados = equipos.filter(eq => eq.grupo === grupoFiltro).sort((a, b) => b.pf - a.pf || b.dg - a.dg);

    return (
      <div className="mb-8 bg-neutral-800 p-4 rounded-lg border border-purple-900/50 relative shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-neutral-700 pb-2 flex justify-between items-center">
          {titulo}
        </h3>
        
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
                <th className="p-2 text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="11" className="p-6 text-purple-400 animate-pulse text-center">Cargando datos desde Firebase...</td></tr>
              ) : equiposFiltrados.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-gray-500 italic text-center">No hay equipos inscritos en este grupo aún.</td></tr>
              ) : (
                equiposFiltrados.map((eq, i) => (
                  <tr key={eq.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30 group">
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
                    <td className="p-2">
                       <button 
                         onClick={() => eliminarEquipo(eq.id)} 
                         className="text-red-500 hover:text-white hover:bg-red-600 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                         title="Eliminar Equipo"
                       >
                         🗑️
                       </button>
                    </td>
                  </tr>
                ))
              )}
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
        <button onClick={() => setTabActiva('estadisticas')} className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${tabActiva === 'estadisticas' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Estadísticas y Administrar</button>
      </div>

      {tabActiva === 'posiciones' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in">
          <RenderTabla titulo="Grupo A Varones" grupoFiltro="Grupo A Varones" />
          <RenderTabla titulo="Grupo B Varones" grupoFiltro="Grupo B Varones" />
          <RenderTabla titulo="Damas" grupoFiltro="Damas" />
        </div>
      )}

      {tabActiva === 'partidos' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in flex flex-col gap-6 items-center text-center mt-10">
          {cargando ? (
            <p className="text-purple-400 animate-pulse">Cargando partidos...</p>
          ) : partidos.length === 0 ? (
             <div className="text-gray-500 bg-neutral-800/50 p-10 rounded-lg border border-neutral-700 w-full shadow-lg">
               <span className="text-4xl mb-4 block">⚽</span>
               <p className="text-xl mb-2">No hay partidos en curso.</p>
               <p className="text-sm">Inscribe equipos primero y luego inicia los encuentros.</p>
             </div>
          ) : (
            partidos.map(partido => (
              <div key={partido.id}> {/* Lógica de marcadores futuros */} </div>
            ))
          )}
          <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded shadow-lg shadow-green-900/20 transition-colors">+ Iniciar Nuevo Partido</button>
        </div>
      )}

      {tabActiva === 'estadisticas' && (
        <div className="w-full max-w-5xl mx-auto animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">⚽ Tabla de Goleadores</h3>
            <ul className="flex flex-col gap-2">
              {cargando ? (
                <li className="text-purple-400 animate-pulse p-2">Cargando goleadores...</li>
              ) : jugadores.filter(j => j.goles > 0).length === 0 ? (
                <li className="text-gray-500 text-sm italic p-4 text-center bg-neutral-900/30 rounded">Aún no hay goles registrados en el torneo.</li>
              ) : (
                jugadores.filter(j => j.goles > 0).sort((a,b) => b.goles - a.goles).map((jug, index) => (
                  <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/50 rounded border border-neutral-800 hover:bg-neutral-800 transition-colors">
                    <div className="flex gap-3">
                      <span className="text-gray-500 font-bold w-4">{index + 1}.</span>
                      <span className="text-white font-medium">{jug.nombre}</span>
                    </div>
                    <span className="text-purple-400 font-bold">{jug.goles} Goles</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 shadow-lg flex flex-col gap-3">
             <h3 className="text-xl font-bold text-white mb-4">Administrar Torneo</h3>
             
             {/* BOTÓN DE CARGA MASIVA */}
             <div className="relative w-full">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={procesarCargaMasiva} 
                  disabled={procesandoExcel}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait" 
                  title="Subir archivo Excel"
                />
                <button disabled={procesandoExcel} className="w-full bg-green-900/40 hover:bg-green-600 text-green-300 hover:text-white p-3 rounded font-medium text-left border border-green-700 flex justify-between transition-colors shadow-lg disabled:opacity-50">
                  {procesandoExcel ? '⏳ Procesando Excel y subiendo a Firebase...' : '📂 Importar Equipos/Jugadores (Excel) →'}
                </button>
             </div>

             <div className="w-full h-px bg-neutral-700 my-2"></div> {/* Separador */}

             <button onClick={() => setModalEquipo(true)} className="w-full bg-purple-900/40 hover:bg-purple-600 text-purple-200 hover:text-white p-3 rounded font-medium text-left border border-purple-700 flex justify-between transition-colors shadow-lg">
               ➕ Inscribir Equipo Manual <span className="text-purple-400 hover:text-white">→</span>
             </button>
             <button onClick={() => setModalJugador(true)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white p-3 rounded font-medium text-left border border-neutral-600 flex justify-between transition-colors shadow-lg">
               👤 Administrar Planteles <span className="text-gray-400">→</span>
             </button>
             <p className="text-xs text-gray-500 mt-4 text-center bg-neutral-900/50 p-3 rounded">Para borrar un equipo completo, ve a "Tablas de Posiciones" y usa el ícono de papelera al final de la fila.</p>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 1: INSCRIBIR EQUIPO NUEVO           */}
      {/* ========================================= */}
      {modalEquipo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-md border border-purple-900/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Inscribir Equipo</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del Equipo</label>
                <input type="text" value={formEquipo.nombre} onChange={e => setFormEquipo({...formEquipo, nombre: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" placeholder="Ej. Los Titanes"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del Encargado / DT</label>
                <input type="text" value={formEquipo.encargado} onChange={e => setFormEquipo({...formEquipo, encargado: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría / Grupo</label>
                <select value={formEquipo.grupo} onChange={e => setFormEquipo({...formEquipo, grupo: e.target.value})} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-lg border border-purple-900/50 shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Administrar Planteles</h2>
            
            <label className="block text-sm text-purple-400 mb-1 font-medium">1. Seleccionar Equipo:</label>
            <select 
              value={equipoSeleccionadoId} 
              onChange={e => setEquipoSeleccionadoId(e.target.value)} 
              className="w-full p-2.5 rounded bg-neutral-900 text-white border border-purple-900 focus:border-purple-500 outline-none mb-4 transition-colors"
            >
              <option value="">-- Elige un equipo --</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.grupo})</option>
              ))}
            </select>

            {equipoSeleccionadoId && (
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                <div className="bg-neutral-900/50 p-3 rounded border border-neutral-700 shadow-inner">
                  <label className="block text-sm text-gray-400 mb-1">2. Inscribir nuevo jugador:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={nuevoNombreJugador} 
                      onChange={e => setNuevoNombreJugador(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && agregarJugador()}
                      placeholder="Nombre del jugador" 
                      className="flex-1 p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors"
                    />
                    <button onClick={agregarJugador} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold transition-colors shadow-lg">Agregar</button>
                  </div>
                </div>

                <div>
                  <h4 className="text-gray-300 font-bold mb-2">3. Nómina Actual:</h4>
                  <ul className="flex flex-col gap-2">
                    {jugadores.filter(j => j.equipoId === equipoSeleccionadoId).length === 0 && (
                      <li className="text-gray-500 text-sm italic p-4 text-center bg-neutral-900/30 rounded border border-dashed border-neutral-700">Plantel vacío. Inscribe jugadores arriba.</li>
                    )}
                    
                    {jugadores.filter(j => j.equipoId === equipoSeleccionadoId).map((jug, idx) => (
                      <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/80 rounded border border-neutral-700 hover:border-neutral-600 transition-colors">
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

                        <div className="flex gap-2 shrink-0">
                          {jugadorEditando === jug.id ? (
                            <button onClick={() => guardarEdicionJugador(jug.id)} className="text-green-400 hover:text-green-300 bg-neutral-800 px-2 py-1 rounded text-xs font-bold border border-green-900 transition-colors">Guardar</button>
                          ) : (
                            <button onClick={() => iniciarEdicionJugador(jug)} className="text-purple-400 hover:text-purple-300 bg-neutral-800 px-2 py-1 rounded text-xs border border-purple-900 transition-colors">✏️</button>
                          )}
                          <button onClick={() => eliminarJugador(jug.id)} className="text-red-400 hover:text-red-300 bg-neutral-800 px-2 py-1 rounded text-xs border border-red-900 transition-colors">🗑️</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button onClick={() => {setModalJugador(false); setEquipoSeleccionadoId('');}} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded font-medium transition-colors mt-4 shadow-lg">Cerrar Administrador</button>
          </div>
        </div>
      )}

    </main>
  );
}
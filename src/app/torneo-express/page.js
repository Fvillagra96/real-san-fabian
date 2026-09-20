"use client";
import { useState, useEffect } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx'; 

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
const normalizar = (str) => String(str).trim().toLowerCase();

export default function TorneoExpressPage() {
  const [tabActiva, setTabActiva] = useState('partidos');

  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [procesandoExcel, setProcesandoExcel] = useState(false);
  const [modalEquipo, setModalEquipo] = useState(false);
  const [modalJugador, setModalJugador] = useState(false);
  
  const [partidoActivo, setPartidoActivo] = useState(null);
  const [statsPartido, setStatsPartido] = useState({});

  const [formEquipo, setFormEquipo] = useState({ nombre: '', encargado: '', grupo: '' });
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState('');
  const [nuevoNombreJugador, setNuevoNombreJugador] = useState('');
  const [jugadorEditando, setJugadorEditando] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');

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
      console.error("Error al cargar:", error);
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // CARGA MASIVA EXCEL
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

        const nombreHojaEquipos = wb.SheetNames.find(n => normalizar(n).includes("equipo"));
        const nombreHojaJugadores = wb.SheetNames.find(n => normalizar(n).includes("jugador"));
        const nombreHojaPartidos = wb.SheetNames.find(n => normalizar(n).includes("partido"));

        if (!nombreHojaEquipos || !nombreHojaJugadores) throw new Error("Faltan pestañas de Equipos o Jugadores.");

        const dataEquipos = XLSX.utils.sheet_to_json(wb.Sheets[nombreHojaEquipos]);
        const dataJugadores = XLSX.utils.sheet_to_json(wb.Sheets[nombreHojaJugadores]);
        const dataPartidos = nombreHojaPartidos ? XLSX.utils.sheet_to_json(wb.Sheets[nombreHojaPartidos]) : [];

        const mapaIDsFirebase = {}; 
        const buscarColumna = (obj, palabraClave) => Object.keys(obj).find(k => normalizar(k).includes(palabraClave));

        for (let eq of dataEquipos) {
          const colNombreEq = buscarColumna(eq, "nombre") || buscarColumna(eq, "equipo");
          const colDT = buscarColumna(eq, "encargado") || buscarColumna(eq, "dt");
          const colGrupo = buscarColumna(eq, "grupo") || buscarColumna(eq, "categor");
          if (!colNombreEq || !colGrupo) continue;
          
          const nomEq = String(eq[colNombreEq]).trim();
          const docRef = await addDoc(collection(db, 'torneo_equipos'), {
            nombre: nomEq, encargado: eq[colDT] ? String(eq[colDT]).trim() : "Sin DT", grupo: String(eq[colGrupo]).trim(),
            pj: 0, fa: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pf: 0
          });
          mapaIDsFirebase[nomEq.toLowerCase()] = docRef.id; 
        }

        for (let jug of dataJugadores) {
          const colNombreJug = buscarColumna(jug, "nombre") || buscarColumna(jug, "jugador");
          const colEqPert = buscarColumna(jug, "equipo") || buscarColumna(jug, "pertenec");
          if (!colNombreJug || !colEqPert || !jug[colNombreJug] || !jug[colEqPert]) continue; 
          
          const eqID = mapaIDsFirebase[String(jug[colEqPert]).trim().toLowerCase()]; 
          if (eqID) {
            await addDoc(collection(db, 'torneo_jugadores'), {
              nombre: String(jug[colNombreJug]).trim(), equipoId: eqID, goles: 0, amarillas: 0, rojas: 0, golesEnContra: 0
            });
          }
        }

        if (dataPartidos.length > 0) {
          for (let p of dataPartidos) {
             const colLocal = buscarColumna(p, "local");
             const colVisita = buscarColumna(p, "visita");
             const colGrupoP = buscarColumna(p, "grupo");
             if(colLocal && colVisita && p[colLocal] && p[colVisita]) {
                await addDoc(collection(db, 'torneo_partidos'), {
                  local: String(p[colLocal]).trim(), visita: String(p[colVisita]).trim(),
                  grupo: colGrupoP ? String(p[colGrupoP]).trim() : "Fase de Grupos",
                  golesLocal: 0, golesVisita: 0, estado: "Pendiente"
                });
             }
          }
        }
        alert("✅ Carga Masiva completada.");
        await cargarDatos(); 
      } catch (error) { alert("Error: " + error.message); } finally { setProcesandoExcel(false); e.target.value = null; }
    };
    reader.readAsArrayBuffer(file);
  };

  // ==========================================
  // LÓGICA DE PARTIDO EN VIVO
  // ==========================================
  const abrirPartido = (partido) => {
    if (partido.estado === 'Finalizado') {
      alert("Este partido ya finalizó y sus puntos fueron sumados a la tabla.");
      return;
    }
    setPartidoActivo(partido);
    
    const eqLoc = equipos.find(e => normalizar(e.nombre) === normalizar(partido.local));
    const eqVis = equipos.find(e => normalizar(e.nombre) === normalizar(partido.visita));
    const statsIniciales = {};
    
    jugadores.forEach(j => {
      if ((eqLoc && j.equipoId === eqLoc.id) || (eqVis && j.equipoId === eqVis.id)) {
        statsIniciales[j.id] = { goles: 0, amarillas: 0, rojas: 0, arquero: false };
      }
    });
    setStatsPartido(statsIniciales);
  };

  const modificarStat = (jugadorId, tipo, operacion) => {
    setStatsPartido(prev => {
      const actual = prev[jugadorId];
      let nuevoValor = actual[tipo];
      
      if (tipo === 'arquero') nuevoValor = !actual.arquero;
      else if (operacion === 'sumar') nuevoValor++;
      else if (operacion === 'restar' && nuevoValor > 0) nuevoValor--;

      return { ...prev, [jugadorId]: { ...actual, [tipo]: nuevoValor } };
    });
  };

  const finalizarPartido = async () => {
    if (!window.confirm("¿Seguro que deseas finalizar el encuentro? Esto actualizará las tablas de posiciones automáticamente.")) return;

    const eqLoc = equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.local));
    const eqVis = equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.visita));

    if (!eqLoc || !eqVis) {
      alert("Error: No se encontraron los equipos en la base de datos.");
      return;
    }

    let golesLoc = 0;
    let golesVis = 0;
    let arqueroLocId = null;
    let arqueroVisId = null;

    Object.keys(statsPartido).forEach(jId => {
      const jStats = statsPartido[jId];
      const jugador = jugadores.find(j => j.id === jId);
      if (jugador) {
        if (jugador.equipoId === eqLoc.id) {
          golesLoc += jStats.goles;
          if (jStats.arquero) arqueroLocId = jId;
        } else if (jugador.equipoId === eqVis.id) {
          golesVis += jStats.goles;
          if (jStats.arquero) arqueroVisId = jId;
        }
      }
    });

    try {
      const updatesJugadores = Object.keys(statsPartido).map(async (jId) => {
        const jStats = statsPartido[jId];
        const jugadorGlobal = jugadores.find(j => j.id === jId);
        if (!jugadorGlobal) return;

        let golesContraRecibidos = 0;
        if (jId === arqueroLocId) golesContraRecibidos = golesVis;
        if (jId === arqueroVisId) golesContraRecibidos = golesLoc;

        if (jStats.goles > 0 || jStats.amarillas > 0 || jStats.rojas > 0 || golesContraRecibidos > 0) {
          await updateDoc(doc(db, 'torneo_jugadores', jId), {
            goles: (jugadorGlobal.goles || 0) + jStats.goles,
            amarillas: (jugadorGlobal.amarillas || 0) + jStats.amarillas,
            rojas: (jugadorGlobal.rojas || 0) + jStats.rojas,
            golesEnContra: (jugadorGlobal.golesEnContra || 0) + golesContraRecibidos
          });
        }
      });
      await Promise.all(updatesJugadores);

      const actualizarEquipo = async (eq, gf, gc) => {
        let pts = 0, pg = 0, pe = 0, pp = 0;
        if (gf > gc) { pts = 3; pg = 1; }
        else if (gf === gc) { pts = 1; pe = 1; }
        else { pp = 1; }
        
        await updateDoc(doc(db, 'torneo_equipos', eq.id), {
            pj: (eq.pj || 0) + 1,
            gf: (eq.gf || 0) + gf,
            gc: (eq.gc || 0) + gc,
            dg: ((eq.gf || 0) + gf) - ((eq.gc || 0) + gc),
            pg: (eq.pg || 0) + pg,
            pe: (eq.pe || 0) + pe,
            pp: (eq.pp || 0) + pp,
            pf: (eq.pf || 0) + pts
        });
      };
      await actualizarEquipo(eqLoc, golesLoc, golesVis);
      await actualizarEquipo(eqVis, golesVis, golesLoc);

      await updateDoc(doc(db, 'torneo_partidos', partidoActivo.id), {
        estado: 'Finalizado',
        golesLocal: golesLoc,
        golesVisita: golesVis
      });

      alert("⚽ ¡Partido Finalizado y tablas actualizadas!");
      setPartidoActivo(null);
      await cargarDatos();

    } catch (error) {
      console.error("Error al finalizar partido:", error);
      alert("Hubo un error guardando los datos.");
    }
  };

  // --- CRUD NORMAL ---
  const registrarEquipo = async () => { /* igual */ };
  const eliminarEquipo = async (idEquipo) => {
    if(window.confirm("🚨 ¿ESTÁS SEGURO? Se borrará todo.")) {
      try {
        await deleteDoc(doc(db, 'torneo_equipos', idEquipo));
        const q = query(collection(db, 'torneo_jugadores'), where('equipoId', '==', idEquipo));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => await deleteDoc(doc(db, 'torneo_jugadores', docSnap.id)));
        setEquipos(equipos.filter(eq => eq.id !== idEquipo));
        setJugadores(jugadores.filter(j => j.equipoId !== idEquipo));
      } catch (error) { console.error(error); }
    }
  };
  const agregarJugador = async () => { 
    if (!nuevoNombreJugador.trim() || !equipoSeleccionadoId) return;
    try {
      const docRef = await addDoc(collection(db, 'torneo_jugadores'), { nombre: nuevoNombreJugador, equipoId: equipoSeleccionadoId, goles: 0, amarillas: 0, rojas: 0, golesEnContra: 0 });
      setJugadores([...jugadores, { id: docRef.id, nombre: nuevoNombreJugador, equipoId: equipoSeleccionadoId, goles: 0, amarillas: 0, rojas: 0, golesEnContra: 0 }]);
      setNuevoNombreJugador('');
    } catch (error) { console.error(error); }
  };
  const eliminarJugador = async (id) => {
    if(window.confirm("¿Eliminar jugador?")) { await deleteDoc(doc(db, 'torneo_jugadores', id)); setJugadores(jugadores.filter(j => j.id !== id)); }
  };
  const guardarEdicionJugador = async (id) => {
    await updateDoc(doc(db, 'torneo_jugadores', id), { nombre: nombreEdicion });
    setJugadores(jugadores.map(j => j.id === id ? { ...j, nombre: nombreEdicion } : j));
    setJugadorEditando(null);
  };

  // ==========================================
  // COMPONENTES DE VISTA
  // ==========================================
  const RenderTabla = ({ titulo, grupoFiltro }) => {
    const equiposFiltrados = equipos.filter(eq => eq.grupo === grupoFiltro).sort((a, b) => b.pf - a.pf || b.dg - a.dg);
    return (
      <div className="mb-6 bg-neutral-800 p-3 md:p-5 rounded-lg border border-purple-900/50 shadow-lg overflow-hidden">
        <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 border-b border-neutral-700 pb-2">{titulo}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs md:text-sm text-gray-300 min-w-max">
            <thead className="bg-neutral-900/50 text-purple-400">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-neutral-900 md:bg-transparent z-10 md:z-0 min-w-[120px]">Equipo</th>
                <th className="p-2">PJ</th><th className="p-2 hidden md:table-cell">PG</th><th className="p-2 hidden md:table-cell">PE</th><th className="p-2 hidden md:table-cell">PP</th>
                <th className="p-2">GF</th><th className="p-2">GC</th><th className="p-2">DG</th><th className="p-2 text-white font-bold bg-purple-900/20">PF</th>
                <th className="p-2 text-gray-500 hidden md:table-cell">Del</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? <tr><td colSpan="10" className="p-6 text-purple-400 animate-pulse text-center">Cargando...</td></tr> : 
               equiposFiltrados.length === 0 ? <tr><td colSpan="10" className="p-6 text-gray-500 italic text-center">Sin equipos.</td></tr> : 
               equiposFiltrados.map((eq, i) => (
                <tr key={eq.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30 group">
                  <td className="p-2 text-left font-medium text-white sticky left-0 bg-neutral-800 group-hover:bg-neutral-700/80 z-10 md:z-0">
                    {i + 1}. {eq.nombre}
                    <span className="block text-[9px] md:text-[10px] text-gray-500 font-normal">DT: {eq.encargado}</span>
                  </td>
                  <td className="p-2">{eq.pj}</td><td className="p-2 text-green-400 hidden md:table-cell">{eq.pg}</td><td className="p-2 text-gray-400 hidden md:table-cell">{eq.pe}</td>
                  <td className="p-2 text-red-400 hidden md:table-cell">{eq.pp}</td><td className="p-2">{eq.gf}</td><td className="p-2">{eq.gc}</td>
                  <td className="p-2">{eq.dg}</td><td className="p-2 font-bold text-white bg-purple-900/20">{eq.pf}</td>
                  <td className="p-2 hidden md:table-cell"><button onClick={() => eliminarEquipo(eq.id)} className="text-red-500 hover:text-white hover:bg-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-colors">🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RenderFaseFinal = () => {
    const topVaronesA = equipos.filter(e => e.grupo === 'Grupo A Varones').sort((a,b) => b.pf - a.pf || b.dg - a.dg).slice(0, 2);
    const topVaronesB = equipos.filter(e => e.grupo === 'Grupo B Varones').sort((a,b) => b.pf - a.pf || b.dg - a.dg).slice(0, 2);
    const topDamas = equipos.filter(e => e.grupo === 'Damas').sort((a,b) => b.pf - a.pf || b.dg - a.dg).slice(0, 2);

    return (
      <div className="mt-8 md:mt-12 bg-neutral-900/80 p-4 md:p-6 rounded-xl border-2 border-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
        <h2 className="text-xl md:text-2xl font-black text-center text-purple-400 mb-6 uppercase tracking-widest">🏆 PlayOffs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-neutral-800 border border-neutral-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-base md:text-lg font-bold text-white text-center mb-4 border-b border-neutral-600 pb-2">Semifinales Varones</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center bg-neutral-900 p-2 md:p-3 rounded shadow-inner border border-neutral-700 text-sm md:text-base">
                <span className="font-bold text-white text-right flex-1 truncate px-1 md:px-2">{topVaronesA[0]?.nombre || "1º Grupo A"}</span>
                <span className="bg-purple-600 text-white text-[10px] md:text-xs font-black px-2 py-1 rounded-full shrink-0 mx-1">VS</span>
                <span className="font-bold text-white text-left flex-1 truncate px-1 md:px-2">{topVaronesB[1]?.nombre || "2º Grupo B"}</span>
              </div>
              <div className="flex justify-between items-center bg-neutral-900 p-2 md:p-3 rounded shadow-inner border border-neutral-700 text-sm md:text-base">
                <span className="font-bold text-white text-right flex-1 truncate px-1 md:px-2">{topVaronesB[0]?.nombre || "1º Grupo B"}</span>
                <span className="bg-purple-600 text-white text-[10px] md:text-xs font-black px-2 py-1 rounded-full shrink-0 mx-1">VS</span>
                <span className="font-bold text-white text-left flex-1 truncate px-1 md:px-2">{topVaronesA[1]?.nombre || "2º Grupo A"}</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 border border-neutral-700 p-3 md:p-4 rounded-lg flex flex-col justify-center">
            <h3 className="text-base md:text-lg font-bold text-white text-center mb-4 border-b border-neutral-600 pb-2">Gran Final Damas</h3>
            <div className="flex justify-between items-center bg-neutral-900 p-3 md:p-4 rounded shadow-inner border-2 border-amber-500/50 text-sm md:text-lg">
                <span className="font-bold text-amber-500 text-right flex-1 truncate px-1 md:px-2">{topDamas[0]?.nombre || "1º Damas"}</span>
                <span className="bg-amber-500 text-black text-[10px] md:text-xs font-black px-2 py-1 rounded-full shrink-0 mx-1">VS</span>
                <span className="font-bold text-amber-500 text-left flex-1 truncate px-1 md:px-2">{topDamas[1]?.nombre || "2º Damas"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col p-2 md:p-8 relative max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-purple-500 mb-4 md:mb-6 text-center mt-2 md:mt-0">Torneo Express ⚡</h1>

      {/* Tabs Responsivos */}
      <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 border-b border-neutral-700 pb-2 overflow-x-auto hide-scrollbar px-1">
        <button onClick={() => setTabActiva('posiciones')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'posiciones' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Tablas</button>
        <button onClick={() => setTabActiva('partidos')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'partidos' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Marcador</button>
        <button onClick={() => setTabActiva('estadisticas')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'estadisticas' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Admin</button>
      </div>

      {tabActiva === 'posiciones' && (
        <div className="w-full animate-fade-in pb-10">
          <RenderTabla titulo="Grupo A Varones" grupoFiltro="Grupo A Varones" />
          <RenderTabla titulo="Grupo B Varones" grupoFiltro="Grupo B Varones" />
          <RenderTabla titulo="Damas" grupoFiltro="Damas" />
          <RenderFaseFinal />
        </div>
      )}

      {tabActiva === 'partidos' && (
        <div className="w-full animate-fade-in flex flex-col gap-4 items-center text-center mt-4 md:mt-10">
          {cargando ? <p className="text-purple-400 animate-pulse">Cargando partidos...</p> : partidos.length === 0 ? (
             <div className="text-gray-500 bg-neutral-800/50 p-6 md:p-10 rounded-lg border border-neutral-700 w-full shadow-lg"><span className="text-4xl mb-4 block">⚽</span><p className="text-lg md:text-xl mb-2">No hay partidos programados.</p></div>
          ) : ( 
            partidos.map(partido => (
              <div 
                key={partido.id} 
                onClick={() => abrirPartido(partido)}
                className={`w-full p-4 md:p-6 rounded-lg border shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 transition-transform cursor-pointer ${partido.estado === 'Finalizado' ? 'bg-neutral-900 border-neutral-700 opacity-60' : 'bg-neutral-800 border-purple-500 active:scale-95 md:hover:scale-[1.01]'}`}
              >
                {/* Diseño Móvil: Equipos enfrentados, estado abajo */}
                <div className="flex w-full justify-between items-center md:hidden">
                  <div className="flex flex-col items-center flex-1 w-1/3">
                    <span className="text-sm font-bold text-white mb-1 truncate w-full px-1">{partido.local}</span>
                    <span className="text-3xl font-black text-white">{partido.golesLocal}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center shrink-0 w-1/4">
                    <span className="text-neutral-500 text-xs font-black">VS</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 w-1/3">
                    <span className="text-sm font-bold text-white mb-1 truncate w-full px-1">{partido.visita}</span>
                    <span className="text-3xl font-black text-white">{partido.golesVisita}</span>
                  </div>
                </div>
                
                {/* Diseño Móvil: Estado */}
                <div className="flex flex-col items-center justify-center w-full md:hidden mt-2 border-t border-neutral-700 pt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${partido.estado === 'Finalizado' ? 'bg-neutral-700 text-gray-400 border-neutral-600' : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'}`}>
                    {partido.estado}
                  </span>
                  <span className="text-gray-500 text-[10px] mt-1">{partido.grupo}</span>
                </div>

                {/* Diseño Desktop original */}
                <div className="hidden md:flex flex-col items-center flex-1">
                  <span className="text-xl font-bold text-white mb-2">{partido.local}</span>
                  <span className="text-4xl font-black text-white w-12 text-center">{partido.golesLocal}</span>
                </div>
                <div className="hidden md:flex flex-col items-center justify-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${partido.estado === 'Finalizado' ? 'bg-neutral-700 text-gray-400 border-neutral-600' : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'}`}>
                    {partido.estado}
                  </span>
                  <span className="text-gray-500 text-sm">{partido.grupo}</span>
                  {partido.estado !== 'Finalizado' && <span className="text-purple-400 text-xs mt-2 underline">Toca para administrar partido</span>}
                </div>
                <div className="hidden md:flex flex-col items-center flex-1">
                  <span className="text-xl font-bold text-white mb-2">{partido.visita}</span>
                  <span className="text-4xl font-black text-white w-12 text-center">{partido.golesVisita}</span>
                </div>
              </div>
            )) 
          )}
        </div>
      )}

      {tabActiva === 'estadisticas' && (
        <div className="w-full animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pb-10">
          
          <div className="bg-neutral-800 p-4 md:p-6 rounded-lg border border-neutral-700 shadow-lg">
            <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">⚽ Top Goleadores</h3>
            <ul className="flex flex-col gap-2">
              {cargando ? <li className="text-purple-400">Cargando...</li> : jugadores.filter(j => j.goles > 0).length === 0 ? <li className="text-gray-500 text-sm italic">Sin goles registrados.</li> : jugadores.filter(j => j.goles > 0).sort((a,b) => b.goles - a.goles).slice(0,10).map((jug, index) => <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/50 rounded border border-neutral-800 text-sm md:text-base"><div className="flex gap-2 md:gap-3"><span className="text-gray-500 font-bold">{index + 1}.</span><span className="text-white">{jug.nombre}</span></div><span className="text-purple-400 font-bold">{jug.goles} ⚽</span></li>)}
            </ul>
          </div>

          <div className="bg-neutral-800 p-4 md:p-6 rounded-lg border border-neutral-700 shadow-lg">
            <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">🧤 Arqueros Menos Batidos</h3>
            <ul className="flex flex-col gap-2">
              {cargando ? <li className="text-purple-400">Cargando...</li> : jugadores.filter(j => j.golesEnContra !== undefined && j.golesEnContra >= 0 && equipos.some(e=>e.id===j.equipoId && e.pj > 0)).sort((a,b) => (a.golesEnContra || 0) - (b.golesEnContra || 0)).slice(0,5).map((jug, index) => <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/50 rounded border border-neutral-800 text-sm md:text-base"><div className="flex gap-2 md:gap-3"><span className="text-gray-500 font-bold">{index + 1}.</span><span className="text-white">{jug.nombre}</span></div><span className="text-amber-500 font-bold">{jug.golesEnContra || 0} GC</span></li>)}
            </ul>
          </div>

          <div className="bg-neutral-800 p-4 md:p-6 rounded-lg border border-neutral-700 shadow-lg flex flex-col gap-3 md:col-span-2">
             <h3 className="text-lg md:text-xl font-bold text-white mb-2">Administrar Torneo</h3>
             <div className="relative w-full">
                <input type="file" accept=".xlsx, .xls" onChange={procesarCargaMasiva} disabled={procesandoExcel} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait" />
                <button disabled={procesandoExcel} className="w-full bg-green-900/40 hover:bg-green-600 text-green-300 hover:text-white p-3 rounded font-medium text-left border border-green-700 flex justify-between transition-colors shadow-lg disabled:opacity-50 text-sm md:text-base">
                  {procesandoExcel ? '⏳ Procesando...' : '📂 Importar Excel Masivo →'}
                </button>
             </div>
             <button onClick={() => setModalJugador(true)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white p-3 rounded font-medium text-left border border-neutral-600 flex justify-between transition-colors shadow-lg text-sm md:text-base">👤 Administrar Planteles Manual <span className="text-gray-400">→</span></button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL: MESA DE CONTROL DE PARTIDO EN VIVO */}
      {/* ========================================= */}
      {partidoActivo && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-0 md:p-6 animate-fade-in">
          {/* 
              CAMBIO CLAVE AQUÍ:
              En pantallas grandes es una ventana (max-w-5xl, max-h-[90vh], rounded).
              En celulares es PANTALLA COMPLETA (w-full h-full rounded-none).
          */}
          <div className="bg-neutral-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-xl md:border-2 md:border-purple-500 flex flex-col relative">
            
            {/* Cabecera del Partido Fija arriba */}
            <div className="flex justify-between items-center bg-black p-3 md:p-4 border-b border-neutral-800 shrink-0 shadow-lg z-10 pt-safe-top">
               <h2 className="text-sm md:text-2xl font-black text-white w-[35%] text-left truncate px-2">{partidoActivo.local}</h2>
               <div className="flex flex-col items-center w-[30%]">
                 <span className="text-[9px] md:text-xs text-purple-400 font-bold tracking-widest uppercase mb-1">En Vivo</span>
                 <span className="text-2xl md:text-5xl font-black text-white">
                   {Object.values(statsPartido).reduce((sum, st) => {
                     const j = jugadores.find(ju => ju.id === Object.keys(statsPartido).find(key => statsPartido[key] === st));
                     const eqLoc = equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.local));
                     return (j && eqLoc && j.equipoId === eqLoc.id) ? sum + st.goles : sum;
                   }, 0)}
                   <span className="mx-2 text-neutral-600">-</span>
                   {Object.values(statsPartido).reduce((sum, st) => {
                     const j = jugadores.find(ju => ju.id === Object.keys(statsPartido).find(key => statsPartido[key] === st));
                     const eqVis = equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.visita));
                     return (j && eqVis && j.equipoId === eqVis.id) ? sum + st.goles : sum;
                   }, 0)}
                 </span>
               </div>
               <h2 className="text-sm md:text-2xl font-black text-white w-[35%] text-right truncate px-2">{partidoActivo.visita}</h2>
            </div>

            {/* Listado de Planteles (Área con scroll interno) */}
            {/* CAMBIO CLAVE AQUÍ: Se asegura que el contenedor tome el espacio sobrante (flex-1) y tenga scroll automático (overflow-y-auto) */}
            <div className="flex flex-col md:flex-row gap-0 md:gap-6 flex-1 overflow-y-auto p-2 md:p-6">
              
              {/* Plantel Local */}
              <div className="flex-1 md:bg-neutral-800 md:p-4 rounded-lg md:border md:border-neutral-700 mb-6 md:mb-0">
                <h3 className="text-sm md:text-lg font-bold text-gray-400 mb-2 md:mb-4 px-2 uppercase tracking-wide">🔵 {partidoActivo.local}</h3>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  {jugadores.filter(j => equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.local))?.id === j.equipoId).map(jug => (
                    <div key={jug.id} className={`flex flex-col justify-center p-2 md:p-3 rounded border transition-colors shadow-sm ${statsPartido[jug.id]?.arquero ? 'bg-amber-900/30 border-amber-500/50' : 'bg-neutral-800 border-neutral-700'}`}>
                      <span className="text-white text-sm md:text-base font-medium truncate mb-1.5 px-1">{jug.nombre}</span>
                      
                      <div className="flex gap-1 bg-black p-1 md:p-1.5 rounded w-full justify-between overflow-x-auto hide-scrollbar">
                        <button onClick={() => modificarStat(jug.id, 'arquero')} className={`px-2 md:px-3 py-1 rounded text-sm md:text-lg transition-colors flex items-center justify-center min-w-[36px] ${statsPartido[jug.id]?.arquero ? 'bg-amber-500 text-black' : 'bg-neutral-800 grayscale opacity-40 hover:opacity-100'}`}>🧤</button>
                        
                        <div className="flex items-center bg-neutral-800 rounded px-1 min-w-[70px] justify-between border border-neutral-700">
                          <button onClick={() => modificarStat(jug.id, 'goles', 'restar')} className="px-2 py-1 text-gray-400 active:bg-neutral-700 rounded-l">-</button>
                          <span className="font-bold text-white text-xs md:text-sm">{statsPartido[jug.id]?.goles || 0}⚽</span>
                          <button onClick={() => modificarStat(jug.id, 'goles', 'sumar')} className="px-2 py-1 text-gray-400 active:bg-neutral-700 rounded-r">+</button>
                        </div>
                        
                        <button onClick={() => modificarStat(jug.id, 'amarillas', 'sumar')} className="px-2 py-1 bg-neutral-800 active:bg-neutral-700 rounded flex items-center gap-1 border border-neutral-700 min-w-[40px] justify-center">
                          <span className="text-yellow-400 text-xs md:text-sm">🟨</span><span className="text-white text-xs md:text-sm font-bold">{statsPartido[jug.id]?.amarillas || 0}</span>
                        </button>
                        
                        <button onClick={() => modificarStat(jug.id, 'rojas', 'sumar')} className="px-2 py-1 bg-neutral-800 active:bg-neutral-700 rounded flex items-center gap-1 border border-neutral-700 min-w-[40px] justify-center">
                          <span className="text-red-500 text-xs md:text-sm">🟥</span><span className="text-white text-xs md:text-sm font-bold">{statsPartido[jug.id]?.rojas || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divisor Móvil */}
              <div className="w-full h-px bg-neutral-800 my-2 md:hidden"></div>

              {/* Plantel Visita */}
              <div className="flex-1 md:bg-neutral-800 md:p-4 rounded-lg md:border md:border-neutral-700">
                <h3 className="text-sm md:text-lg font-bold text-gray-400 mb-2 md:mb-4 px-2 uppercase tracking-wide">🔴 {partidoActivo.visita}</h3>
                <div className="flex flex-col gap-1.5 md:gap-2">
                  {jugadores.filter(j => equipos.find(e => normalizar(e.nombre) === normalizar(partidoActivo.visita))?.id === j.equipoId).map(jug => (
                    <div key={jug.id} className={`flex flex-col justify-center p-2 md:p-3 rounded border transition-colors shadow-sm ${statsPartido[jug.id]?.arquero ? 'bg-amber-900/30 border-amber-500/50' : 'bg-neutral-800 border-neutral-700'}`}>
                      <span className="text-white text-sm md:text-base font-medium truncate mb-1.5 px-1">{jug.nombre}</span>
                      
                      <div className="flex gap-1 bg-black p-1 md:p-1.5 rounded w-full justify-between overflow-x-auto hide-scrollbar">
                        <button onClick={() => modificarStat(jug.id, 'arquero')} className={`px-2 md:px-3 py-1 rounded text-sm md:text-lg transition-colors flex items-center justify-center min-w-[36px] ${statsPartido[jug.id]?.arquero ? 'bg-amber-500 text-black' : 'bg-neutral-800 grayscale opacity-40 hover:opacity-100'}`}>🧤</button>
                        
                        <div className="flex items-center bg-neutral-800 rounded px-1 min-w-[70px] justify-between border border-neutral-700">
                          <button onClick={() => modificarStat(jug.id, 'goles', 'restar')} className="px-2 py-1 text-gray-400 active:bg-neutral-700 rounded-l">-</button>
                          <span className="font-bold text-white text-xs md:text-sm">{statsPartido[jug.id]?.goles || 0}⚽</span>
                          <button onClick={() => modificarStat(jug.id, 'goles', 'sumar')} className="px-2 py-1 text-gray-400 active:bg-neutral-700 rounded-r">+</button>
                        </div>
                        
                        <button onClick={() => modificarStat(jug.id, 'amarillas', 'sumar')} className="px-2 py-1 bg-neutral-800 active:bg-neutral-700 rounded flex items-center gap-1 border border-neutral-700 min-w-[40px] justify-center">
                          <span className="text-yellow-400 text-xs md:text-sm">🟨</span><span className="text-white text-xs md:text-sm font-bold">{statsPartido[jug.id]?.amarillas || 0}</span>
                        </button>
                        
                        <button onClick={() => modificarStat(jug.id, 'rojas', 'sumar')} className="px-2 py-1 bg-neutral-800 active:bg-neutral-700 rounded flex items-center gap-1 border border-neutral-700 min-w-[40px] justify-center">
                          <span className="text-red-500 text-xs md:text-sm">🟥</span><span className="text-white text-xs md:text-sm font-bold">{statsPartido[jug.id]?.rojas || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Botonera Fija Abajo */}
            {/* CAMBIO CLAVE AQUÍ: Se ancla la botonera al fondo del contenedor con shrink-0 para que nunca la oculte el scroll */}
            <div className="w-full flex gap-2 md:gap-4 p-3 md:p-6 shrink-0 bg-neutral-900 border-t border-neutral-800 pb-safe-bottom z-10">
              <button onClick={() => setPartidoActivo(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 md:py-4 rounded-lg transition-colors border border-neutral-600 text-sm md:text-base shadow-md">Cerrar</button>
              <button onClick={finalizarPartido} className="flex-[2] bg-green-600 active:bg-green-700 md:hover:bg-green-500 text-white font-black py-3 md:py-4 rounded-lg transition-colors shadow-lg shadow-green-900/40 text-sm md:text-lg uppercase tracking-wide truncate">🏁 Finalizar Partido</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pt-safe-top { padding-top: max(env(safe-area-inset-top), 0.75rem); }
        .pb-safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0.75rem); }
      `}} />

      {/* Modal CRUD Jugadores */}
      {modalJugador && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 animate-fade-in backdrop-blur-sm">
           <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-lg border border-purple-900/50 shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Administrar Planteles</h2>
            <select value={equipoSeleccionadoId} onChange={e => setEquipoSeleccionadoId(e.target.value)} className="w-full p-2.5 rounded bg-neutral-900 text-white border border-purple-900 focus:border-purple-500 outline-none mb-4 text-sm md:text-base"><option value="">-- Elige un equipo --</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.grupo})</option>)}</select>
            {equipoSeleccionadoId && (
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
                <div className="bg-neutral-900/50 p-3 rounded border border-neutral-700"><div className="flex gap-2"><input type="text" value={nuevoNombreJugador} onChange={e => setNuevoNombreJugador(e.target.value)} placeholder="Nombre del Jugador" className="flex-1 p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none text-sm md:text-base"/><button onClick={agregarJugador} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded font-bold text-sm md:text-base">Add</button></div></div>
                <div>
                  <ul className="flex flex-col gap-2">
                    {jugadores.filter(j => j.equipoId === equipoSeleccionadoId).map((jug, idx) => (
                      <li key={jug.id} className="flex justify-between items-center p-2 bg-neutral-900/80 rounded border border-neutral-700 text-sm md:text-base">
                        {jugadorEditando === jug.id ? <input type="text" value={nombreEdicion} onChange={(e) => setNombreEdicion(e.target.value)} className="p-1 rounded bg-neutral-800 text-white border border-purple-500 outline-none w-full mr-2 text-sm" autoFocus /> : <span className="text-white font-medium truncate pr-2"><span className="text-gray-500 mr-1 md:mr-2">{idx + 1}.</span>{jug.nombre}</span>}
                        <div className="flex gap-1 md:gap-2 shrink-0">
                          {jugadorEditando === jug.id ? <button onClick={() => guardarEdicionJugador(jug.id)} className="text-green-400 bg-neutral-800 px-2 py-1 rounded text-xs font-bold border border-green-900">OK</button> : <button onClick={() => iniciarEdicionJugador(jug)} className="text-purple-400 bg-neutral-800 px-2 py-1 rounded text-xs md:text-sm border border-purple-900">✏️</button>}
                          <button onClick={() => eliminarJugador(jug.id)} className="text-red-400 bg-neutral-800 px-2 py-1 rounded text-xs md:text-sm border border-red-900">🗑️</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <button onClick={() => {setModalJugador(false); setEquipoSeleccionadoId('');}} className="w-full bg-neutral-700 active:bg-neutral-600 text-white py-3 rounded mt-4 text-sm md:text-base font-bold">Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
}
"use client";
import { useState, useEffect } from 'react';
// IMPORTANTE: Asegúrate de que esta ruta apunte a donde creaste tu firebase.js
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function FinanzasPage() {
  // Estados del formulario
  const [tipoMovimiento, setTipoMovimiento] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaMovimiento, setFechaMovimiento] = useState('');
  const [jugador, setJugador] = useState('');
  
  // Estados para archivos y control
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [idEditando, setIdEditando] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  // Estado de la base de datos
  const [transacciones, setTransacciones] = useState([]);

  const categoriasIngreso = ["Cuotas de Participación", "Auspicios", "Subsidios/Proyectos", "Recaudación Entradas", "Venta de Indumentaria", "Otros Ingresos"];
  const categoriasEgreso = ["Arbitraje", "Arriendo de Cancha", "Implementos Deportivos", "Botiquín e Insumos Médicos", "Movilización/Transporte", "Inscripción a Torneos", "Otros Gastos"];

  // 1. CARGAR DATOS DESDE FIREBASE
  const cargarDatos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'finanzas'));
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenar por fecha de movimiento (más reciente primero)
      datos.sort((a, b) => new Date(b.fechaMovimiento) - new Date(a.fechaMovimiento));
      setTransacciones(datos);
    } catch (error) {
      console.error("Error al cargar datos: ", error);
    }
  };

  // Ejecutar al cargar la página
  useEffect(() => {
    cargarDatos();
  }, []);

  // 2. GUARDAR O ACTUALIZAR REGISTRO
  const procesarRegistro = async () => {
    if (!tipoMovimiento || !descripcion || !monto || !fechaMovimiento) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }

    setProcesando(true);
    try {
      let urlComprobante = '';

      // Si hay un archivo nuevo, lo subimos a Storage
      if (archivoSeleccionado) {
        const storageRef = ref(storage, `comprobantes/${Date.now()}_${archivoSeleccionado.name}`);
        await uploadBytes(storageRef, archivoSeleccionado);
        urlComprobante = await getDownloadURL(storageRef);
      }

      const mesAnio = fechaMovimiento.substring(0, 7); 
      
      const datosRegistro = {
        tipo: tipoMovimiento,
        categoria: categoria,
        descripcion: descripcion,
        monto: Number(monto) * (tipoMovimiento === 'Egreso' ? -1 : 1),
        fechaMovimiento: fechaMovimiento,
        mes_anio: mesAnio, 
        fechaRegistro: new Date().toISOString().split('T')[0],
        jugador: jugador || '',
        estado: tipoMovimiento === 'Multa' ? 'Pendiente' : 'Pagado',
      };

      // Solo actualizamos la URL si se subió un archivo nuevo
      if (urlComprobante) {
        datosRegistro.comprobanteURL = urlComprobante;
      }

      if (idEditando) {
        const docRef = doc(db, 'finanzas', idEditando);
        await updateDoc(docRef, datosRegistro);
      } else {
        await addDoc(collection(db, 'finanzas'), datosRegistro);
      }

      cancelarEdicion();
      await cargarDatos(); // Refrescar tabla
      
    } catch (error) {
      console.error("Error procesando el registro: ", error);
      alert('Hubo un error al guardar. Revisa la consola para más detalles.');
    } finally {
      setProcesando(false);
    }
  };

  // 3. ELIMINAR REGISTRO
  const eliminarRegistro = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro contable? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'finanzas', id));
        setTransacciones(transacciones.filter(tx => tx.id !== id));
      } catch (error) {
        console.error("Error al eliminar: ", error);
        alert("No se pudo eliminar el registro.");
      }
    }
  };

  // 4. CONTROLADORES DEL FORMULARIO
  const iniciarEdicion = (tx) => {
    setIdEditando(tx.id);
    setTipoMovimiento(tx.tipo);
    setCategoria(tx.categoria || '');
    setDescripcion(tx.descripcion);
    setMonto(Math.abs(tx.monto)); 
    setFechaMovimiento(tx.fechaMovimiento);
    setJugador(tx.jugador || '');
    setArchivoSeleccionado(null);
    setNombreArchivo('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setIdEditando(null);
    setTipoMovimiento('');
    setCategoria('');
    setDescripcion('');
    setMonto('');
    setFechaMovimiento('');
    setJugador('');
    setArchivoSeleccionado(null);
    setNombreArchivo('');
  };

  // 5. CÁLCULOS PARA LAS TARJETAS (Basados en datos reales)
  const totalCaja = transacciones.reduce((acc, tx) => tx.estado === 'Pagado' ? acc + tx.monto : acc, 0);
  const ingresosMes = transacciones.filter(tx => tx.tipo === 'Ingreso' && tx.estado === 'Pagado').reduce((acc, tx) => acc + tx.monto, 0);
  const egresosMes = transacciones.filter(tx => tx.tipo === 'Egreso').reduce((acc, tx) => acc + tx.monto, 0);
  const porCobrar = transacciones.filter(tx => tx.estado === 'Pendiente').reduce((acc, tx) => acc + Math.abs(tx.monto), 0);

  const transaccionesFiltradas = transacciones.filter(tx => 
    filtroTipo === 'Todos' ? true : tx.tipo === filtroTipo
  );

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-12 lg:p-24">
      <div className="flex justify-between items-center mb-10 w-full max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-500 text-center md:text-left">
          Contabilidad del Club
        </h1>
        <div className="flex gap-4">
          <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded border border-neutral-600 transition-colors flex items-center gap-2">
            📊 Exportar a Excel
          </button>
        </div>
      </div>

      {/* PANEL SUPERIOR: Resumen Dinámico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-7xl mx-auto mb-8">
        <div className="bg-neutral-800 p-6 rounded-lg border border-purple-900/50 flex flex-col justify-center shadow-lg">
          <span className="text-gray-400 text-sm font-medium mb-1">Caja Actual</span>
          <span className="text-3xl font-bold text-white">${totalCaja.toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg border border-green-900/50 flex flex-col justify-center shadow-lg">
          <span className="text-gray-400 text-sm font-medium mb-1">Ingresos Totales</span>
          <span className="text-3xl font-bold text-green-400">${ingresosMes.toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg border border-gray-700 flex flex-col justify-center shadow-lg">
          <span className="text-gray-400 text-sm font-medium mb-1">Egresos Totales</span>
          <span className="text-3xl font-bold text-gray-300">-${Math.abs(egresosMes).toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-neutral-800 p-6 rounded-lg border border-red-900/50 flex flex-col justify-center shadow-lg">
          <span className="text-gray-400 text-sm font-medium mb-1">Por Cobrar</span>
          <span className="text-3xl font-bold text-red-400">${porCobrar.toLocaleString('es-CL')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto">
        
        {/* PANEL IZQUIERDO: Formulario Contable */}
        <div className={`p-6 rounded-lg shadow-lg border transition-all duration-300 h-fit ${idEditando ? 'bg-purple-900/20 border-purple-500' : 'bg-neutral-800 border-purple-900/50'}`}>
          <h2 className="text-2xl font-semibold mb-6 text-white border-b border-neutral-700 pb-2 flex justify-between items-center">
            {idEditando ? '✏️ Editando Registro' : 'Registrar Documento'}
            {idEditando && (
              <button onClick={cancelarEdicion} className="text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
            )}
          </h2>
          
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                <select 
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none"
                  value={tipoMovimiento}
                  onChange={(e) => {
                    setTipoMovimiento(e.target.value);
                    setCategoria('');
                  }}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Egreso">Egreso</option>
                  <option value="Multa">Multa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                <select 
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none disabled:opacity-50"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  disabled={!tipoMovimiento}
                >
                  <option value="">Seleccionar...</option>
                  {tipoMovimiento === 'Ingreso' && categoriasIngreso.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  {tipoMovimiento === 'Egreso' && categoriasEgreso.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  {tipoMovimiento === 'Multa' && <option value="Sanción Disciplinaria">Sanción Disciplinaria</option>}
                </select>
              </div>
            </div>

            {tipoMovimiento === 'Multa' && (
              <div className="animate-fade-in p-3 bg-neutral-900/50 border border-purple-900/50 rounded-lg">
                <label className="block text-sm text-purple-400 mb-1 font-medium">Asignar a Jugador/Socio:</label>
                <input 
                  type="text" 
                  value={jugador}
                  onChange={(e) => setJugador(e.target.value)}
                  placeholder="Escribir nombre o código..." 
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-purple-900/80 focus:border-purple-500 outline-none" 
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Detalle / Concepto</label>
              <textarea 
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Pago cuota septiembre transferencia N° 12345" 
                rows="2" 
                className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none resize-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Monto ($)</label>
                <input 
                  type="number" 
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0" 
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fecha del Movimiento</label>
                <input 
                  type="date" 
                  value={fechaMovimiento}
                  onChange={(e) => setFechaMovimiento(e.target.value)}
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none [color-scheme:dark]" 
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-sm text-purple-400 mb-1 font-medium flex justify-between">
                <span>Adjuntar Comprobante</span>
                <span className="text-xs text-gray-500">(Opcional)</span>
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  id="archivo-comprobante"
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={(e) => {
                    setArchivoSeleccionado(e.target.files[0]);
                    setNombreArchivo(e.target.files[0]?.name || '');
                  }}
                />
                <label 
                  htmlFor="archivo-comprobante"
                  className="flex items-center gap-3 w-full p-2.5 rounded bg-neutral-900 border border-neutral-700 cursor-pointer hover:border-purple-500 transition-colors"
                >
                  <span className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-400 px-3 py-1.5 rounded text-sm font-semibold transition-colors">
                    Elegir archivo
                  </span>
                  <span className="text-sm text-gray-400 truncate">
                    {nombreArchivo ? nombreArchivo : 'Ningún archivo seleccionado'}
                  </span>
                </label>
              </div>
            </div>

            <button 
              type="button" 
              onClick={procesarRegistro}
              disabled={procesando}
              className={`font-bold py-3 px-4 rounded transition-colors mt-4 shadow-lg ${idEditando ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20 text-white' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20 text-white'} disabled:opacity-50`}
            >
              {procesando ? 'Procesando...' : (idEditando ? 'Actualizar Registro' : 'Guardar Registro Contable')}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: Libro Mayor */}
        <div className="lg:col-span-2 bg-neutral-800 p-6 rounded-lg shadow-lg border border-purple-900/50 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-700 pb-4 mb-4">
            <h2 className="text-2xl font-semibold text-white">Historial Contable</h2>
            <select 
              className="p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none text-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="Todos">Todos los registros</option>
              <option value="Ingreso">Solo Ingresos</option>
              <option value="Egreso">Solo Egresos</option>
              <option value="Multa">Multas y Créditos</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300 min-w-max text-sm">
              <thead className="bg-neutral-900/50">
                <tr>
                  <th className="p-3 font-medium text-purple-400 rounded-tl-lg">Fecha Mov.</th>
                  <th className="p-3 font-medium text-purple-400">Clasificación</th>
                  <th className="p-3 font-medium text-purple-400">Detalle</th>
                  <th className="p-3 font-medium text-purple-400">Monto</th>
                  <th className="p-3 font-medium text-purple-400 text-center">Doc.</th>
                  <th className="p-3 font-medium text-purple-400">Estado</th>
                  <th className="p-3 font-medium text-purple-400 text-center rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transaccionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-gray-500">No hay registros contables en la base de datos.</td>
                  </tr>
                ) : (
                  transaccionesFiltradas.map((tx) => (
                    <tr key={tx.id} className={`border-b border-neutral-700/50 transition-colors ${idEditando === tx.id ? 'bg-purple-900/20' : 'hover:bg-neutral-700/30'}`}>
                      <td className="p-3">
                        {tx.fechaMovimiento}
                        <span className="block text-[10px] text-gray-500">Reg: {tx.fechaRegistro}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          tx.tipo === 'Ingreso' ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 
                          tx.tipo === 'Egreso' ? 'bg-neutral-700 text-gray-300 border border-neutral-600' : 
                          'bg-red-900/30 text-red-400 border border-red-800/50'
                        }`}>
                          {tx.tipo}
                        </span>
                        <span className="block text-xs mt-1 text-gray-400">{tx.categoria}</span>
                      </td>
                      <td className="p-3 text-white">
                        {tx.descripcion}
                        {tx.jugador && <span className="block text-xs text-purple-400 mt-0.5">Asociado a: {tx.jugador}</span>}
                      </td>
                      <td className={`p-3 font-medium ${tx.monto < 0 ? 'text-gray-400' : 'text-white'}`}>
                        ${Math.abs(tx.monto).toLocaleString('es-CL')}
                      </td>
                      <td className="p-3 text-center">
                        {tx.comprobanteURL ? (
                          <a href={tx.comprobanteURL} target="_blank" rel="noopener noreferrer" title="Ver Comprobante" className="text-purple-400 hover:text-purple-300 text-xl">
                            📄
                          </a>
                        ) : (
                          <span className="text-gray-600 text-[10px]">N/A</span>
                        )}
                      </td>
                      <td className="p-3">
                        {tx.estado === 'Pagado' ? (
                          <span className="text-green-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Ok</span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Deuda</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => iniciarEdicion(tx)}
                            title="Editar" 
                            className="p-1.5 rounded bg-neutral-700 hover:bg-purple-600 text-gray-300 hover:text-white transition-colors"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => eliminarRegistro(tx.id)}
                            title="Eliminar" 
                            className="p-1.5 rounded bg-neutral-700 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
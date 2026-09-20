"use client";
import { useState, useEffect } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';

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

export default function VentasPage() {
  const [tabActiva, setTabActiva] = useState('caja');
  const [cargando, setCargando] = useState(true);

  const [productos, setProductos] = useState([]);
  const [ventasHistoricas, setVentasHistoricas] = useState([]);

  const [carrito, setCarrito] = useState([]); 
  const [montoPagadoEfectivo, setMontoPagadoEfectivo] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo'); 

  const [formProducto, setFormProducto] = useState({ nombre: '', precio: '' });
  const [productoEditandoId, setProductoEditandoId] = useState(null);

  const [modalEditarVenta, setModalEditarVenta] = useState(false);
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState(null);
  const [formEdicionVenta, setFormEdicionVenta] = useState({ metodoPago: 'Efectivo', total: 0 });

  const cargarDatos = async () => {
    try {
      const prodSnap = await getDocs(collection(db, 'kiosco_productos'));
      setProductos(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const qVentas = query(collection(db, 'kiosco_ventas'), orderBy('fechaRegistro', 'desc'));
      const ventasSnap = await getDocs(qVentas);
      
      const ventasFormateadas = ventasSnap.docs.map(d => {
         const data = d.data();
         let horaLegible = "Sin hora";
         if (data.fechaRegistro && data.fechaRegistro.toDate) {
             const dateObj = data.fechaRegistro.toDate();
             horaLegible = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
         }
         return { id: d.id, ...data, horaLegible };
      });

      setVentasHistoricas(ventasFormateadas);
      setCargando(false);
    } catch (error) {
      console.error(error);
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const guardarProducto = async () => {
    if (!formProducto.nombre || !formProducto.precio) {
      alert("Ingresa el nombre y el precio del producto.");
      return;
    }

    const productoFinal = {
      nombre: formProducto.nombre.trim(),
      precio: Number(formProducto.precio)
    };

    try {
      if (productoEditandoId) {
        await updateDoc(doc(db, 'kiosco_productos', productoEditandoId), productoFinal);
      } else {
        await addDoc(collection(db, 'kiosco_productos'), productoFinal);
      }
      
      setFormProducto({ nombre: '', precio: '' });
      setProductoEditandoId(null);
      await cargarDatos(); 
    } catch (error) {
      alert("Error al guardar el producto.");
    }
  };

  const iniciarEdicionProducto = (prod) => {
    setProductoEditandoId(prod.id);
    setFormProducto({ nombre: prod.nombre, precio: prod.precio });
  };

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto del menú?")) {
      try {
        await deleteDoc(doc(db, 'kiosco_productos', id));
        setProductos(productos.filter(p => p.id !== id));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const totalOrden = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  const vuelto = montoPagadoEfectivo ? (Number(montoPagadoEfectivo) - totalOrden) : 0;

  const agregarAlCarrito = (producto) => {
    setCarrito(prevCarrito => {
      const itemExistenteIndex = prevCarrito.findIndex(item => item.producto.id === producto.id);
      if (itemExistenteIndex >= 0) {
        const nuevoCarrito = [...prevCarrito];
        const item = nuevoCarrito[itemExistenteIndex];
        item.cantidad += 1;
        item.subtotal = item.cantidad * item.producto.precio;
        return nuevoCarrito;
      } else {
        return [...prevCarrito, { producto: producto, cantidad: 1, subtotal: producto.precio }];
      }
    });
  };

  const quitarDelCarrito = (indexItem) => {
    setCarrito(prev => prev.filter((_, idx) => idx !== indexItem));
  };

  const concretarVenta = async () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío. Agrega productos primero.");
      return;
    }

    if (metodoPago === 'Efectivo' && montoPagadoEfectivo && vuelto < 0) {
      alert("El monto pagado no alcanza para cubrir el total de la orden.");
      return;
    }

    const nuevaVenta = {
      items: carrito.map(c => ({
        nombre: c.producto.nombre,
        cantidad: c.cantidad,
        precioUnitario: c.producto.precio,
        subtotal: c.subtotal
      })),
      total: totalOrden,
      metodoPago: metodoPago,
      pagoRecibido: metodoPago === 'Efectivo' ? (montoPagadoEfectivo ? Number(montoPagadoEfectivo) : totalOrden) : totalOrden,
      vueltoEntregado: metodoPago === 'Efectivo' ? vuelto : 0,
      fechaRegistro: serverTimestamp() 
    };

    try {
      await addDoc(collection(db, 'kiosco_ventas'), nuevaVenta);
      setCarrito([]);
      setMontoPagadoEfectivo('');
      alert("✅ Venta registrada con éxito.");
      await cargarDatos(); 
    } catch (error) {
      alert("Hubo un error al registrar la venta.");
    }
  };

  const eliminarVenta = async (id) => {
    if (window.confirm("🚨 ¿Seguro que deseas ELIMINAR esta venta? Se descontará del total recaudado y del cuadro de caja. Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'kiosco_ventas', id));
        setVentasHistoricas(ventasHistoricas.filter(v => v.id !== id));
      } catch (error) {
        alert("Hubo un error al eliminar el registro.");
      }
    }
  };

  const iniciarEdicionVenta = (venta) => {
    setVentaSeleccionadaId(venta.id);
    setFormEdicionVenta({
      metodoPago: venta.metodoPago,
      total: venta.total
    });
    setModalEditarVenta(true);
  };

  const guardarEdicionVenta = async () => {
    if (formEdicionVenta.total < 0) {
      alert("El total no puede ser negativo.");
      return;
    }
    
    try {
      await updateDoc(doc(db, 'kiosco_ventas', ventaSeleccionadaId), {
        metodoPago: formEdicionVenta.metodoPago,
        total: Number(formEdicionVenta.total)
      });
      
      setModalEditarVenta(false);
      setVentaSeleccionadaId(null);
      await cargarDatos();
      alert("✅ Venta actualizada correctamente.");
    } catch (error) {
      alert("Hubo un error al guardar los cambios.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-2 md:p-8 relative max-w-7xl mx-auto mt-4 md:mt-0">
      <h1 className="text-2xl md:text-3xl font-bold text-amber-500 mb-4 md:mb-6 text-center mt-2 md:mt-0">Kiosco & Caja 🏪</h1>

      <div className="flex gap-1 md:gap-2 mb-4 md:mb-6 border-b border-neutral-700 pb-2 overflow-x-auto hide-scrollbar px-1">
        <button onClick={() => setTabActiva('caja')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'caja' ? 'bg-amber-600 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Registradora</button>
        <button onClick={() => setTabActiva('libro')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'libro' ? 'bg-amber-600 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Libro de Ventas</button>
        <button onClick={() => setTabActiva('inventario')} className={`whitespace-nowrap px-3 md:px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors flex-1 text-center ${tabActiva === 'inventario' ? 'bg-amber-600 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>Inventario / Precios</button>
      </div>

      {tabActiva === 'caja' && (
        <div className="flex flex-col md:flex-row gap-6 w-full animate-fade-in pb-10">
          <div className="flex-[2] bg-neutral-800 p-4 md:p-6 rounded-lg border border-neutral-700 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-600 pb-2">Selecciona Productos</h2>
            
            {cargando ? <p className="text-amber-500 animate-pulse">Cargando menú...</p> : productos.length === 0 ? (
               <p className="text-gray-500 italic">No hay productos. Ve a la pestaña "Inventario / Precios" para crearlos.</p>
            ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                 {productos.map(prod => (
                   <button 
                     key={prod.id} 
                     onClick={() => agregarAlCarrito(prod)}
                     className="bg-neutral-900 border border-neutral-700 hover:border-amber-500 active:bg-amber-900/40 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-md h-32"
                   >
                     <span className="font-bold text-white text-center leading-tight">{prod.nombre}</span>
                     <span className="bg-amber-900/40 text-amber-500 px-3 py-1 rounded-full text-sm font-black mt-auto">
                        ${prod.precio.toLocaleString('es-CL')}
                     </span>
                   </button>
                 ))}
               </div>
            )}
          </div>

          <div className="flex-1 bg-neutral-900 p-4 md:p-6 rounded-lg border-2 border-amber-600/50 shadow-[0_0_15px_rgba(217,119,6,0.15)] flex flex-col h-fit md:sticky md:top-24">
            <h2 className="text-xl font-bold text-amber-500 mb-4 border-b border-amber-900/50 pb-2">Cuenta Actual</h2>
            
            <div className="flex-1 min-h-[150px] max-h-[300px] overflow-y-auto mb-4 hide-scrollbar">
               {carrito.length === 0 ? (
                 <div className="flex h-full items-center justify-center text-gray-600 italic border-2 border-dashed border-neutral-800 rounded-lg p-4">
                   Ticket vacío...
                 </div>
               ) : (
                 <ul className="flex flex-col gap-2">
                   {carrito.map((item, index) => (
                     <li key={index} className="flex justify-between items-center bg-neutral-800 p-3 rounded">
                       <div className="flex items-center gap-3">
                         <span className="bg-neutral-700 text-white font-bold w-6 h-6 flex items-center justify-center rounded text-xs">x{item.cantidad}</span>
                         <span className="text-white text-sm">{item.producto.nombre}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-bold text-amber-400">${item.subtotal.toLocaleString('es-CL')}</span>
                         <button onClick={() => quitarDelCarrito(index)} className="text-red-500 hover:text-red-400 bg-red-500/10 p-1.5 rounded" title="Quitar">❌</button>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
            </div>

            <div className="bg-black p-4 rounded-lg flex justify-between items-center mb-6 shadow-inner border border-neutral-800">
               <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Total a Pagar</span>
               <span className="text-4xl font-black text-white">${totalOrden.toLocaleString('es-CL')}</span>
            </div>

            <div className={`transition-opacity ${carrito.length > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
               <h3 className="text-sm font-bold text-gray-400 mb-2">Método de Pago:</h3>
               <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => { setMetodoPago('Efectivo'); setMontoPagadoEfectivo(''); }}
                    className={`flex-1 py-3 rounded font-bold transition-colors ${metodoPago === 'Efectivo' ? 'bg-amber-600 text-black' : 'bg-neutral-800 text-gray-400 border border-neutral-700'}`}
                  >
                    💵 Efectivo
                  </button>
                  <button 
                    onClick={() => { setMetodoPago('Transferencia'); setMontoPagadoEfectivo(''); }}
                    className={`flex-1 py-3 rounded font-bold transition-colors ${metodoPago === 'Transferencia' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 border border-neutral-700'}`}
                  >
                    📱 Transf.
                  </button>
               </div>

               {metodoPago === 'Efectivo' && (
                  <div className="bg-neutral-800 p-4 rounded-lg mb-6 border border-neutral-700">
                     <label className="block text-xs text-gray-400 font-bold mb-2 uppercase">¿Con cuánto billete pagó?</label>
                     <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl text-gray-500 font-black">$</span>
                        <input 
                           type="number" 
                           value={montoPagadoEfectivo}
                           onChange={(e) => setMontoPagadoEfectivo(e.target.value)}
                           className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-2 text-2xl font-black text-white outline-none focus:border-amber-500"
                           placeholder="Ej. 10000"
                        />
                     </div>
                     <div className={`flex justify-between items-center p-2 rounded ${vuelto < 0 ? 'bg-red-900/30' : 'bg-amber-900/20'}`}>
                        <span className={`font-bold ${vuelto < 0 ? 'text-red-400' : 'text-amber-500'}`}>
                           {vuelto < 0 ? 'Falta Dinero:' : 'Vuelto a Entregar:'}
                        </span>
                        <span className={`text-2xl font-black ${vuelto < 0 ? 'text-red-500' : 'text-amber-400'}`}>
                           ${Math.abs(vuelto).toLocaleString('es-CL')}
                        </span>
                     </div>
                  </div>
               )}

               <button 
                  onClick={concretarVenta}
                  className={`w-full py-4 rounded-lg font-black text-lg shadow-lg uppercase tracking-wider transition-all ${metodoPago === 'Efectivo' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'}`}
               >
                 ✅ Cobrar y Registrar
               </button>
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'libro' && (
        <div className="w-full animate-fade-in pb-10 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-neutral-800 p-6 rounded-lg border-l-4 border-amber-500 shadow-md">
                <span className="text-gray-400 text-sm font-bold uppercase block mb-1">Total Recaudado</span>
                <span className="text-3xl font-black text-white">${ventasHistoricas.reduce((acc, v) => acc + v.total, 0).toLocaleString('es-CL')}</span>
             </div>
             <div className="bg-neutral-800 p-6 rounded-lg border-l-4 border-green-500 shadow-md">
                <span className="text-gray-400 text-sm font-bold uppercase block mb-1">Caja Efectivo Físico</span>
                <span className="text-3xl font-black text-white">${ventasHistoricas.filter(v => v.metodoPago === 'Efectivo').reduce((acc, v) => acc + v.total, 0).toLocaleString('es-CL')}</span>
             </div>
             <div className="bg-neutral-800 p-6 rounded-lg border-l-4 border-blue-500 shadow-md">
                <span className="text-gray-400 text-sm font-bold uppercase block mb-1">Transferencias (Banco)</span>
                <span className="text-3xl font-black text-white">${ventasHistoricas.filter(v => v.metodoPago === 'Transferencia').reduce((acc, v) => acc + v.total, 0).toLocaleString('es-CL')}</span>
             </div>
          </div>

          <div className="bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg overflow-hidden">
            <h3 className="text-xl font-bold text-white p-5 border-b border-neutral-700">Historial de Transacciones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300 min-w-max">
                <thead className="bg-neutral-900 text-amber-500">
                  <tr>
                    <th className="p-4">Hora</th>
                    <th className="p-4">Detalle Orden</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Recibido</th>
                    <th className="p-4">Vuelto</th>
                    <th className="p-4 text-right">Total Final</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? <tr><td colSpan="7" className="p-6 text-amber-500 animate-pulse text-center">Cargando libro...</td></tr> : 
                   ventasHistoricas.length === 0 ? <tr><td colSpan="7" className="p-6 text-gray-500 italic text-center">Aún no hay ventas registradas.</td></tr> : 
                   ventasHistoricas.map((venta) => (
                    <tr key={venta.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30">
                      <td className="p-4 font-bold text-gray-400">{venta.horaLegible}</td>
                      <td className="p-4">
                        <ul className="list-disc pl-4">
                           {venta.items && venta.items.map((item, i) => (
                              <li key={i} className="text-xs">{item.cantidad}x {item.nombre}</li>
                           ))}
                        </ul>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${venta.metodoPago === 'Efectivo' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-blue-900/30 text-blue-400 border border-blue-800'}`}>
                           {venta.metodoPago === 'Efectivo' ? '💵 Efectivo' : '📱 Transf.'}
                         </span>
                      </td>
                      <td className="p-4">${venta.pagoRecibido?.toLocaleString('es-CL') || 0}</td>
                      <td className="p-4 text-amber-500/70">${venta.vueltoEntregado?.toLocaleString('es-CL') || 0}</td>
                      <td className="p-4 text-right font-black text-white text-lg">${venta.total.toLocaleString('es-CL')}</td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => iniciarEdicionVenta(venta)} className="text-blue-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 p-1.5 rounded border border-neutral-600 transition-colors" title="Editar Venta">✏️</button>
                          <button onClick={() => eliminarVenta(venta.id)} className="text-red-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 p-1.5 rounded border border-neutral-600 transition-colors" title="Eliminar Venta">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'inventario' && (
        <div className="w-full animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 shadow-lg h-fit">
             <h3 className="text-xl font-bold text-white mb-4 border-b border-neutral-600 pb-2">
               {productoEditandoId ? '✏️ Editando Producto' : '➕ Crear Nuevo Producto'}
             </h3>
             <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre (Ej. Bebida Lata 350cc)</label>
                  <input type="text" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio de Venta ($ CLP)</label>
                  <input type="number" value={formProducto.precio} onChange={e => setFormProducto({...formProducto, precio: e.target.value})} className="w-full p-3 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-amber-500 outline-none" placeholder="1500" />
                </div>
                
                <div className="flex gap-2 mt-2">
                   {productoEditandoId && (
                      <button onClick={() => { setProductoEditandoId(null); setFormProducto({nombre:'', precio:''}); }} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded font-bold">Cancelar</button>
                   )}
                   <button onClick={guardarProducto} className={`flex-[2] py-3 rounded font-black text-white shadow-lg ${productoEditandoId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500 text-black'}`}>
                      {productoEditandoId ? '💾 Guardar Cambios' : '✅ Añadir al Menú'}
                   </button>
                </div>
             </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 shadow-lg">
             <h3 className="text-xl font-bold text-white mb-4 border-b border-neutral-600 pb-2">Menú Actual</h3>
             <ul className="flex flex-col gap-3">
                {cargando ? <li className="text-amber-500 animate-pulse">Cargando menú...</li> : productos.length === 0 ? <li className="text-gray-500 italic">No hay productos.</li> : 
                 productos.map(prod => (
                  <li key={prod.id} className="flex justify-between items-center bg-neutral-900 p-3 rounded border border-neutral-700 shadow-sm">
                    <div className="flex flex-col">
                       <span className="text-white font-bold">{prod.nombre}</span>
                       <span className="text-amber-500 font-black">${prod.precio.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => iniciarEdicionProducto(prod)} className="bg-neutral-800 p-2 rounded text-blue-400 hover:text-white border border-neutral-700">✏️</button>
                       <button onClick={() => eliminarProducto(prod.id)} className="bg-neutral-800 p-2 rounded text-red-400 hover:text-white border border-neutral-700">🗑️</button>
                    </div>
                  </li>
                ))}
             </ul>
          </div>
        </div>
      )}

      {modalEditarVenta && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-sm border border-amber-600/50 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-700 pb-2">Editar Registro de Venta</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Modificar Método de Pago</label>
                <select
                  value={formEdicionVenta.metodoPago}
                  onChange={(e) => setFormEdicionVenta({...formEdicionVenta, metodoPago: e.target.value})}
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-amber-500 outline-none"
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">📱 Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total Cobrado ($)</label>
                <input
                  type="number"
                  value={formEdicionVenta.total}
                  onChange={(e) => setFormEdicionVenta({...formEdicionVenta, total: e.target.value})}
                  className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-amber-500 outline-none font-bold"
                />
                <span className="text-xs text-gray-500 mt-1 block">*Cambiar esto afectará la suma de la caja.</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalEditarVenta(false)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded font-medium transition-colors">Cancelar</button>
              <button onClick={guardarEdicionVenta} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black py-2 rounded font-bold transition-colors shadow-lg">💾 Guardar</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}
"use client";
import { useState } from 'react';

export default function JugadoresPage() {
  // Datos de prueba actualizados
  const [jugadores, setJugadores] = useState([
    { id: 1, rut: "19.123.456-7", nombre: "Juan Pérez", posicion: "Delantero", serie: "Honor", alDia: true },
    { id: 2, rut: "15.987.654-3", nombre: "Diego Gómez", posicion: "Defensa", serie: "Senior", alDia: false },
    { id: 3, rut: "20.456.789-0", nombre: "Carlos Tapia", posicion: "Mediocampista", serie: "Segunda", alDia: true },
  ]);

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-12 lg:p-24">
      <h1 className="text-4xl font-bold text-purple-500 mb-10 text-center">
        Gestión de Jugadores
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto">
        
        {/* PANEL IZQUIERDO: Formulario de Registro */}
        <div className="bg-neutral-800 p-6 rounded-lg shadow-lg border border-purple-900/50 h-fit">
          <h2 className="text-2xl font-semibold mb-6 text-white border-b border-neutral-700 pb-2">
            Nuevo Jugador
          </h2>
          <form className="flex flex-col gap-5">
            
            {/* Nombre ocupa todo el ancho */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre Completo</label>
              <input type="text" placeholder="Ej. Arturo Vidal" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
            </div>

            {/* Grid interno de 2 columnas para el resto de los datos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">RUT</label>
                <input type="text" placeholder="12.345.678-9" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Fecha de Inscripción</label>
                <input type="date" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors [color-scheme:dark]" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Sexo</label>
                <select className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nacionalidad</label>
                <input type="text" defaultValue="Chilena" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Posición</label>
                <select className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
                  <option value="">Seleccionar</option>
                  <option value="Arquero">Arquero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Mediocampista">Mediocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Asignar Serie</label>
                <select className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
                  <option value="">Seleccionar</option>
                  <option value="Honor">Honor</option>
                  <option value="Senior">Senior</option>
                  <option value="Segunda">Segunda</option>
                </select>
              </div>
            </div>

            <button type="button" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors mt-2 shadow-lg shadow-purple-900/20">
              Registrar Jugador
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: Tabla del Plantel */}
        <div className="lg:col-span-2 bg-neutral-800 p-6 rounded-lg shadow-lg border border-purple-900/50 overflow-hidden">
          <h2 className="text-2xl font-semibold mb-6 text-white border-b border-neutral-700 pb-2">
            Plantel Actual
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300 min-w-max">
              <thead className="bg-neutral-900/50">
                <tr>
                  <th className="p-4 font-medium text-purple-400 rounded-tl-lg">RUT</th>
                  <th className="p-4 font-medium text-purple-400">Nombre</th>
                  <th className="p-4 font-medium text-purple-400">Posición</th>
                  <th className="p-4 font-medium text-purple-400">Serie</th>
                  <th className="p-4 font-medium text-purple-400">Finanzas</th>
                  <th className="p-4 font-medium text-purple-400 rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((jugador) => (
                  <tr key={jugador.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30 transition-colors">
                    <td className="p-4 text-sm">{jugador.rut}</td>
                    <td className="p-4 font-medium text-white">{jugador.nombre}</td>
                    <td className="p-4">{jugador.posicion}</td>
                    <td className="p-4">
                      <span className="bg-neutral-900 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 border border-purple-900/50">
                        {jugador.serie}
                      </span>
                    </td>
                    <td className="p-4">
                      {jugador.alDia ? (
                        <span className="text-green-400 flex items-center gap-1.5 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Al día
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1.5 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span> Moroso
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium">
                      <button className="text-purple-400 hover:text-purple-300 mr-4 transition-colors">Editar</button>
                      <button className="text-red-500 hover:text-red-400 transition-colors">Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
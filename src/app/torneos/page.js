"use client";
import { useState } from 'react';

export default function TorneosPage() {
  // Inicia con 1 jugador vacío
  const [jugadores, setJugadores] = useState([{ nombre: "", rut: "" }]);

  // Lógica para máximo 10 participantes
  const agregarJugador = () => {
    if (jugadores.length < 10) {
      setJugadores([...jugadores, { nombre: "", rut: "" }]);
    }
  };

  const actualizarJugador = (index, campo, valor) => {
    const nuevosJugadores = [...jugadores];
    nuevosJugadores[index][campo] = valor;
    setJugadores(nuevosJugadores);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12">
      <h1 className="text-4xl font-bold text-purple-500 mb-2 text-center">
        Inscripción Torneo Flash Futbolito
      </h1>
      <p className="text-gray-400 mb-8 text-center">Inscribe a tu equipo externo para participar en los campeonatos de Real San Fabián.</p>
      
      <div className="w-full max-w-4xl bg-neutral-800 p-8 rounded-lg shadow-lg border border-purple-900/50">
        <form className="flex flex-col gap-8">
          
          {/* SECCIÓN 1: Datos del Equipo */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-white border-b border-neutral-700 pb-2">
              1. Información del Equipo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del Equipo</label>
                <input type="text" placeholder="Ej. Los Galácticos" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color del Uniforme</label>
                <input type="text" placeholder="Ej. Rojo y Negro" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                <select className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">WhatsApp del Contacto</label>
                <input type="tel" placeholder="+56 9 1234 5678" className="w-full p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Forma de Pago de Inscripción</label>
                <select className="w-full md:w-1/2 p-2.5 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors">
                  <option value="">Seleccionar</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Lista de Jugadores (Máximo 10) */}
          <div>
            <div className="flex justify-between items-end mb-4 border-b border-neutral-700 pb-2">
              <h2 className="text-xl font-semibold text-white">
                2. Nómina de Jugadores
              </h2>
              <span className={`text-sm font-medium ${jugadores.length === 10 ? 'text-red-400' : 'text-purple-400'}`}>
                {jugadores.length} de 10 inscritos
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              {jugadores.map((jugador, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-neutral-900/50 p-3 rounded border border-neutral-700/50">
                  <span className="text-gray-500 font-bold w-6">{index + 1}.</span>
                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    value={jugador.nombre}
                    onChange={(e) => actualizarJugador(index, 'nombre', e.target.value)}
                    className="w-full p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" 
                  />
                  <input 
                    type="text" 
                    placeholder="RUT" 
                    value={jugador.rut}
                    onChange={(e) => actualizarJugador(index, 'rut', e.target.value)}
                    className="w-full md:w-1/3 p-2 rounded bg-neutral-900 text-white border border-neutral-700 focus:border-purple-500 outline-none transition-colors" 
                  />
                </div>
              ))}
            </div>

            {/* Este botón desaparece al llegar a 10 jugadores */}
            {jugadores.length < 10 && (
              <button 
                type="button" 
                onClick={agregarJugador}
                className="mt-4 text-purple-400 hover:text-purple-300 font-medium text-sm flex items-center gap-1 transition-colors"
              >
                + Agregar jugador
              </button>
            )}
          </div>

          <button type="button" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-4 rounded transition-colors mt-4 shadow-lg shadow-purple-900/20 text-lg">
            Enviar Inscripción
          </button>

        </form>
      </div>
    </main>
  );
}
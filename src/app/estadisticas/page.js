export default function EstadisticasPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
      <h1 className="text-4xl font-bold text-purple-500 mb-8">
        Estadísticas del Club
      </h1>
      <div className="bg-neutral-800 p-8 rounded-lg w-full max-w-4xl shadow-lg border border-purple-900/30">
        <p className="text-gray-300 text-center">Aquí mostraremos el rendimiento de las series, goleadores y tarjetas.</p>
      </div>
    </main>
  );
}
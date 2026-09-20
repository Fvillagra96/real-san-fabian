import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    // Hemos quitado "sticky top-0 z-50" para que el menú fluya con la página
    <nav className="bg-black border-b border-purple-800 p-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        
        {/* Logo y Nombre del Club */}
        <Link href="/" className="flex items-center gap-3 mb-4 md:mb-0 group">
          <Image 
            src="/logo.png" 
            alt="Escudo Real San Fabián" 
            width={45} 
            height={45} 
            className="object-contain"
          />
          <span className="text-purple-500 font-bold text-2xl group-hover:text-purple-400 transition-colors">
            Real San Fabián
          </span>
        </Link>
        
        {/* Enlaces de los módulos */}
        <div className="flex gap-4 md:gap-6 font-medium text-sm md:text-base flex-wrap justify-center items-center">
          <Link href="/jugadores" className="text-gray-300 hover:text-purple-400 transition-colors">
            Jugadores
          </Link>
          <Link href="/finanzas" className="text-gray-300 hover:text-purple-400 transition-colors">
            Finanzas
          </Link>
          <Link href="/estadisticas" className="text-gray-300 hover:text-purple-400 transition-colors">
            Estadísticas
          </Link>
          <Link href="/torneos" className="text-gray-300 hover:text-purple-400 transition-colors">
            Inscripción
          </Link>
          <Link href="/ventas" className="text-gray-300 hover:text-purple-400 transition-colors font-bold">
              🏪 Kiosco
          </Link>
          
          <Link href="/torneo-express" className="bg-purple-900/40 border border-purple-700 text-purple-300 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded transition-all font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            ⚡ Torneo en Vivo
          </Link>
        </div>
      </div>
    </nav>
  );
}
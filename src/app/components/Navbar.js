import Link from 'next/link';
import Image from 'next/image'; // Importamos el optimizador de imágenes de Next.js

export default function Navbar() {
  return (
    <nav className="bg-black border-b border-purple-800 p-4 sticky top-0 z-50">
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
        <div className="flex gap-6 font-medium">
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
            Torneos
          </Link>
        </div>
      </div>
    </nav>
  );
}
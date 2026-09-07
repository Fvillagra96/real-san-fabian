import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Real San Fabián - Admin",
  description: "Plataforma de administración deportiva del club Real San Fabián",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-black min-h-screen text-white relative`}>
        
        {/* CAPA DE FONDO DIFUMINADA */}
        <div 
          className="fixed inset-0 z-[-1] bg-[url('/fondo.jpg')] bg-cover bg-center bg-no-repeat opacity-20 blur-sm"
        ></div>

        {/* Barra de Navegación */}
        <Navbar />
        
        {/* Contenido de las páginas */}
        <div className="relative z-10">
          {children}
        </div>
        
      </body>
    </html>
  );
}
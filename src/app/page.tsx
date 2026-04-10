import Link from 'next/link';
import { ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#d5e2ee]">
      {/* Background watermark logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/images/logo/svg/logo-icon-blue-solid.svg"
          alt=""
          className="w-[600px] h-[600px] opacity-[0.08]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-2xl mx-auto">
        {/* Logo icon */}
        <div className="mb-10">
          <img
            src="/images/logo/svg/logo-icon-green-solid.svg"
            alt="Tonic Life"
            className="w-16 h-16"
          />
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#2d4f5e] mb-2 leading-tight tracking-tight">
          Estamos trabajando
        </h1>
        <p className="text-4xl sm:text-5xl md:text-6xl font-light italic text-[#3E667D] mb-8">
          para ti
        </p>

        <p className="text-lg sm:text-xl text-[#3E667D]/80 font-medium mb-14 max-w-md leading-relaxed">
          Muy pronto tendrás<br />
          una mejor experiencia
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-lg">
          <Link
            href="#"
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-full border-2 border-[#3E667D]/40 text-[#2d4f5e] font-semibold text-base hover:bg-[#3E667D]/10 transition-colors"
          >
            <ShoppingCartIcon className="w-7 h-7" />
            Comprar ahora
          </Link>
          <a
            href="https://tonic-life.net/login/empresariosindependientes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-full border-2 border-[#3E667D]/40 text-[#2d4f5e] font-semibold text-base hover:bg-[#3E667D]/10 transition-colors"
          >
            <UserCircleIcon className="w-7 h-7" />
            Ir a mi oficina virtual
          </a>
        </div>
      </div>
    </div>
  );
}

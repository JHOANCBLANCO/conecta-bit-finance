import React from 'react';
import {
    LayoutGrid,
    Users,
    Briefcase,
    BadgeDollarSign,
    Wallet,
    UserCog,
    X,
    LogOut,
    Menu,
    Sun,
    Moon,
    Receipt
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function Sidebar({ isOpen, setOpen, role, onLogout }: { isOpen: boolean, setOpen: (s: boolean) => void, role: string, onLogout: () => void }) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const getNavClass = (path: string) => {
        const isActive = pathname === path;
        const baseClass = "flex items-center w-full p-2.5 rounded-xl transition-all duration-200 mb-1 focus:outline-none overflow-hidden hover:bg-slate-50/50 dark:hover:bg-slate-800/50";
        const stateClass = isActive ? "bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium";
        return `${baseClass} ${stateClass}`;
    };

    const iconColor = "text-slate-500 dark:text-slate-400";
    const activeIconColor = "text-blue-700 dark:text-blue-400";

    // Para asegurar inmutabilidad en el eje Y, NO reducimos el margin-top ni margin-bottom
    // SOLO reducimos su altura y opacidad. Para que no estorbe (salte) lo ideal en "Sidebar cerrados"
    // tipo corporativo, es que el título desparezca, pero NO elimine el espacio o, aún mejor, que el espacio de separación sea uniforme
    const sectionTitleClass = `text-[11px] font-extrabold text-[#8292a8] tracking-wider ml-3 uppercase transition-opacity duration-300 ease-in-out whitespace-nowrap overflow-hidden ${isOpen ? 'opacity-100 mt-6 mb-2 h-4' : 'lg:opacity-0 lg:h-4 lg:mt-6 lg:mb-2 opacity-100 mt-6 mb-2 h-4'} pointer-events-none`;


    return (
        <>
            {/* Backdrop universal solo visible en pantallas PEQUEÑAS (Móviles) */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setOpen(false)}
            />

            <aside
                className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-[#eef2f6] dark:border-slate-800 flex flex-col z-50 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
                    ${isOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0 lg:w-[80px] w-[270px]'}
                `}
            >
                <div className="h-[72px] flex items-center px-[18px] shrink-0 border-b border-transparent mt-1">
                    {/* Hamburger Button para Desktop posicionado INMUTABLE */}
                    <button
                        onClick={() => setOpen(!isOpen)}
                        className="hidden lg:flex text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 outline-none"
                    >
                        <Menu size={24} strokeWidth={2} />
                    </button>

                    {/* Logo (solo Móvil, o Desktop cuando Open) */}
                    <div className={`flex items-center space-x-3 overflow-hidden transition-all duration-300 ease-in-out 
                        ${isOpen ? 'lg:ml-3 ml-1 opacity-100 w-48' : 'lg:ml-0 opacity-100 lg:opacity-0 w-48 lg:w-0'}
                    `}>
                        <img src="/conecta.png" alt="Conecta-Bit Logo" className="h-8 w-auto min-w-[28px] object-contain shrink-0" />
                        <h1 className="text-[17px] font-black bg-gradient-to-r from-[#2c3e50] to-[#34495e] dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent tracking-tight leading-tight whitespace-nowrap">
                            Conecta-Bit<br />Finance
                        </h1>
                    </div>

                    {/* Botón cerrar para Móvil */}
                    <button onClick={() => setOpen(false)} className="lg:hidden ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={24} strokeWidth={2} />
                    </button>
                </div>

                <div className="px-[18px] py-1 border-b border-[#eef2f6] dark:border-slate-800">
                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium my-1 outline-none"
                            title="Alternar Tema"
                        >
                            <div className="shrink-0 flex items-center justify-center">
                                {theme === 'dark' ? <Sun size={24} strokeWidth={2} /> : <Moon size={24} strokeWidth={2} />}
                            </div>
                            <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>
                                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                            </span>
                        </button>
                    ) : (
                        <div className="h-[52px]"></div>
                    )}
                </div>

                <nav className="flex-1 px-[18px] py-4 overflow-y-auto scrollbar-hide flex flex-col items-stretch space-y-0.5 mt-2">

                    <div className={sectionTitleClass}>Principal</div>
                    <Link href="/" className={getNavClass('/')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Inicio">
                        <div className="shrink-0 flex items-center justify-center"><LayoutGrid size={24} strokeWidth={isActive('/') ? 2.5 : 2} className={isActive('/') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Inicio</span>
                    </Link>
                    <Link href="/clientes" className={getNavClass('/clientes')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Gestión Clientes">
                        <div className="shrink-0 flex items-center justify-center"><Users size={24} strokeWidth={isActive('/clientes') ? 2.5 : 2} className={isActive('/clientes') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Gestión Clientes</span>
                    </Link>
                    <Link href="/servicios" className={getNavClass('/servicios')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Mis Servicios">
                        <div className="shrink-0 flex items-center justify-center"><Briefcase size={24} strokeWidth={isActive('/servicios') ? 2.5 : 2} className={isActive('/servicios') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Mis Servicios</span>
                    </Link>

                    <div className={sectionTitleClass}>Financiero</div>
                    <Link href="/ventas" className={getNavClass('/ventas')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Cartera de Cobros">
                        <div className="shrink-0 flex items-center justify-center"><BadgeDollarSign size={24} strokeWidth={isActive('/ventas') ? 2.5 : 2} className={isActive('/ventas') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Cartera de Cobros</span>
                    </Link>
                    <Link href="/gastos" className={getNavClass('/gastos')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Gastos Operativos">
                        <div className="shrink-0 flex items-center justify-center"><Wallet size={24} strokeWidth={isActive('/gastos') ? 2.5 : 2} className={isActive('/gastos') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Gastos Operativos</span>
                    </Link>
                    <Link href="/otros-gastos" className={getNavClass('/otros-gastos')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Otros Gastos">
                        <div className="shrink-0 flex items-center justify-center"><Receipt size={24} strokeWidth={isActive('/otros-gastos') ? 2.5 : 2} className={isActive('/otros-gastos') ? activeIconColor : iconColor} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Otros Gastos</span>
                    </Link>

                    {role === 'ADMIN' && (
                        <>
                            <div className={sectionTitleClass}>Módulos</div>
                            <Link href="/usuarios" className={getNavClass('/usuarios')} onClick={() => { if (window.innerWidth < 1024) setOpen(false) }} title="Usuarios">
                                <div className="shrink-0 flex items-center justify-center"><UserCog size={24} strokeWidth={isActive('/usuarios') ? 2.5 : 2} className={isActive('/usuarios') ? activeIconColor : iconColor} /></div>
                                <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Usuarios</span>
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-[18px] pb-10 lg:pb-5 border-t border-[#eef2f6] dark:border-slate-800 shrink-0">
                    <button
                        onClick={() => { setOpen(false); onLogout(); }}
                        className="flex items-center w-full p-2.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all duration-300 ease-in-out font-bold overflow-hidden focus:outline-none"
                        title="Cerrar Sesión"
                    >
                        <div className="shrink-0 flex items-center justify-center"><LogOut size={24} strokeWidth={2.5} /></div>
                        <span className={`ml-3.5 whitespace-nowrap transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'lg:opacity-0'}`}>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );

    function isActive(path: string) {
        return pathname === path;
    }
}

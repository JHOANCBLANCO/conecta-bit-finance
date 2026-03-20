"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CalendarDays, X, Phone } from 'lucide-react';

export default function ExpiringAlertModal({ expiringPackages }: { expiringPackages: any[] }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Mostrar la alerta solo si hay paquetes y si el usuario no la ha cerrado hoy en esta sesión
        const todayStr = new Date().toISOString().split('T')[0];
        const lastSeenAlertDate = sessionStorage.getItem('expiring_alert_dismissed_date');
        
        if (expiringPackages.length > 0 && lastSeenAlertDate !== todayStr) {
            setIsOpen(true);
        }
    }, [expiringPackages]);

    if (!isOpen || expiringPackages.length === 0) return null;

    const handleDismiss = () => {
        // Al cerrar, guardamos la fecha de hoy en la sesión para que no moleste durante este día en esta sesión
        const todayStr = new Date().toISOString().split('T')[0];
        sessionStorage.setItem('expiring_alert_dismissed_date', todayStr);
        setIsOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                
                {/* Cabecera Roja Gigante */}
                <div className="bg-red-600 p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <AlertTriangle size={150} />
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white/20 p-4 rounded-full mb-4">
                            <AlertTriangle size={48} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                            ¡Atención! Ciclos por Vencer
                        </h2>
                        <p className="text-red-100 mt-2 font-medium text-lg">
                            Tienes suscripciones que caducan en 3 días o menos.
                        </p>
                    </div>

                    <button 
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors z-20"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Contenido / Lista de Alertas */}
                <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50">
                    <p className="text-slate-600 mb-6 text-center text-sm">
                        Contacta a estos clientes para ofrecerles una renovación antes de que el ciclo termine.
                    </p>
                    
                    <div className="space-y-4">
                        {expiringPackages.map((pkg, idx) => (
                            <div key={idx} className="bg-white border-2 border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                            {pkg.clientName}
                                        </h3>
                                        {pkg.clientPhone && (
                                            <p className="text-slate-500 flex items-center gap-1.5 mt-1">
                                                <Phone size={14} className="text-slate-400" /> 
                                                <a href={`https://wa.me/${pkg.clientPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
                                                    {pkg.clientPhone}
                                                </a>
                                            </p>
                                        )}
                                        <div className="mt-3">
                                            <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                Servicios Incluidos:
                                            </span>
                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {pkg.services}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-red-50 p-4 rounded-xl flex flex-col items-center justify-center min-w-[140px] text-center shrink-0">
                                        <Clock size={24} className="text-red-500 mb-2" />
                                        <span className="text-sm text-red-700 font-semibold mb-1">Faltan</span>
                                        <span className="text-3xl font-black text-red-600 leading-none">
                                            {pkg.daysRemaining === 0 ? 'HOY' : `${pkg.daysRemaining} d`}
                                        </span>
                                        <span className="text-xs font-medium text-red-500 mt-2 flex items-center justify-center gap-1">
                                            <CalendarDays size={12} />
                                            {new Date(pkg.nextBillingDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Acción */}
                <div className="bg-white border-t border-slate-200 p-6 flex justify-center">
                    <button 
                        onClick={handleDismiss}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-8 rounded-xl shadow-lg transition-all hover:scale-105"
                    >
                        Entendido, continuar al sistema
                    </button>
                </div>
            </div>
        </div>
    );
}

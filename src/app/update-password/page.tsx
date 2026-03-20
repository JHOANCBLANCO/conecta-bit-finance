"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { updateMyPassword } from '../actions';
import { getSession } from '@/lib/session';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        // Regex: 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 espacial (incluyendo el punto)
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
        if (!regex.test(password)) {
            setError("La contraseña no cumple con los requisitos de seguridad.");
            return;
        }

        startTransition(async () => {
            try {
                await updateMyPassword(password);
                window.location.href = '/login?msg=Contraseña+cambiada+con+éxito.+Por+favor,+inicia+sesión';
            } catch (err: any) {
                setError(err.message || "Error al actualizar");
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-center mb-6">
                    <div className="bg-rose-100 p-4 rounded-full text-rose-600">
                        <Lock size={32} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Cambio de Contraseña Requerido</h1>
                <p className="text-slate-500 text-center text-sm mb-6">
                    Por motivos de seguridad, un Administrador ha solicitado que renueves tu contraseña antes de continuar.
                </p>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-3 rounded-lg mb-6 text-sm flex items-center">
                        <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-rose-500 outline-none pr-10"
                                placeholder="••••••••"
                                disabled={isPending}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <ul className="text-xs text-slate-500 mt-2 space-y-1">
                            <li className={password.length >= 8 ? "text-emerald-600" : ""}>✓ Mínimo 8 caracteres</li>
                            <li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>✓ Al menos 1 mayúscula</li>
                            <li className={/[a-z]/.test(password) ? "text-emerald-600" : ""}>✓ Al menos 1 minúscula</li>
                            <li className={/\d/.test(password) ? "text-emerald-600" : ""}>✓ Al menos 1 número</li>
                            <li className={/[@$!%*?&.]/.test(password) ? "text-emerald-600" : ""}>✓ Al menos 1 carácter especial (@$!%*?&.)</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-rose-500 outline-none"
                            placeholder="••••••••"
                            disabled={isPending}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 mt-4"
                    >
                        {isPending ? 'Validando...' : 'Cambiar y Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

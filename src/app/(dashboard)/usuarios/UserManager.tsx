"use client";

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil, X, UserCog, Eye, EyeOff, ShieldAlert, Users2, Search, MoreVertical } from 'lucide-react';
import { addUser, updateUser, deleteUser } from '@/app/actions';

export default function UserManager({ initialUsers, currentUserId }: { initialUsers: any[], currentUserId: number }) {
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

    // Filtramos el usuario de soporte para que NO aparezca en los contadores ni en la tabla
    const SUPPORT_EMAIL = 'soporte';
    const displayableUsers = initialUsers.filter(u => u.email !== SUPPORT_EMAIL);

    // Compute KPIs
    const totalUsers = displayableUsers.length;
    const adminCount = displayableUsers.filter(u => u.role === 'ADMIN').length;

    const filteredUsers = displayableUsers.filter(user => {
        const query = searchQuery.toLowerCase();
        return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });

    const handleAction = (actionFn: () => Promise<any>, onSuccess?: () => void) => {
        startTransition(async () => {
            try {
                await actionFn();
                if (onSuccess) onSuccess();
            } catch (e: any) {
                alert(e.message || "Error al realizar la acción");
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cabecera Superior: KPIs + Botón Nuevo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Tarjetas KPI Superiores */}
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* KPI: Total */}
                    <div className="flex-1 sm:flex-none sm:min-w-[240px] bg-white dark:bg-slate-900 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/50 shadow-md flex items-center relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10 opacity-50" />
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-3.5 rounded-xl mr-4">
                            <UserCog size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Usuarios</p>
                            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalUsers}</h4>
                        </div>
                    </div>

                    {/* KPI: Administradores */}
                    <div className="flex-1 sm:flex-none sm:min-w-[240px] bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/50 shadow-md flex items-center relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full -z-10 opacity-50" />
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl mr-4">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Administradores</p>
                            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{adminCount}</h4>
                        </div>
                    </div>
                </div>

                {/* Botón Nuevo a la Derecha */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center transition-colors shadow-lg shadow-blue-200 shrink-0"
                >
                    <Plus size={20} className="mr-2 shrink-0" /> Nuevo Usuario
                </button>
            </div>

            {/* Buscador y Tabla de Usuarios */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col pt-2">

                {/* Search Bar Container */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o correo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] pb-32">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Correo (Email)</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Rol</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No se encontraron resultados.</td></tr>
                            ) : filteredUsers.map((user: any) => (
                                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                                        <div className="max-w-[130px] sm:max-w-none truncate" title={user.name}>
                                            {user.name}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">
                                        <div className="max-w-[140px] sm:max-w-[200px] md:max-w-none truncate" title={user.email}>
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${user.role === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'}`}>
                                            {user.role === 'ADMIN' ? 'Administrador' : 'Agente'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right relative">
                                        <button
                                            onClick={() => setActiveDropdownId(activeDropdownId === user.id ? null : user.id)}
                                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeDropdownId === user.id && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)}></div>
                                                <div className="absolute right-8 top-10 w-44 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-150">
                                                    <button
                                                        onClick={() => { setActiveDropdownId(null); setSelectedUser(user); setIsEditUserModalOpen(true); }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 flex items-center transition-colors"
                                                    >
                                                        <Pencil size={16} className="mr-2" /> Editar Acceso
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveDropdownId(null);
                                                            if (user.id === currentUserId) return alert("No puedes eliminar tu propia cuenta mientras estás en sesión.");
                                                            if (displayableUsers.filter(u => u.role === 'ADMIN').length === 1 && user.role === 'ADMIN') return alert("Debe existir al menos un usuario Administrador visible.");
                                                            handleAction(() => deleteUser(user.id));
                                                        }}
                                                        disabled={user.id === currentUserId}
                                                        className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    >
                                                        <Trash2 size={16} className="mr-2" /> Eliminar Cuenta
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL EDICION USUARIO */}
            {isEditUserModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Administrar Usuario</h3>
                            <button onClick={() => { setIsEditUserModalOpen(false); setSelectedUser(null); setShowEditPassword(false); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const pass = form.password?.value;
                            const conf = form.confirmPassword?.value;
                            if (pass && pass !== conf) {
                                alert("Las contraseñas no coinciden. Verifíquelas.");
                                return;
                            }
                            const updatePayload: any = {
                                name: form.userName.value,
                                email: form.email.value,
                                role: form.role.value
                            };
                            if (pass) {
                                updatePayload.password = pass;
                                updatePayload.mustChangePassword = form.forceReset.checked; // Solo resetea si se envía un password y se marca
                            }
                            handleAction(
                                () => updateUser(selectedUser.id, updatePayload),
                                () => { setIsEditUserModalOpen(false); setSelectedUser(null); setShowEditPassword(false); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                                <input required type="text" name="userName" defaultValue={selectedUser.name} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo de Acceso (Email)</label>
                                <input required type="email" name="email" defaultValue={selectedUser.email} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>

                            <div className="pt-2 pb-2 border-y border-slate-100 dark:border-slate-800 my-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(Dejar en blanco para no cambiar)</span></label>

                                <div className="relative">
                                    <input type={showEditPassword ? "text" : "password"} name="password" placeholder="Escriba la nueva contraseña" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                    <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none" disabled={isPending}>
                                        {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-3 mb-1">Confirmar Nueva Contraseña</label>
                                <div className="relative">
                                    <input type={showEditPassword ? "text" : "password"} name="confirmPassword" placeholder="Reescriba la contraseña" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>

                                <label className="flex items-center space-x-2 mt-4 cursor-pointer">
                                    <input type="checkbox" name="forceReset" defaultChecked={true} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Forzar cambio de contraseña en próximo inicio de sesión</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nivel de Acceso (Rol)</label>
                                <select required name="role" defaultValue={selectedUser.role} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending}>
                                    <option value="AGENT">Agente</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setIsEditUserModalOpen(false); setSelectedUser(null); setShowEditPassword(false); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL CREAR NUEVO USUARIO */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Registrar Nuevo Personal</h3>
                            <button onClick={() => { setIsCreateModalOpen(false); setShowPassword(false); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const pass = form.password.value;
                            const conf = form.confirmPassword.value;
                            if (pass !== conf) {
                                alert("Las contraseñas no coinciden. Verifíquelas.");
                                return;
                            }
                            handleAction(
                                () => addUser({ name: form.userName.value, email: form.email.value, password: pass, role: form.role.value as any }),
                                () => { setIsCreateModalOpen(false); setShowPassword(false); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                                <input required type="text" name="userName" placeholder="Ej. Alejandra Salazar" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo de Acceso (Email)</label>
                                <input required type="email" name="email" placeholder="alejandra@conecta-bit.com" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>

                            <div className="pt-2 pb-2 border-y border-slate-100 dark:border-slate-800 my-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña Inicial</label>
                                <div className="relative">
                                    <input required type={showPassword ? "text" : "password"} name="password" placeholder="Escriba la contraseña temporal" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none" disabled={isPending}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-3 mb-1">Confirmar Contraseña Inicial</label>
                                <div className="relative">
                                    <input required type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Reescriba la contraseña temporal" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>

                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                    Al iniciar por primera vez, el sistema exigirá que el usuario la reemplace obligatoriamente.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nivel de Acceso (Rol)</label>
                                <select required name="role" defaultValue="AGENT" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium" disabled={isPending}>
                                    <option value="AGENT">Agente</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setIsCreateModalOpen(false); setShowPassword(false); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center transition-colors disabled:opacity-50">
                                    <Plus size={18} className="mr-1.5" /> Crear Cuenta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { addService, deleteService, updateService } from '@/app/actions';

export default function ServiceManager({ initialServices, role }: { initialServices: any[], role: string }) {
    const [isPending, startTransition] = useTransition();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Agregar Nuevo Servicio</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as any;
                        handleAction(() => addService({ name: form.serviceName.value, cost: Number(form.cost.value), observations: form.observations.value }));
                        form.reset();
                    }} className="flex flex-col md:flex-row gap-4">
                        <input required type="text" name="serviceName" placeholder="Nombre del servicio (Ej. Paquete Minutos)" className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                        <input required type="number" name="cost" placeholder="Valor de Venta ($)" min="0" className="w-full md:w-64 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                        <input type="text" name="observations" placeholder="Observaciones (Opcional)" className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                        <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50">
                            <Plus size={20} className="mr-2" /> Agregar
                        </button>
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Servicio</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Observaciones</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Valor de Venta (Defecto)</th>
                                {role === 'ADMIN' && <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {initialServices.length === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay servicios registrados.</td></tr>
                            ) : initialServices.map((service: any) => (
                                <tr key={service.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{service.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{service.observations || '-'}</td>
                                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(service.cost)}</td>
                                    {role === 'ADMIN' && (
                                        <td className="p-4 text-right">
                                            <button onClick={() => { setSelectedService(service); setIsEditModalOpen(true); }} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-2" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => handleAction(() => deleteService(service.id))} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL EDICION SERVICIO */}
            {isEditModalOpen && selectedService && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Servicio</h3>
                            <button onClick={() => { setIsEditModalOpen(false); setSelectedService(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700/50 mb-4">
                            <strong>Nota:</strong> Modificar el nombre o costo base de este servicio <strong>no alterará</strong> las ventas que ya hayan sido registradas con los valores antiguos.
                        </p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            handleAction(
                                () => updateService(selectedService.id, { name: form.serviceName.value, cost: Number(form.cost.value), observations: form.observations.value }),
                                () => { setIsEditModalOpen(false); setSelectedService(null); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio</label>
                                <input required type="text" name="serviceName" defaultValue={selectedService.name} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observaciones</label>
                                <input type="text" name="observations" defaultValue={selectedService.observations} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Venta Base ($)</label>
                                <input required type="number" name="cost" min="0" defaultValue={selectedService.cost} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setSelectedService(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

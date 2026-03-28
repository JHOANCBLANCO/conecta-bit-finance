"use client";

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { addService, deleteService, updateService } from '@/app/actions';

const ITEMS_PER_PAGE = 10;

export default function ServiceManager({ initialServices, role }: { initialServices: any[], role: string }) {
    const [isPending, startTransition] = useTransition();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Filter + paginate
    const filtered = initialServices.filter((s: any) => {
        const term = searchTerm.toLowerCase();
        return (
            s.name.toLowerCase().includes(term) ||
            (s.code && s.code.toLowerCase().includes(term)) ||
            (s.observations && s.observations.toLowerCase().includes(term))
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedServices = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Catálogo de Servicios</h3>
                        <p className="text-sm text-slate-500">{filtered.length} servicio{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-initial">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar servicio..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-60"
                            />
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm whitespace-nowrap shrink-0">
                            <Plus size={20} className="mr-2" /> Agregar Servicio
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Código</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Servicio</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Observaciones</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Valor de Venta</th>
                                {role === 'ADMIN' && <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {paginatedServices.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    {searchTerm ? 'No se encontraron servicios con esa búsqueda.' : 'No hay servicios registrados.'}
                                </td></tr>
                            ) : paginatedServices.map((service: any) => (
                                <tr key={service.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-sm">{service.code || <span className="text-slate-300">-</span>}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{service.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm max-w-[200px] truncate">{service.observations || '-'}</td>
                                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(service.cost)}</td>
                                    {role === 'ADMIN' && (
                                        <td className="p-4 text-right">
                                            <button onClick={() => { setSelectedService(service); setIsEditModalOpen(true); }} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => {
                                                if (confirm(`¿Eliminar el servicio "${service.name}"? Esta acción no se puede deshacer.`)) {
                                                    handleAction(() => deleteService(service.id));
                                                }
                                            }} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Página {safePage} de {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL AGREGAR SERVICIO */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Agregar Servicio</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            handleAction(
                                () => addService({
                                    name: form.serviceName.value,
                                    cost: Number(form.cost.value),
                                    observations: form.observations.value || undefined,
                                    code: form.serviceCode.value || undefined
                                }),
                                () => setIsAddModalOpen(false)
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código del Servicio (Opcional)</label>
                                <input type="text" name="serviceCode" placeholder="Ej. SRV-001" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio</label>
                                <input required type="text" name="serviceName" placeholder="Ej. Paquete Minutos" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observaciones (Opcional)</label>
                                <input type="text" name="observations" placeholder="Anotaciones extra" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor de Venta ($)</label>
                                <input required type="number" name="cost" placeholder="0.00" min="0" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50">
                                    <Plus size={18} className="mr-1.5" /> Registrar Servicio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                () => updateService(selectedService.id, { name: form.serviceName.value, cost: Number(form.cost.value), observations: form.observations.value || undefined, code: form.serviceCode.value || undefined }),
                                () => { setIsEditModalOpen(false); setSelectedService(null); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código del Servicio</label>
                                <input type="text" name="serviceCode" defaultValue={selectedService.code || ''} placeholder="Ej. SRV-001" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio</label>
                                <input required type="text" name="serviceName" defaultValue={selectedService.name} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observaciones</label>
                                <input type="text" name="observations" defaultValue={selectedService.observations || ''} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
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

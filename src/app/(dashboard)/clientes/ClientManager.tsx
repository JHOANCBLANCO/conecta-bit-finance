"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Briefcase, FileText, CheckCircle2, ChevronDown, ListChecks, X, Power, Search, History, Copy, Download, Pencil, Activity, Trash, Upload, FileUp, Eye, StickyNote } from 'lucide-react';
import { addClient, deleteClient, updateClient, getClientSales, addSale, getClientPackage, upsertPackage, getAllPackagesSummary, togglePackageItemStatus, deleteSale, updateSale, uploadInvoiceFile, deleteInvoiceFile } from '@/app/actions';

export default function ClientManager({ initialClients, services, role }: { initialClients: any[], services: any[], role: string }) {
    const [isPending, startTransition] = useTransition();
    const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
    
    // Unified Modal State
    const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [clientPackage, setClientPackage] = useState<any>(null);
    const [clientHistory, setClientHistory] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [useSameEmail, setUseSameEmail] = useState(true);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Assign Service State inside details
    const [assignServicesList, setAssignServicesList] = useState<{service: any, customPrice: number | '', isActive: boolean, details?: string, quantity?: number}[]>([]);

    const [packagesSummary, setPackagesSummary] = useState<any[]>([]);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

    // Manual Sale State
    // Manual Sale State
    const [isCreateSaleModalOpen, setIsCreateSaleModalOpen] = useState(false);
    const [saleItems, setSaleItems] = useState<{serviceId: string, price: number, details?: string, observations?: string}[]>([{serviceId: '', price: 0, details: '', observations: ''}]);
    const [applyIva, setApplyIva] = useState(false);
    const [applyReteIva, setApplyReteIva] = useState(false);
    const [notesValue, setNotesValue] = useState("");
    
    // Edit & Upload Sale State
    const [isEditSaleModalOpen, setIsEditSaleModalOpen] = useState(false);
    const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<any>(null);
    const [saleDeleteId, setSaleDeleteId] = useState<number | null>(null);
    const [isUploadingForSaleId, setIsUploadingForSaleId] = useState<number | null>(null);
    const uploadSaleIdRef = React.useRef<number | null>(null);

    // View Invoice Details State
    const [isInvoiceDetailsModalOpen, setIsInvoiceDetailsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    useEffect(() => {
        loadPackagesSummary();
    }, []);

    const loadPackagesSummary = async () => {
        try {
            const summary = await getAllPackagesSummary();
            setPackagesSummary(summary);
        } catch (error) {
            console.error("Failed to fetch packages summary", error);
        }
    };

    const loadClientDetails = async (clientId: number) => {
        setDetailsLoading(true);
        try {
            const [history, pkg] = await Promise.all([
                getClientSales(clientId),
                getClientPackage(clientId)
            ]);
            setClientHistory(history);
            setClientPackage(pkg);
            if (pkg) {
                setAssignServicesList(pkg.items.map((i: any) => ({
                    service: i.service,
                    customPrice: i.customPrice,
                    isActive: i.isActive,
                    details: i.details || ''
                })));
            } else {
                setAssignServicesList([]);
            }
        } catch (e: any) {
            alert(e.message || "Error al cargar detalles del cliente");
        }
        setDetailsLoading(false);
    };

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !isUploadingForSaleId) return;
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { alert("El archivo no puede pesar más de 5MB"); return; }
        try {
            const formData = new FormData();
            formData.append("file", file);
            await uploadInvoiceFile(isUploadingForSaleId, formData);
            if (selectedClient) loadClientDetails(selectedClient.id);
        } catch (err: any) { alert(err.message || "Error al subir pdf"); }
        finally { setIsUploadingForSaleId(null); }
    };

    useEffect(() => {
        if (isUploadingForSaleId && fileInputRef.current) fileInputRef.current.click();
    }, [isUploadingForSaleId]);

    const filteredClients = initialClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.nit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredHistory = clientHistory.filter(sale => {
        if (!historyStartDate && !historyEndDate) return true;
        const saleDate = new Date(sale.date);
        const start = historyStartDate ? new Date(historyStartDate) : new Date(0);
        const end = historyEndDate ? new Date(historyEndDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    const downloadCSV = () => {
        if (!selectedClient || filteredHistory.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const headers = [
            "Empresa", "Cód. Cliente", "# Factura", "Servicio", "Detalle Servicios", "Fecha de Factura",
            "Valor de la Factura", "Pago Fecha", "Total Que Deben Pagar",
            "Lo Que Han Pagado", "Pendiente", "Retiene (Col)"
        ];

        const csvRows = [headers.join(";")];

        filteredHistory.forEach((sale: any) => {
            const debt = sale.salePrice - sale.amountPaid;

            let lastPaymentDateStr = '-';
            if (sale.payments && sale.payments.length > 0) {
                const sortedPayments = [...sale.payments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                lastPaymentDateStr = new Date(sortedPayments[0].date).toLocaleDateString();
            }

            const detallesSeguros = sale.notes ? sale.notes.replace(/"/g, '""').replace(/\n/g, ' ') : '-';

            const row = [
                `"${selectedClient.name}"`,
                `"${selectedClient.code || '-'}"`,
                `"${sale.invoiceNumber ? sale.invoiceNumber.toUpperCase() : '-'}"`,
                `"${sale.service?.name || sale.serviceName}"`,
                `"${detallesSeguros}"`,
                `"${new Date(sale.date).toLocaleDateString()}"`,
                `"${formatCurrency(sale.salePrice)}"`,
                `"${lastPaymentDateStr}"`,
                `"${formatCurrency(sale.salePrice)}"`,
                `"${formatCurrency(sale.amountPaid)}"`,
                `"${formatCurrency(debt)}"`,
                `"RETIENE"`
            ];

            csvRows.push(row.join(";"));
        });

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Historial_Servicios_${selectedClient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por Empresa, Encargado, NIT o Código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddClientModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                        <Plus size={20} className="mr-2" /> Agregar Cliente
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Código</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Empresa</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Encargado</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Contacto</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">NIT</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Observaciones</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {filteredClients.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">No se encontraron clientes.</td></tr>
                            ) : filteredClients.map((client: any) => (
                                <tr key={client.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-sm">{client.code || '-'}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{client.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{client.contact || '-'}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{client.phone || '-'}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{client.nit || '-'}</td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400 text-sm max-w-[150px] truncate" title={client.observations || ''}>
                                        {client.observations ? (
                                            <span 
                                                className="cursor-pointer border-b border-dashed border-slate-400 hover:text-indigo-600 transition-colors"
                                                onClick={() => {
                                                    if (role === 'ADMIN') {
                                                        setSelectedClient(client);
                                                        setUseSameEmail(client.notificationEmail === client.billingEmail);
                                                        setIsEditClientModalOpen(true);
                                                    } else {
                                                        alert(client.observations);
                                                    }
                                                }}
                                            >
                                                {client.observations.length > 20 ? client.observations.substring(0, 20) + '...' : client.observations}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => {
                                            setSelectedClient(client);
                                            setIsClientDetailsModalOpen(true);
                                            loadClientDetails(client.id);
                                        }} className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-2" title="Expediente del Cliente (Paquete y Facturación)">
                                            <Briefcase size={18} />
                                        </button>
                                        {role === 'ADMIN' && (
                                            <>
                                                <button onClick={() => {
                                                    setSelectedClient(client);
                                                    setUseSameEmail(client.notificationEmail === client.billingEmail);
                                                    setIsEditClientModalOpen(true);
                                                }} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors mr-2" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleAction(() => deleteClient(client.id))} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL REGISTRO CLIENTE */}
            {isAddClientModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Registrar Nuevo Cliente</h3>
                            <button onClick={() => { setIsAddClientModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            handleAction(
                                () => addClient({
                                    name: form.clientName.value,
                                    phone: form.phone.value,
                                    contact: form.contact.value,
                                    nit: form.nit.value,
                                    country: form.country?.value || undefined,
                                    city: form.city?.value || undefined,
                                    observations: form.observations?.value || undefined,
                                    code: form.code.value || undefined,
                                    notificationEmail: form.notificationEmail.value || undefined,
                                    billingEmail: useSameEmail ? form.notificationEmail.value : form.billingEmail.value || undefined,
                                    hasIva: form.hasIva?.checked || false,
                                }),
                                () => { setIsAddClientModalOpen(false); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                                <input required type="text" name="clientName" placeholder="Nombre de la empresa" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Encargado</label>
                                <input type="text" name="contact" placeholder="Nombre completo" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Celular</label>
                                    <input type="text" name="phone" placeholder="Número" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
                                    <input type="text" name="nit" placeholder="NIT (Opcional)" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                                    <input type="text" name="country" placeholder="Ej. Colombia" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                                    <input type="text" name="city" placeholder="Ej. Medellín" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                                <textarea name="observations" rows={2} placeholder="Letras y apuntes importantes del cliente..." className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" disabled={isPending} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Código Cliente</label>
                                    <input type="text" name="code" placeholder="Generación automática" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Notificaciones</label>
                                    <input type="email" name="notificationEmail" placeholder="correo@ejemplo.com" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            </div>

                            <div className="flex items-center mt-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="useSameEmailAdd"
                                    checked={useSameEmail}
                                    onChange={(e) => setUseSameEmail(e.target.checked)}
                                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="useSameEmailAdd" className="text-sm text-slate-600 cursor-pointer">Usar este mismo correo para Facturación</label>
                            </div>

                            {!useSameEmail && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo de Facturación</label>
                                    <input type="email" name="billingEmail" placeholder="facturacion@ejemplo.com" className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            )}

                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setIsAddClientModalOpen(false); }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center transition-all shadow-sm disabled:opacity-50">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDICION CLIENTE */}
            {isEditClientModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Cliente</h3>
                            <button onClick={() => { setIsEditClientModalOpen(false); setSelectedClient(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            handleAction(
                                () => updateClient(selectedClient.id, {
                                    name: form.clientName.value,
                                    phone: form.phone.value,
                                    contact: form.contact.value,
                                    nit: form.nit.value,
                                    country: form.country?.value || undefined,
                                    city: form.city?.value || undefined,
                                    observations: form.observations?.value || undefined,
                                    code: form.code.value || undefined,
                                    notificationEmail: form.notificationEmail.value || undefined,
                                    billingEmail: useSameEmail ? form.notificationEmail.value : form.billingEmail.value || undefined,
                                    hasIva: form.hasIva?.checked || false,
                                    hasReteIva: form.hasReteIva?.checked || false
                                }),
                                () => { setIsEditClientModalOpen(false); setSelectedClient(null); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                                <input required type="text" name="clientName" defaultValue={selectedClient.name} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Encargado</label>
                                <input type="text" name="contact" defaultValue={selectedClient.contact} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Celular</label>
                                    <input type="text" name="phone" defaultValue={selectedClient.phone} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
                                    <input type="text" name="nit" defaultValue={selectedClient.nit} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                                    <input type="text" name="country" defaultValue={selectedClient.country} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                                    <input type="text" name="city" defaultValue={selectedClient.city} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                                <textarea name="observations" rows={3} defaultValue={selectedClient.observations} placeholder="Letras y apuntes importantes del cliente..." className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" disabled={isPending} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Código Cliente</label>
                                    <input type="text" name="code" defaultValue={selectedClient.code} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Notificaciones</label>
                                    <input type="email" name="notificationEmail" defaultValue={selectedClient.notificationEmail} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            </div>

                            <div className="flex items-center mt-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="useSameEmailEdit"
                                    checked={useSameEmail}
                                    onChange={(e) => setUseSameEmail(e.target.checked)}
                                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="useSameEmailEdit" className="text-sm text-slate-600 cursor-pointer">Usar este mismo correo para Facturación</label>
                            </div>

                            {!useSameEmail && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo de Facturación</label>
                                    <input type="email" name="billingEmail" defaultValue={selectedClient.billingEmail} className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" disabled={isPending} />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setIsEditClientModalOpen(false); setSelectedClient(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors" disabled={isPending}>
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

            {/* UNIFIED MODAL: EXPEDIENTE DEL CLIENTE (PAQUETE + HISTORIAL) */}
            {isClientDetailsModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-[1600px] xl:w-[95vw] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <Briefcase className="mr-2 text-indigo-600 dark:text-indigo-400" />
                                    Expediente del Cliente
                                </h3>
                                <div className="flex items-center text-sm text-slate-500 mt-1">
                                    <span>
                                        Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClient.name}</span> {selectedClient.code && `(${selectedClient.code})`}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => { setIsClientDetailsModalOpen(false); setSelectedClient(null); }} className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {detailsLoading ? (
                            <div className="flex-1 flex justify-center items-center py-20 text-slate-500 flex-col gap-2">
                                <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p>Cargando datos del cliente...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-6">
                                
                                {/* COLUMNA IZQUIERDA: PAQUETE DE SUSCRIPCIÓN */}
                                <div className="lg:w-[380px] flex-shrink-0 flex flex-col gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-[16px] font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center">
                                            <Activity className="mr-2" size={18} /> Paquete Mensual
                                        </h4>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const form = e.target as HTMLFormElement;
                                            
                                            startTransition(async () => {
                                                try {
                                                    await upsertPackage({
                                                        clientId: selectedClient.id,
                                                        isActive: form.isActive?.checked ?? true,
                                                        cycleStart: clientPackage?.cycleStart || 1,
                                                        cycleEnd: clientPackage?.cycleEnd || 30,
                                                        paymentDeadlineDays: clientPackage?.paymentDeadlineDays || 5,
                                                        items: assignServicesList.map(item => ({
                                                            serviceId: item.service.id,
                                                            customPrice: Number(item.customPrice),
                                                            details: item.details || undefined,
                                                            quantity: item.quantity || 1,
                                                            isActive: item.isActive
                                                        }))
                                                    });
                                                    // Recargar datos y global
                                                    await loadClientDetails(selectedClient.id);
                                                    loadPackagesSummary(); 
                                                    alert(`¡Suscripción de ${selectedClient.name} guardada correctamente!`);
                                                } catch (err: any) {
                                                    alert(err.message || "Error al realizar la acción");
                                                }
                                            });
                                        }} className="space-y-4">
                                            
                                            {/* PAQUETE ACTIVO Y DÍA DE CORTE */}
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-xl space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <input type="checkbox" name="isActive" defaultChecked={clientPackage?.isActive ?? true} id="isActivePkgUnified" className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" disabled={isPending}/>
                                                        <label htmlFor="isActivePkgUnified" className="ml-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">PAQUETE GENERAL ACTIVO</label>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Día de Corte Mensual</label>
                                                    <select 
                                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm font-medium" 
                                                        disabled={isPending}
                                                        defaultValue={clientPackage?.cycleStart || 1}
                                                        onChange={(e) => {
                                                            if (clientPackage) {
                                                                setClientPackage({ ...clientPackage, cycleStart: Number(e.target.value) });
                                                            }
                                                        }}
                                                    >
                                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                            <option key={day} value={day}>Día {day}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-slate-500 mt-1.5">Día del mes en que inician los ciclos de cobro (1-31).</p>
                                                </div>

                                                {(clientPackage?.cycleStart !== undefined) && (
                                                    <div className="bg-white/60 dark:bg-slate-800/60 p-2.5 rounded border border-indigo-100/50 dark:border-indigo-800/30">
                                                        <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                                                            <span className="font-bold opacity-70 uppercase tracking-widest text-[9px] block mb-0.5">Siguiente Factura (Aprox)</span>
                                                            {(() => {
                                                                const cycleStart = clientPackage.cycleStart || 1;
                                                                const today = new Date();
                                                                today.setHours(0,0,0,0);
                                                                
                                                                let year = today.getFullYear();
                                                                let month = today.getMonth();
                                                                let maxDays = new Date(year, month + 1, 0).getDate();
                                                                let clampedDay = Math.min(cycleStart, maxDays);
                                                                
                                                                let nextDate = new Date(year, month, clampedDay);
                                                                if (nextDate <= today) {
                                                                    month++;
                                                                    if (month > 11) { month = 0; year++; }
                                                                    maxDays = new Date(year, month + 1, 0).getDate();
                                                                    clampedDay = Math.min(cycleStart, maxDays);
                                                                    nextDate = new Date(year, month, clampedDay);
                                                                }
                                                                return nextDate.toLocaleDateString();
                                                            })()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selector de Servicios */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Añadir Servicio al Paquete</label>
                                                <select 
                                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" 
                                                    disabled={isPending}
                                                    onChange={(e) => {
                                                        const s = services.find((serv) => serv.id === Number(e.target.value));
                                                        if (s) {
                                                            setAssignServicesList(prev => [...prev, { service: s, customPrice: s.cost, isActive: true, details: '', quantity: 1 }]);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Selecciona servicio...</option>
                                                    {services.map((s) => (
                                                        <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.cost)})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Lista de Servicios en el Paquete */}
                                            {assignServicesList.length > 0 && (
                                                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
                                                    {assignServicesList.map((item, idx) => (
                                                        <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-2 relative shadow-sm transition-colors ${item.isActive ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                                            
                                                            <div className="flex justify-between items-start">
                                                                <div className="pr-6">
                                                                    <p className={`text-sm font-bold leading-tight ${item.isActive ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 line-through'}`}>{item.service.name}</p>
                                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Base: {formatCurrency(item.service.cost)}</p>
                                                                </div>
                                                                
                                                                {/* Botones de acción (Eliminar y Activar/Desactivar) */}
                                                                <div className="flex items-center gap-2 absolute top-2 right-2">
                                                                    <button type="button" onClick={() => {
                                                                        setAssignServicesList(prev => {
                                                                            const copy = [...prev];
                                                                            copy[idx] = { ...copy[idx], isActive: !copy[idx].isActive };
                                                                            return copy;
                                                                        });
                                                                    }} className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors focus:outline-none ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.isActive ? "Pausar este servicio" : "Activar este servicio"}>
                                                                        <span className={`${item.isActive ? 'translate-x-[18px]' : 'translate-x-1'} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} />
                                                                    </button>

                                                                    <button type="button" onClick={() => setAssignServicesList(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500 transition-colors" title="Quitar permanentemente">
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex gap-3">
                                                                <div className="w-24 shrink-0">
                                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Cantidad:</label>
                                                                    <input 
                                                                        type="number" 
                                                                        required 
                                                                        min="1"
                                                                        value={item.quantity || 1}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value ? Number(e.target.value) : 1;
                                                                            setAssignServicesList(prev => {
                                                                                const copy = [...prev];
                                                                                copy[idx].quantity = val;
                                                                                // Update the cost automatically based on base cost*quantity, unless user edits it later
                                                                                copy[idx].customPrice = copy[idx].service.cost * val;
                                                                                return copy;
                                                                            });
                                                                        }}
                                                                        className={`w-full rounded-md border p-1.5 focus:ring-2 focus:ring-indigo-500 font-bold text-sm outline-none text-center ${item.isActive ? 'bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100' : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                                                                        disabled={isPending || !item.isActive}
                                                                    />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Costo cliente (Total):</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">$</span>
                                                                        <input 
                                                                            type="number" 
                                                                            required 
                                                                            value={item.customPrice}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value ? Number(e.target.value) : '';
                                                                                setAssignServicesList(prev => {
                                                                                    const copy = [...prev];
                                                                                    copy[idx].customPrice = val;
                                                                                    return copy;
                                                                                });
                                                                            }}
                                                                            className={`w-full rounded-md border p-1.5 pl-7 focus:ring-2 focus:ring-indigo-500 font-bold text-sm outline-none ${item.isActive ? 'bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100' : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                                                                            disabled={isPending || !item.isActive}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-1">
                                                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Detalles (Ej. Líneas, dominios, notas):</label>
                                                                <textarea
                                                                    rows={2}
                                                                    placeholder="Pega aquí los números, comentarios..."
                                                                    value={item.details || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setAssignServicesList(prev => {
                                                                            const copy = [...prev];
                                                                            copy[idx].details = val;
                                                                            return copy;
                                                                        });
                                                                    }}
                                                                    className={`w-full rounded-md border p-1.5 focus:ring-2 focus:ring-indigo-500 text-[13px] outline-none resize-y min-h-[50px] ${item.isActive ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400' : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 placeholder:text-transparent'}`}
                                                                    disabled={isPending || !item.isActive}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {role === 'ADMIN' && (
                                                        <div className="bg-indigo-900 border border-indigo-800 p-3 rounded-lg flex justify-between items-center mt-3 text-white shadow-inner">
                                                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Total a Facturar:</span>
                                                            <span className="text-lg font-black">
                                                                {formatCurrency(assignServicesList.filter(i => i.isActive).reduce((acc, curr) => acc + (Number(curr.customPrice) || 0), 0))}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}



                                            <div className="pt-2">
                                                <button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50">
                                                    <CheckCircle2 size={18} className="mr-2"/> Guardar Suscripción
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: HISTORIAL DE FACTURAS (SOLO ADMIN) */}
                                {role === 'ADMIN' ? (
                                    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-end justify-between shrink-0">
                                        <div>
                                            <h4 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                                                <FileText className="mr-2 text-slate-500 dark:text-slate-400" size={18} /> Historial de Facturación
                                            </h4>
                                            <div className="flex gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Desde</label>
                                                    <input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="rounded-md border-slate-300 border p-1.5 text-xs outline-none focus:border-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hasta</label>
                                                    <input type="date" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="rounded-md border-slate-300 border p-1.5 text-xs outline-none focus:border-blue-500" />
                                                </div>
                                                {(historyStartDate || historyEndDate) && (
                                                    <div className="flex items-end pb-1">
                                                        <button onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }} className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors">
                                                            Limpiar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button onClick={() => { 
                                                const activeServices = assignServicesList.filter(i => i.isActive);
                                                if(activeServices.length > 0) {
                                                    setSaleItems(activeServices.map(i => ({ serviceId: i.service.id.toString(), price: Number(i.customPrice) || 0, details: i.details || '', observations: '' })));
                                                } else {
                                                    setSaleItems([{serviceId: '', price: 0, details: '', observations: ''}]);
                                                }
                                                setApplyIva(Boolean(selectedClient?.hasIva));
                                                setApplyReteIva(Boolean(selectedClient?.hasReteIva));
                                                setIsCreateSaleModalOpen(true); 
                                            }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm h-fit">
                                                <Plus size={16} className="mr-2" /> Nueva Factura
                                            </button>
                                            <button onClick={() => {
                                                if (!selectedClient) return;
                                                // Create a hidden anchor to trigger download
                                                const a = document.createElement('a');
                                                a.href = `/api/download-all-invoices/${selectedClient.id}`;
                                                // Using _blank helps if the browser tries to block the download or open it inline
                                                a.target = '_blank';
                                                a.download = `Facturas_${selectedClient.name}.zip`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }} disabled={filteredHistory.length === 0} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-50 h-fit" title="Descargar todos los archivos PDF en un formato comprimido .zip">
                                                <Download size={16} className="mr-2" /> Descargar Facturas
                                            </button>
                                            <button onClick={downloadCSV} disabled={filteredHistory.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-50 h-fit">
                                                <FileText size={16} className="mr-2" /> Exportar CSV
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto bg-slate-50 p-4">
                                        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                                                        <th className="p-3 font-semibold border-b border-slate-200"># Factura</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200">Servicio</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200">Fecha</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200">Valor</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200">Pagado</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200">Deuda</th>
                                                        <th className="p-3 font-semibold border-b border-slate-200 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {filteredHistory.length === 0 ? (
                                                        <tr><td colSpan={7} className="p-10 text-center text-slate-500">No hay registros de facturación.</td></tr>
                                                    ) : filteredHistory.map((sale: any, index: number) => {
                                                        const debt = sale.salePrice - sale.amountPaid;
                                                        
                                                        // Estado visual simple (Pagado, Parcial, Pendiente)
                                                        let statusDot = "bg-rose-500";
                                                        if (debt <= 0) statusDot = "bg-emerald-500";
                                                        else if (sale.amountPaid > 0) statusDot = "bg-amber-500";

                                                        return (
                                                            <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <td className="p-3 font-medium text-slate-700">
                                                                    <div className="flex items-center">
                                                                        <div className={`w-2 h-2 rounded-full mr-2 ${statusDot}`}></div>
                                                                        {sale.invoiceNumber ? sale.invoiceNumber.toUpperCase() : <span className="text-slate-400 italic">S/N</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-slate-600 max-w-[200px]" title={sale.service?.name || sale.serviceName}>
                                                                    <div className="truncate font-medium">{sale.service?.name || sale.serviceName}</div>
                                                                    {sale.notes && <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={sale.notes}>{sale.notes}</div>}
                                                                </td>
                                                                <td className="p-3 text-slate-600">
                                                                    {new Date(sale.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="p-3 font-medium text-slate-800">
                                                                    {formatCurrency(sale.salePrice)}
                                                                </td>
                                                                <td className="p-3 font-medium text-emerald-600">
                                                                    {formatCurrency(sale.amountPaid)}
                                                                </td>
                                                                <td className="p-3 font-medium text-rose-600">
                                                                    {formatCurrency(debt)}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {sale.invoiceFileUrl ? (
                                                                            <div className="flex bg-emerald-50 rounded-lg overflow-hidden border border-emerald-100">
                                                                                <a href={sale.invoiceFileUrl} target="_blank" rel="noreferrer" className="p-2 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Ver PDF">
                                                                                    <FileText size={16} />
                                                                                </a>
                                                                                <button onClick={(e) => { e.preventDefault(); handleAction(() => deleteInvoiceFile(sale.id, sale.invoiceFileUrl), () => loadClientDetails(selectedClient.id)); }} className="p-2 text-rose-500 hover:bg-rose-100 transition-colors border-l border-emerald-100" title="Eliminar PDF">
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button onClick={() => {
                                                                                setIsUploadingForSaleId(sale.id);
                                                                                uploadSaleIdRef.current = sale.id;
                                                                                setTimeout(() => fileInputRef.current?.click(), 0);
                                                                            }} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" title="Subir PDF">
                                                                                <Upload size={16} />
                                                                            </button>
                                                                        )}
                                                                        
                                                                        <button onClick={() => { setSelectedSaleForEdit(sale); setIsEditSaleModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                                                                            <Pencil size={16} />
                                                                        </button>
                                                                        <button onClick={() => setSaleDeleteId(sale.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Eliminar">
                                                                                <Trash size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                    <div className="flex-1 flex flex-col justify-center items-center h-full bg-slate-50 border border-slate-200 rounded-xl p-8 shadow-sm text-center">
                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Registrar Nuevo Cobro</h3>
                                        <p className="text-sm text-slate-500 mb-6 max-w-sm">
                                            Usa este botón para registrar pagos o crear nuevas facturas para este cliente.
                                        </p>
                                        <button onClick={() => { 
                                            const activeServices = assignServicesList.filter(i => i.isActive);
                                            if(activeServices.length > 0) {
                                                setSaleItems(activeServices.map(i => ({ serviceId: i.service.id.toString(), price: Number(i.customPrice) || 0, details: i.details || '', observations: '' })));
                                                
                                                // GENERATE SMART NOTES (Auto-Gen)
                                                let generatedNotes = `Facturación de Suscripción - ${new Date().toLocaleDateString('es-CO')}\n\n`;
                                                generatedNotes += activeServices.map(i => {
                                                    const q = i.quantity || 1;
                                                    const baseLine = `- ${q}x ${i.service.name} (Base Total: ${formatCurrency(Number(i.customPrice) || 0)})`;
                                                    if (i.details && i.details.trim() !== '') {
                                                        return `${baseLine}\n  Detalles: ${i.details.trim()}`;
                                                    }
                                                    return baseLine;
                                                }).join('\n\n');
                                                
                                                setNotesValue(generatedNotes);
                                            } else {
                                                setSaleItems([{serviceId: '', price: 0, details: '', observations: ''}]);
                                                setNotesValue('');
                                            }
                                            setApplyIva(Boolean(selectedClient?.hasIva));
                                            setApplyReteIva(Boolean(selectedClient?.hasReteIva));
                                            setIsCreateSaleModalOpen(true); 
                                        }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center transition-colors shadow-md">
                                            <Plus size={20} className="mr-2" /> Agregar Factura / Pago
                                        </button>
                                    </div>
                                )}

                            </div>
                        )}

                    </div>
                </div>
            )}


            {isCreateSaleModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] py-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-6xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-full pr-4">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Registrar Factura <span className="text-blue-600">#{selectedClient.code || ''}</span></h3>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedClient.name}</p>
                                        <div className="flex flex-wrap text-xs text-slate-500 gap-x-4 gap-y-1 mt-1">
                                            {selectedClient.nit && <span><span className="font-medium text-slate-400">NIT/CC:</span> {selectedClient.nit}</span>}
                                            {selectedClient.phone && <span><span className="font-medium text-slate-400">Tel:</span> {selectedClient.phone}</span>}
                                            {selectedClient.contact && <span><span className="font-medium text-slate-400">Contacto:</span> {selectedClient.contact}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <button 
                                            type="button"
                                            onClick={() => setApplyIva(!applyIva)}
                                            className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm ${applyIva ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-400' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                        >
                                            {applyIva ? <CheckCircle2 size={14} className="mr-1.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-500 mr-1.5" />}
                                            {applyIva ? 'Aplica IVA (19%)' : 'No aplica IVA'}
                                        </button>
                                        
                                        {applyIva && (
                                            <button 
                                                type="button"
                                                onClick={() => setApplyReteIva(!applyReteIva)}
                                                className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm ${applyReteIva ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-400' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                            >
                                                {applyReteIva ? <CheckCircle2 size={14} className="mr-1.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-500 mr-1.5" />}
                                                {applyReteIva ? 'Aplica ReteIVA (15%)' : 'No retiene'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setIsCreateSaleModalOpen(false); setSaleItems([{serviceId: '', price: 0, details: '', observations: ''}]); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors shrink-0"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            
                            // Filter valid numeric items
                            const validItems = saleItems.filter(i => i.serviceId !== '' && i.price >= 0).map(i => ({ serviceId: Number(i.serviceId), price: Number(i.price), details: i.details || undefined, observations: i.observations || undefined }));
                            if (validItems.length === 0) {
                                alert("Por favor selecciona al menos un servicio.");
                                return;
                            }
                            const notesValue = form.notes.value;
                            const cycleStartDateValue = form.cycleStartDate?.value;
                            const cycleEndDateValue = form.cycleEndDate?.value;

                            handleAction(() => addSale({
                                clientId: selectedClient.id,
                                items: validItems,
                                amountPaid: 0,
                                notes: notesValue,
                                invoiceNumber: form.invoiceNumber.value || undefined,
                                applyIva: applyIva,
                                applyReteIva: applyReteIva,
                                date: form.date.value ? new Date(form.date.value + 'T12:00:00') : undefined, 
                                paymentDeadline: form.paymentDeadline.value ? new Date(form.paymentDeadline.value + 'T12:00:00') : undefined,
                                cycleStartDate: cycleStartDateValue ? new Date(cycleStartDateValue + 'T12:00:00') : undefined,
                                cycleEndDate: cycleEndDateValue ? new Date(cycleEndDateValue + 'T12:00:00') : undefined
                            }), () => {
                                setIsCreateSaleModalOpen(false);
                                setSaleItems([{serviceId: '', price: 0, details: '', observations: ''}]);
                                loadClientDetails(selectedClient.id); 
                            });
                        }} className="flex flex-col flex-1 overflow-hidden min-h-0">

                            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha de Emisión (Real)</label>
                                    <input required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" disabled={isPending} />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha de Vencimiento (Opcional)</label>
                                    <input type="date" name="paymentDeadline" className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" disabled={isPending} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Número de Factura (Opcional)</label>
                                    <input type="text" name="invoiceNumber" placeholder="Ej. FVE-999" className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 uppercase bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" disabled={isPending} />
                                </div>
                            </div>

                            <div className="lg:col-span-4 mb-2">
                                <div className="flex items-center mb-3">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ítems de la Factura</label>
                                </div>
                                {saleItems.map((item, index) => (
                                    <div key={index} className="flex flex-col md:flex-row gap-3 mb-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Servicio Vendido</label>
                                            <select 
                                                required 
                                                value={item.serviceId}
                                                onChange={(e) => {
                                                    const newServiceId = e.target.value;
                                                    const serviceDef = services.find((s: any) => s.id.toString() === newServiceId);
                                                    const newItems = [...saleItems];
                                                    newItems[index] = { ...newItems[index], serviceId: newServiceId, price: serviceDef ? serviceDef.cost : 0 };
                                                    setSaleItems(newItems);
                                                }}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" 
                                                disabled={isPending}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} (Ref: {formatCurrency(s.cost)})</option>)}
                                            </select>
                                        </div>
                                        <div className="w-full md:w-32 lg:w-40 shrink-0">
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Precio (Sin IVA)</label>
                                            <input 
                                                required 
                                                type="number" 
                                                value={item.price === 0 && item.serviceId === '' ? '' : item.price}
                                                placeholder="0.00" 
                                                min="0" 
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                                                disabled={isPending} 
                                                onChange={(e) => {
                                                    const newItems = [...saleItems];
                                                    newItems[index] = { ...newItems[index], price: Number(e.target.value) || 0 };
                                                    setSaleItems(newItems);
                                                }} 
                                            />
                                        </div>
                                        <div className="w-full md:w-1/4">
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Detalle (Ej. Líneas)</label>
                                            <input 
                                                type="text" 
                                                value={item.details || ''}
                                                placeholder="Opcional" 
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                                                disabled={isPending} 
                                                onChange={(e) => {
                                                    const newItems = [...saleItems];
                                                    newItems[index] = { ...newItems[index], details: e.target.value };
                                                    setSaleItems(newItems);
                                                }} 
                                            />
                                        </div>
                                        <div className="w-full md:w-1/4">
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Observaciones</label>
                                            <input 
                                                type="text" 
                                                value={item.observations || ''}
                                                placeholder="Opcional" 
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                                                disabled={isPending} 
                                                onChange={(e) => {
                                                    const newItems = [...saleItems];
                                                    newItems[index] = { ...newItems[index], observations: e.target.value };
                                                    setSaleItems(newItems);
                                                }} 
                                            />
                                        </div>
                                        {saleItems.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newItems = saleItems.filter((_, i) => i !== index);
                                                    setSaleItems(newItems);
                                                }}
                                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mb-0.5 shrink-0"
                                                title="Quitar ítem"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                
                                <button 
                                    type="button" 
                                    onClick={() => setSaleItems([...saleItems, {serviceId: '', price: 0, details: '', observations: ''}])}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center mt-2 p-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                    <Plus size={16} className="mr-1" /> Agregar otro servicio
                                </button>
                            </div>

                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Concepto o Notas Genéricas (Opcional)</label>
                                <textarea name="notes" rows={2} value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Motivo de la venta o descuento global..." className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" disabled={isPending} />
                            </div>

                            <div className="lg:col-span-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Inicio del Ciclo (Opcional)</label>
                                {(() => {
                                    // Derive default cycle start based on clientPackage cycleStart
                                    let defaultCycleStart = '';
                                    if (clientPackage?.cycleStart) {
                                        const now = new Date();
                                        let year = now.getFullYear();
                                        let month = now.getMonth();
                                        
                                        const getClampedDate = (y: number, m: number, d: number) => {
                                            const maxDays = new Date(y, m + 1, 0).getDate();
                                            return new Date(y, m, Math.min(d, maxDays));
                                        };
                                        
                                        let currentCycleStart = getClampedDate(year, month, clientPackage.cycleStart);
                                        if (now < currentCycleStart) {
                                            month -= 1;
                                            if (month < 0) { month = 11; year--; }
                                            currentCycleStart = getClampedDate(year, month, clientPackage.cycleStart);
                                        }
                                        defaultCycleStart = currentCycleStart.toISOString().split('T')[0];
                                    }
                                    return (
                                        <input type="date" name="cycleStartDate" defaultValue={defaultCycleStart} className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-800" disabled={isPending} />
                                    );
                                })()}
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fin del Ciclo (Opcional)</label>
                                {(() => {
                                    // Derive default cycle end based on clientPackage cycleStart
                                    let defaultCycleEnd = '';
                                    if (clientPackage?.cycleStart) {
                                        const now = new Date();
                                        let year = now.getFullYear();
                                        let month = now.getMonth();
                                        
                                        const getClampedDate = (y: number, m: number, d: number) => {
                                            const maxDays = new Date(y, m + 1, 0).getDate();
                                            return new Date(y, m, Math.min(d, maxDays));
                                        };
                                        
                                        let currentCycleStart = getClampedDate(year, month, clientPackage.cycleStart);
                                        if (now < currentCycleStart) {
                                            month -= 1;
                                            if (month < 0) { month = 11; year--; }
                                        }
                                        
                                        let endMonth = month + 1;
                                        let endYear = year;
                                        if (endMonth > 11) { endMonth = 0; endYear++; }
                                        
                                        let currentCycleEnd = getClampedDate(endYear, endMonth, clientPackage.cycleStart);
                                        currentCycleEnd.setDate(currentCycleEnd.getDate() - 1);
                                        defaultCycleEnd = currentCycleEnd.toISOString().split('T')[0];
                                    }
                                    return (
                                        <input type="date" name="cycleEndDate" defaultValue={defaultCycleEnd} className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-800" disabled={isPending} />
                                    );
                                })()}
                            </div>

                            {saleItems.some(i => i.price > 0) && (() => {
                                const tBase = saleItems.reduce((acc, i) => acc + Number(i.price || 0), 0);
                                const tIva = applyIva ? tBase * 0.19 : 0;
                                const tReteIva = (applyIva && applyReteIva) ? tIva * 0.15 : 0;
                                const tFinal = tBase + tIva - tReteIva;
                                return (
                                    <div className="lg:col-span-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex justify-between items-center text-emerald-900 dark:text-emerald-100 mt-2">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Resumen de Factura</p>
                                            <p className="text-sm font-medium">
                                                Base: {formatCurrency(tBase)} 
                                                {applyIva && <span className="text-emerald-700 dark:text-emerald-400 ml-2 font-bold">+ IVA: {formatCurrency(tIva)}</span>}
                                                {(applyIva && applyReteIva) && <span className="text-rose-600 dark:text-rose-400 ml-2 font-bold">- Ret.IVA: {formatCurrency(tReteIva)}</span>}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black">{formatCurrency(tFinal)}</p>
                                            <p className="text-[10px] uppercase font-bold opacity-80">Total Final a Facturar</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2 shrink-0">
                                <button type="button" onClick={() => { setIsCreateSaleModalOpen(false); setSaleItems([{serviceId: '', price: 0}]); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors" disabled={isPending}>Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center transition-colors disabled:opacity-50">
                                    Emitir Factura
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR FACTURA MANUAL */}
            {isEditSaleModalOpen && selectedSaleForEdit && role === 'ADMIN' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Factura</h3>
                                <p className="text-sm text-slate-500">Servicio: {selectedSaleForEdit.service?.name || selectedSaleForEdit.serviceName}</p>
                            </div>
                            <button onClick={() => setIsEditSaleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            handleAction(() => updateSale(selectedSaleForEdit.id, {
                                salePrice: Number(form.salePrice.value),
                                notes: form.notes.value,
                                invoiceNumber: form.invoiceNumber.value || undefined,
                                date: form.date.value ? new Date(form.date.value + 'T12:00:00') : undefined,
                                paymentDeadline: form.paymentDeadline.value ? new Date(form.paymentDeadline.value + 'T12:00:00') : undefined,
                                cycleStartDate: form.cycleStartDate.value ? new Date(form.cycleStartDate.value + 'T12:00:00') : undefined,
                                cycleEndDate: form.cycleEndDate.value ? new Date(form.cycleEndDate.value + 'T12:00:00') : undefined
                            }), () => {
                                setIsEditSaleModalOpen(false);
                                if (selectedClient) loadClientDetails(selectedClient.id);
                            });
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Emisión</label>
                                    <input type="date" name="date" defaultValue={new Date(selectedSaleForEdit.date).toISOString().split('T')[0]} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" required disabled={isPending} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento</label>
                                    <input type="date" name="paymentDeadline" defaultValue={selectedSaleForEdit.paymentDeadline ? new Date(selectedSaleForEdit.paymentDeadline).toISOString().split('T')[0] : ''} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Factura (Inc. IVA si aplica)</label>
                                    <input type="number" name="salePrice" defaultValue={selectedSaleForEdit.salePrice} min={selectedSaleForEdit.amountPaid} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" required disabled={isPending} />
                                    <p className="text-[10px] text-slate-500 mt-1">Nota: No puede ser menor a lo ya pagado ({formatCurrency(selectedSaleForEdit.amountPaid)})</p>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1"># Factura</label>
                                    <input type="text" name="invoiceNumber" defaultValue={selectedSaleForEdit.invoiceNumber || ''} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase" disabled={isPending} />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Inicio del Ciclo</label>
                                    <input type="date" name="cycleStartDate" defaultValue={selectedSaleForEdit.cycleStartDate ? new Date(selectedSaleForEdit.cycleStartDate).toISOString().split('T')[0] : ''} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fin del Ciclo</label>
                                    <input type="date" name="cycleEndDate" defaultValue={selectedSaleForEdit.cycleEndDate ? new Date(selectedSaleForEdit.cycleEndDate).toISOString().split('T')[0] : ''} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Concepto / Notas</label>
                                    <input type="text" name="notes" defaultValue={selectedSaleForEdit.notes} className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsEditSaleModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium" disabled={isPending}>Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR VENTA */}
            {saleDeleteId && role === 'ADMIN' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-rose-600 dark:text-rose-400 mb-4 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <Trash2 size={24} />
                            <h3 className="text-lg font-bold">¿Borrar Factura?</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">Esta acción es irreversible y afectará el historial financiero y los reportes de ingresos.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setSaleDeleteId(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors" disabled={isPending}>Cancelar</button>
                            <button onClick={() => {
                                handleAction(() => deleteSale(saleDeleteId), () => {
                                    setSaleDeleteId(null);
                                    if(selectedClient) loadClientDetails(selectedClient.id);
                                });
                            }} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50" disabled={isPending}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            <form action={(formData) => {
                const targetId = uploadSaleIdRef.current;
                if (!targetId) return;
                const file = formData.get("file") as File;
                if (file && file.size > 5 * 1024 * 1024) {
                    alert("El archivo no puede pesar más de 5MB");
                    setIsUploadingForSaleId(null);
                    uploadSaleIdRef.current = null;
                    if(fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }
                handleAction(
                    () => uploadInvoiceFile(targetId, formData),
                    () => {
                        setIsUploadingForSaleId(null);
                        uploadSaleIdRef.current = null;
                        if(fileInputRef.current) fileInputRef.current.value = '';
                        if (selectedClient) loadClientDetails(selectedClient.id);
                    }
                );
            }}>
                <input type="file" name="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                    if (e.target.files?.[0]) e.target.form?.requestSubmit();
                }} />
            </form>
        </div>
    );
}

"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// Helper para validar permisos
async function requireAuth() {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");
    return session;
}

async function requireAdmin() {
    const session = await requireAuth();
    if (session.role !== "ADMIN") throw new Error("No autorizado. Requiere rol de Administrador.");
    return session;
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}

// ----------------------
// CLIENTS
// ----------------------
export async function getClients() {
    await requireAuth();
    return prisma.client.findMany({ orderBy: { id: "desc" } });
}

export async function addClient(data: { name: string; phone: string; nit?: string; contact?: string; code?: string; country?: string; city?: string; observations?: string; notificationEmail?: string; billingEmail?: string; hasIva?: boolean; hasReteIva?: boolean }) {
    await requireAuth();

    // Auto-generate a client code if not provided
    let finalCode = data.code;
    if (!finalCode) {
        // Find the highest id to generate a consecutive code
        const lastClient = await prisma.client.findFirst({
            orderBy: { id: "desc" }
        });
        const nextId = (lastClient?.id || 0) + 1;
        finalCode = `CLI-${nextId.toString().padStart(4, '0')}`;
    } else {
        // If provided, verify it's not taken
        const existing = await prisma.client.findUnique({ where: { code: finalCode } });
        if (existing) {
            throw new Error(`El código de cliente "${finalCode}" ya está en uso.`);
        }
    }

    const client = await prisma.client.create({
        data: {
            ...data,
            name: data.name.toUpperCase(),
            contact: data.contact,
            country: data.country,
            city: data.city,
            observations: data.observations,
            notificationEmail: data.notificationEmail,
            billingEmail: data.billingEmail,
            hasIva: data.hasIva || false,
            hasReteIva: data.hasReteIva || false,
            code: finalCode
        }
    });

    revalidatePath("/");
    return client;
}

export async function getExpiringPackagesAlert() {
    await requireAuth();

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() + 3);
    limitDate.setHours(23,59,59,999);

    // Buscar paquetes activos que venzan desde hoy hasta dentro de 3 días 
    // y que los siguientes cobros sean inminentes
    const expiringPackages = await prisma.package.findMany({
        where: {
            isActive: true,
            nextBillingDate: { 
                // No tomamos los que ya caducaron (<= today) porque el cron los debe procesar, 
                // pero por precaución tomamos de hoy hacia adelante 3 días
                gte: today,
                lte: limitDate 
            }
        },
        include: {
            client: { select: { name: true, phone: true } },
            items: { 
                where: { isActive: true }, 
                include: { service: { select: { name: true } } } 
            }
        },
        orderBy: {
            nextBillingDate: 'asc'
        }
    });

    // Convertimos todos los paquetes (incluso si tienen 0 items, para no perderlos de vista)
    return expiringPackages.map(pkg => {
        const diffTime = new Date(pkg.nextBillingDate).getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
            id: pkg.id,
            clientId: pkg.clientId,
            clientName: pkg.client?.name || "Desconocido",
            clientPhone: pkg.client?.phone,
            services: pkg.items.length > 0 ? pkg.items.map(i => i.service.name).join(", ") : "Sin servicios configurados",
            nextBillingDate: pkg.nextBillingDate,
            daysRemaining: diffDays
        };
    });
}
export async function updateClient(id: number, data: { name: string; phone: string; nit?: string; contact?: string; code?: string; country?: string; city?: string; observations?: string; notificationEmail?: string; billingEmail?: string; hasIva?: boolean; hasReteIva?: boolean }) {
    await requireAuth();

    if (data.code) {
        const existing = await prisma.client.findUnique({ where: { code: data.code } });
        if (existing && existing.id !== id) {
            throw new Error(`El código de cliente "${data.code}" ya está siendo usado por otro cliente.`);
        }
    }

    const updatePayload = {
        ...data,
        name: data.name ? data.name.toUpperCase() : data.name,
        contact: data.contact ? data.contact.toUpperCase() : data.contact,
        country: data.country ? data.country.trim().toUpperCase() : data.country,
        city: data.city ? data.city.trim().toUpperCase() : data.city,
        observations: data.observations,
        notificationEmail: data.notificationEmail ? data.notificationEmail.toLowerCase() : data.notificationEmail,
        billingEmail: data.billingEmail ? data.billingEmail.toLowerCase() : data.billingEmail,
        hasIva: data.hasIva !== undefined ? data.hasIva : undefined,
        hasReteIva: data.hasReteIva !== undefined ? data.hasReteIva : undefined
    };

    const client = await prisma.client.update({ where: { id }, data: updatePayload });
    revalidatePath("/");
    return client;
}

export async function deleteClient(id: number) {
    await requireAdmin();
    await prisma.client.delete({ where: { id } });
    revalidatePath("/");
}

export async function getClientSales(clientId: number) {
    await requireAuth();
    return prisma.sale.findMany({
        where: { clientId },
        include: { service: true, payments: true },
        orderBy: { date: "desc" }
    });
}

// ----------------------
// SERVICES
// ----------------------
export async function getServices() {
    await requireAuth();
    return prisma.service.findMany({ orderBy: { id: "desc" } });
}

export async function addService(data: { name: string; cost: number; observations?: string; code?: string }) {
    await requireAuth();
    const cleanName = data.name.trim().toUpperCase();
    const cleanCode = data.code ? data.code.trim().toUpperCase() : undefined;

    if (cleanCode) {
        const existingCode = await prisma.service.findUnique({ where: { code: cleanCode } });
        if (existingCode) throw new Error(`El código de servicio "${cleanCode}" ya está en uso.`);
    }

    // Validate unique name (case-insensitive, trimmed)
    const allServices = await prisma.service.findMany();
    const duplicateName = allServices.find(s => s.name.trim().toUpperCase() === cleanName);
    if (duplicateName) throw new Error(`Ya existe un servicio con el nombre "${cleanName}".`);

    const service = await prisma.service.create({ data: { ...data, name: cleanName, code: cleanCode || null } });
    revalidatePath("/");
    return service;
}

export async function deleteService(id: number) {
    await requireAdmin();
    await prisma.service.delete({ where: { id } });
    revalidatePath("/");
}

export async function updateService(id: number, data: { name: string; cost: number; observations?: string; code?: string }) {
    await requireAdmin();
    const cleanName = data.name.trim().toUpperCase();
    const cleanCode = data.code ? data.code.trim().toUpperCase() : undefined;

    if (cleanCode) {
        const existingCode = await prisma.service.findUnique({ where: { code: cleanCode } });
        if (existingCode && existingCode.id !== id) throw new Error(`El código de servicio "${cleanCode}" ya está siendo usado por otro servicio.`);
    }

    // Validate unique name (case-insensitive, trimmed)
    const allServices = await prisma.service.findMany();
    const duplicateName = allServices.find(s => s.name.trim().toUpperCase() === cleanName && s.id !== id);
    if (duplicateName) throw new Error(`Ya existe un servicio con el nombre "${cleanName}".`);

    const service = await prisma.service.update({ where: { id }, data: { ...data, name: cleanName, code: cleanCode || null } });
    revalidatePath("/");
    return service;
}

// ----------------------
// PACKAGES (SUSCRIPCIONES)
// ----------------------

// Helper function to calculate billing dates, clamping to the end of the month if necessary
function getNextBillingCycleDate(baseDate: Date, cycleStartDay: number, addMonths: number = 0): Date {
    let year = baseDate.getFullYear();
    let month = baseDate.getMonth() + addMonths;
    
    year += Math.floor(month / 12);
    month = month % 12;
    if (month < 0) {
        month += 12;
    }
    
    const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(cycleStartDay, maxDaysInMonth);
    
    return new Date(year, month, clampedDay);
}

export async function getClientPackage(clientId: number) {
    await requireAuth();
    return prisma.package.findFirst({
        where: { clientId },
        include: {
            items: {
                include: { service: true }
            }
        }
    });
}

export async function upsertPackage(data: {
    clientId: number;
    isActive: boolean;
    cycleStart: number;
    cycleEnd: number;
    paymentDeadlineDays: number;
    items: { serviceId: number; customPrice: number; isActive?: boolean, details?: string, quantity: number }[];
}) {
    await requireAuth();

    // Determinar nextBillingDate inicial si es nuevo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Logica simple para el próximo corte: el cycleStart del mes actual o próximo mes
    let nextBillingDate = getNextBillingCycleDate(today, data.cycleStart, 0);
    if (nextBillingDate <= today) {
        nextBillingDate = getNextBillingCycleDate(today, data.cycleStart, 1);
    }

    const existingPackage = await prisma.package.findFirst({
        where: { clientId: data.clientId }
    });

    if (existingPackage) {
        // Recalcular nextBillingDate para el paquete existente en base al nuevo cycleStart y el día de hoy
        const todayForCalc = new Date();
        todayForCalc.setHours(0,0,0,0);
        let updatedNextBillingDate = getNextBillingCycleDate(todayForCalc, data.cycleStart, 0);
        
        // Si al cambiar el día, la fecha ya pasó (ej. es 12 y cambiaron al 1), 
        // lo mandamos al mes siguiente.
        if (updatedNextBillingDate <= todayForCalc) {
            updatedNextBillingDate = getNextBillingCycleDate(todayForCalc, data.cycleStart, 1);
        }

        // Actualizar existente
        await prisma.package.update({
            where: { id: existingPackage.id },
            data: {
                isActive: data.isActive,
                cycleStart: data.cycleStart,
                cycleEnd: data.cycleEnd,
                paymentDeadlineDays: data.paymentDeadlineDays,
                nextBillingDate: updatedNextBillingDate,
                // Borrar items viejos y crear nuevos
                items: {
                    deleteMany: {},
                    create: data.items.map(item => ({
                        serviceId: item.serviceId,
                        customPrice: item.customPrice,
                        details: item.details,
                        quantity: item.quantity,
                        isActive: item.isActive !== undefined ? item.isActive : true
                    }))
                }
            }
        });
    } else {
        // Crear nuevo
        await prisma.package.create({
            data: {
                clientId: data.clientId,
                isActive: data.isActive,
                cycleStart: data.cycleStart,
                cycleEnd: data.cycleEnd,
                paymentDeadlineDays: data.paymentDeadlineDays,
                nextBillingDate: nextBillingDate,
                items: {
                    create: data.items.map(item => ({
                        serviceId: item.serviceId,
                        customPrice: item.customPrice,
                        details: item.details,
                        quantity: item.quantity,
                        isActive: item.isActive !== undefined ? item.isActive : true
                    }))
                }
            }
        });
    }

    revalidatePath("/");
}

// Motor de cobro automático (debe llamarse desde el front o un cron)
export async function processMonthlyPackages() {
    const today = new Date();
    today.setHours(0,0,0,0);

    // Buscar todos los paquetes activos cuya fecha de cobro ya pasó o es hoy
    const duePackages = await prisma.package.findMany({
        where: {
            isActive: true,
            nextBillingDate: { lte: today }
        },
        include: {
            client: true,
            items: { include: { service: true } }
        }
    });

    if (duePackages.length === 0) return { processed: 0 };

    let processedCount = 0;

    for (const pkg of duePackages) {
        // Filtrar solo los ítems que están encendidos en el paquete
        const activeItems = pkg.items.filter(i => i.isActive);

        // Si la bolsa está vacía (o tiene servicios pero todos apagados), igual avanzamos la fecha pero no cobramos
        if (activeItems.length === 0) {
            const nextDate = getNextBillingCycleDate(pkg.nextBillingDate, pkg.cycleStart, 1);
            await prisma.package.update({ where: { id: pkg.id }, data: { nextBillingDate: nextDate } });
            continue;
        }

        // Calcular total
        const totalAmount = activeItems.reduce((acc, item) => acc + item.customPrice, 0);
        
        // Construir detalle
        // Build structured JSON items for item-by-item display
        const structuredItems = activeItems.map(i => ({
            code: i.service.code || null,
            name: i.service.name || 'Desconocido',
            price: i.customPrice,
            quantity: i.quantity || 1,
            details: i.details?.trim() || null,
            observations: null
        }));
        
        const jsonPrefix = `<!--ITEMS:${JSON.stringify(structuredItems)}:ITEMS-->`;
        const notes = `${jsonPrefix}Cobro Automático Paquete.`;

        // Calcular payment deadline específico de esta factura
        const deadline = new Date(today);
        deadline.setDate(deadline.getDate() + pkg.paymentDeadlineDays);

        // Calculate cycle start and end for the automatic invoice based on pkg.cycleStart
        const cycleStartDate = new Date(pkg.nextBillingDate);
        const cycleEndDate = getNextBillingCycleDate(pkg.nextBillingDate, pkg.cycleStart, 1);
        cycleEndDate.setDate(cycleEndDate.getDate() - 1); // One day before the next month's billing date

        // Generar Factura (Sale)
        await prisma.sale.create({
            data: {
                clientId: pkg.clientId,
                clientName: pkg.client.name,
                serviceId: null, // Es un paquete mixto
                serviceName: "Paquete Mensual", 
                salePrice: totalAmount,
                amountPaid: 0,
                status: "PENDING",
                notes: notes,
                paymentDeadline: deadline,
                cycleStartDate: cycleStartDate,
                cycleEndDate: cycleEndDate,
            }
        });

        // Avanzar la fecha al próximo mes
        const nextDate = getNextBillingCycleDate(pkg.nextBillingDate, pkg.cycleStart, 1);
        await prisma.package.update({ where: { id: pkg.id }, data: { nextBillingDate: nextDate } });
        
        processedCount++;
    }

    revalidatePath("/");
    return { processed: processedCount };
}

// Para la Vista de Resumen (Toggle Mode)
export async function getAllPackagesSummary() {
    await requireAuth();
    return prisma.package.findMany({
        where: { isActive: true },
        include: {
            client: true,
            items: {
                include: { service: true }
            }
        },
        orderBy: {
            client: { name: 'asc' }
        }
    });
}

export async function togglePackageItemStatus(itemId: number, newState: boolean) {
    await requireAuth();
    
    try {
        const updated = await prisma.packageItem.update({
            where: { id: itemId },
            data: { isActive: newState }
        });
        
        revalidatePath("/");
        return updated;
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new Error("Este servicio ya no está disponible, es posible que el paquete haya sido modificado. Cierra esta ventana y vuelve a ingresar para ver los datos actualizados.");
        }
        throw new Error("Error interno al cambiar el estado del servicio.");
    }
}


// ----------------------
// SALES & PAYMENTS
// ----------------------
export async function getSales() {
    await requireAuth();
    return prisma.sale.findMany({
        include: {
            client: true,
            service: true,
            payments: true,
        },
        orderBy: { id: "desc" },
    });
}

export async function addSale(data: {
    clientId: number;
    items: { serviceId: number; price: number; quantity?: number; details?: string; observations?: string }[];
    amountPaid: number;
    notes?: string;
    invoiceNumber?: string;
    applyIva?: boolean;
    applyReteIva?: boolean;
    paymentDeadline?: Date; 
    date?: Date; 
    cycleStartDate?: Date;
    cycleEndDate?: Date;
}) {
    await requireAuth();

    const clientRecord = await prisma.client.findUnique({ where: { id: data.clientId } });
    
    let totalBase = 0;
    for (const item of data.items) {
        totalBase += item.price;
    }

    let totalIva = 0;
    let totalReteIva = 0;

    const shouldApplyIva = data.applyIva !== undefined ? data.applyIva : clientRecord?.hasIva;
    const shouldApplyReteIva = data.applyReteIva !== undefined ? data.applyReteIva : clientRecord?.hasReteIva;

    if (shouldApplyIva) {
        totalIva = totalBase * 0.19;
    }
    
    if (shouldApplyIva && shouldApplyReteIva) {
        totalReteIva = totalIva * 0.15;
    }

    let finalSalePrice = Math.round(totalBase + totalIva - totalReteIva);

    const status = data.amountPaid >= finalSalePrice ? "PAID" : data.amountPaid > 0 ? "PARTIAL" : "PENDING";
    
    const serviceIds = data.items.map(i => i.serviceId);
    const serviceRecords = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    
    const serviceMap = new Map(serviceRecords.map(s => [s.id, s]));
    const serviceNames = data.items.map(i => serviceMap.get(i.serviceId)?.name).join(', ');
    const serviceNameString = data.items.length === 1 ? serviceNames : `Varios: ${serviceNames}`;
    const singleServiceId = data.items.length === 1 ? data.items[0].serviceId : null;

    // Build structured JSON items for item-by-item display
    const structuredItems = data.items.map(i => {
        const svc = serviceMap.get(i.serviceId);
        return {
            code: svc?.code || null,
            name: svc?.name || 'Desconocido',
            price: i.price,
            quantity: i.quantity || 1,
            details: i.details?.trim() || null,
            observations: i.observations?.trim() || null
        };
    });

    let finalNotes = data.notes ? data.notes.trim() : "";

    // Prepend structured JSON for item-by-item parsing
    const jsonPrefix = `<!--ITEMS:${JSON.stringify(structuredItems)}:ITEMS-->`;
    finalNotes = finalNotes ? `${jsonPrefix}${finalNotes}` : jsonPrefix;

    const sale = await prisma.sale.create({
        data: {
            clientId: data.clientId,
            clientName: clientRecord?.name || "Desconocido", // Snapshot permanente
            serviceId: singleServiceId,
            serviceName: serviceNameString, // Snapshot permanente
            salePrice: finalSalePrice,
            amountPaid: data.amountPaid,
            notes: finalNotes,
            status: status,
            date: data.date || undefined,
            paymentDeadline: data.paymentDeadline,
            cycleStartDate: data.cycleStartDate,
            cycleEndDate: data.cycleEndDate,
            invoiceNumber: data.invoiceNumber || null,
            hasIva: !!shouldApplyIva, 
            hasReteIva: !!shouldApplyReteIva,
            payments: data.amountPaid > 0 ? {
                create: {
                    amount: data.amountPaid,
                    date: data.date || undefined
                }
            } : undefined
        }
    });

    revalidatePath("/");
    return sale;
}

export async function addPayment(saleId: number, amount: number, date?: Date, method?: string) {
    await requireAuth();

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new Error("Venta no encontrada");

    const newAmountPaid = sale.amountPaid + amount;
    const isNowFullyPaid = newAmountPaid >= sale.salePrice;
    const status = isNowFullyPaid ? "PAID" : "PARTIAL";

    let updateData: any = { amountPaid: newAmountPaid, status };

    // Ya no actualizamos el ciclo de la venta porque las facturas (Sales) son unitarias 
    // y el motor de paquetes (Packages) se encarga de crear las nuevas facturas mensuales.

    await prisma.$transaction([
        prisma.payment.create({ data: { saleId, amount, date: date || undefined, method: method || null } }),
        prisma.sale.update({
            where: { id: saleId },
            data: updateData
        })
    ]);

    revalidatePath("/");
}

export async function deleteSale(id: number) {
    await requireAdmin();
    await prisma.sale.delete({ where: { id } });
    revalidatePath("/");
}

export async function updateSale(id: number, data: { salePrice?: number; notes?: string; invoiceNumber?: string; date?: Date; paymentDeadline?: Date; cycleStartDate?: Date; cycleEndDate?: Date }) {
    await requireAdmin();
    
    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new Error("Venta no encontrada");
    
    const priceToEvaluate = data.salePrice !== undefined ? data.salePrice : sale.salePrice;
    const status = sale.amountPaid >= priceToEvaluate ? "PAID" : sale.amountPaid > 0 ? "PARTIAL" : "PENDING";

    const updateData: any = { ...data, status };
    
    if (data.notes !== undefined && sale.notes) {
        // preserve the JSON prefix from the original sale if it exists
        const match = sale.notes.match(/^(<!--ITEMS:.*?:ITEMS-->)/);
        if (match) {
            updateData.notes = data.notes.trim() ? `${match[1]}${data.notes.trim()}` : match[1];
        } else {
            updateData.notes = data.notes.trim();
        }
    }

    if (data.date === undefined) delete updateData.date;
    if (data.paymentDeadline === undefined) delete updateData.paymentDeadline;

    const updatedSale = await prisma.sale.update({
        where: { id },
        data: updateData
    });
    
    revalidatePath("/");
    return updatedSale;
}

export async function deletePayment(paymentId: number, saleId: number) {
    await requireAdmin();
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Abono no encontrado");

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new Error("Venta no encontrada");

    const newAmountPaid = sale.amountPaid - payment.amount;
    const status = newAmountPaid >= sale.salePrice ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "PENDING";

    await prisma.$transaction([
        prisma.payment.delete({ where: { id: paymentId } }),
        prisma.sale.update({
            where: { id: saleId },
            data: { amountPaid: newAmountPaid, status }
        })
    ]);

    revalidatePath("/");
}

// ----------------------
// UPCOMING BILLINGS (ALERTS)
// ----------------------
export async function getUpcomingBillings() {
    await requireAuth();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lookAheadDate = new Date(today);
    lookAheadDate.setDate(lookAheadDate.getDate() + 7);

    // Alertamos sobre Facturas (Sales) vencidas o por vencerse
    const dueSales = await prisma.sale.findMany({
        where: {
            status: { not: "PAID" },
            paymentDeadline: {
                lte: lookAheadDate
            }
        },
        include: {
            client: { select: { name: true, phone: true } },
            service: { select: { name: true } }
        },
        orderBy: {
            paymentDeadline: "asc"
        }
    });

    // Alertamos también de paquetes que están PRÓXIMOS a facturar este mes (opcional, para avisar que se viene cobro)
    const upcomingPackages = await prisma.package.findMany({
        where: {
            isActive: true,
            nextBillingDate: {
                lte: lookAheadDate,
                gt: today // Solo los que vienen en el futuro cercano, no los que ya pasaron (esos ya deben ser Sales)
            }
        },
        include: {
            client: { select: { name: true, phone: true } }
        },
        orderBy: {
            nextBillingDate: "asc"
        }
    });

    return {
        dueSales,
        upcomingPackages
    };
}

// ----------------------
// FILE UPLOADS (INVOICES)
// ----------------------
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadInvoiceFile(saleId: number, formData: FormData) {
    await requireAuth();

    const file = formData.get('file') as File | null;
    if (!file) throw new Error("No se proporcionó ningún archivo.");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `invoice-${saleId}-${uniqueSuffix}-${file.name.replace(/\s+/g, '_')}`;
    
    // Save to public/uploads/invoices
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'invoices');
    const filepath = join(uploadDir, filename);

    // Ensure the directory exists
    try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(filepath, buffer);
    } catch (error) {
        console.error("Error saving file:", error);
        throw new Error("No se pudo guardar el archivo en el servidor.");
    }

    const fileUrl = `/uploads/invoices/${filename}`;

    // Update the database
    const sale = await prisma.sale.update({
        where: { id: saleId },
        data: { invoiceFileUrl: fileUrl }
    });

    revalidatePath("/");
    return sale;
}

export async function deleteInvoiceFile(saleId: number, currentFileUrl: string) {
    await requireAuth();

    // Remove file from disk
    if (currentFileUrl.startsWith('/uploads/invoices/')) {
        const filename = currentFileUrl.replace('/uploads/invoices/', '');
        const filepath = join(process.cwd(), 'public', 'uploads', 'invoices', filename);
        try {
            await unlink(filepath);
        } catch (error) {
            console.error("Error deleting file:", error);
            // We ignore if the file doesn't exist on disk already
        }
    }

    const sale = await prisma.sale.update({
        where: { id: saleId },
        data: { invoiceFileUrl: null }
    });

    revalidatePath("/");
    return sale;
}

// ----------------------
// EXPENSES (GASTOS)
// ----------------------
export async function getExpenses() {
    await requireAuth();
    return prisma.expense.findMany({ orderBy: { id: "desc" } });
}

export async function addExpense(data: { name: string; description?: string; amount: number; provider?: string; hasIva?: boolean; baseAmount?: number; ivaAmount?: number }) {
    await requireAuth();
    const expense = await prisma.expense.create({ data });
    revalidatePath("/");
    return expense;
}

export async function updateExpense(id: number, data: { name: string; description?: string; amount: number; provider?: string; hasIva?: boolean; baseAmount?: number; ivaAmount?: number }) {
    await requireAdmin();
    const expense = await prisma.expense.update({ where: { id }, data });
    revalidatePath("/");
    return expense;
}

export async function deleteExpense(id: number) {
    await requireAdmin();
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/");
}

export async function uploadExpenseReceipt(expenseId: number, formData: FormData) {
    await requireAuth();
    const file = formData.get('file') as File | null;
    if (!file) throw new Error("No se proporcionó ningún archivo.");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `expense-${expenseId}-${uniqueSuffix}-${file.name.replace(/\\s+/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'expenses');
    const filepath = join(uploadDir, filename);
    
    // We import fs/promises just in case, it's already imported for invoices
    const fsP = require('fs/promises');
    try {
        await fsP.mkdir(uploadDir, { recursive: true });
        await fsP.writeFile(filepath, buffer);
    } catch (error) {
        console.error("Error saving file:", error);
        throw new Error("No se pudo guardar el archivo en el servidor.");
    }
    const fileUrl = `/uploads/expenses/${filename}`;
    const expense = await prisma.expense.update({
        where: { id: expenseId },
        data: { receiptUrl: fileUrl }
    });
    revalidatePath("/");
    return expense;
}

export async function deleteExpenseReceipt(expenseId: number, currentFileUrl: string) {
    await requireAuth();
    if (currentFileUrl.startsWith('/uploads/expenses/')) {
        const filename = currentFileUrl.replace('/uploads/expenses/', '');
        const filepath = join(process.cwd(), 'public', 'uploads', 'expenses', filename);
        try {
            const fsP = require('fs/promises');
            await fsP.unlink(filepath);
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    }
    const expense = await prisma.expense.update({
        where: { id: expenseId },
        data: { receiptUrl: null }
    });
    revalidatePath("/");
    return expense;
}

export async function updateMyPassword(newPassword: string) {
    try {
        const session = await requireAuth();
        const userId = session.id;

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, mustChangePassword: false }
        });

        const cookieStore = await cookies();
        cookieStore.delete("session");

        return { success: true };
    } catch (e: any) {
        throw new Error("Respuesta inesperada del servidor: " + e.message);
    }
}
// ----------------------
// METRICS
// ----------------------
export async function getDashboardMetrics(startDate?: Date, endDate?: Date) {
    const session = await requireAuth();

    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter = {
            date: {
                gte: startDate,
                lte: endDate,
            }
        };
    }

    const sales = await prisma.sale.findMany({ 
        where: dateFilter,
        include: { service: true } 
    });
    
    // Para los pagos/abonos, filtramos directamente en la tabla de Pagos, no solo en la venta
    const payments = await prisma.payment.findMany({
        where: dateFilter
    });
    
    const expenses = await prisma.expense.findMany({
        where: dateFilter
    });
    
    // Clientes totales no depende de la fecha, es global
    const totalClients = await prisma.client.count();

    let totalRevenue = 0;
    
    // Solo sumamos el salePrice si la VENTA en sí misma fue generada en este periodo
    sales.forEach((sale: any) => {
        totalRevenue += sale.salePrice;
    });

    let totalCollected = 0;
    // Sumamos todos los abonos realizados estrictamente en el periodo seleccionado
    payments.forEach((payment: any) => {
        totalCollected += payment.amount;
    });

    const totalExpenses = expenses.reduce((acc: any, exp: any) => acc + exp.amount, 0);

    // Ganancia Neta Estimada (Current calculation on dashboard uses this)
    const currentProfit = totalCollected - totalExpenses;
    const netProfit = totalCollected - totalExpenses;

    const allSalesForPending = await prisma.sale.findMany({
        where: { status: { not: "PAID" } }
    });
    
    let totalGlobalPending = 0;
    allSalesForPending.forEach(s => {
        totalGlobalPending += (s.salePrice - s.amountPaid);
    });

    return {
        totalRevenue,
        totalCollected,
        totalPending: totalGlobalPending, // Global debt regardless of date
        totalCosts: 0,
        totalExpenses,
        currentProfit,
        netProfit,
        totalClients,
        role: session.role
    };
}

// ----------------------
// USERS (ADMIN ONLY)
// ----------------------
export async function getUsers() {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return [];
    // No devolvemos la contraseña, solo los metadatos.
    return prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, mustChangePassword: true }, orderBy: { id: "desc" } });
}

export async function addUser(data: { name: string; email: string; password?: string; role: "ADMIN" | "AGENT" }) {
    await requireAdmin();
    const hashedPassword = await bcrypt.hash(data.password || "123456", 10);
    const user = await prisma.user.create({
        data: {
            name: data.name.toUpperCase(),
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: data.role,
        }
    });
    revalidatePath("/");
    // Devolvemos el usuario sin la contraseña para no filtrar data.
    return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function updateUser(id: number, data: { name?: string; email?: string; password?: string; role?: "ADMIN" | "AGENT"; mustChangePassword?: boolean }) {
    await requireAdmin();
    const updateData: any = {
        ...data,
        name: data.name ? data.name.toUpperCase() : data.name,
        email: data.email ? data.email.toLowerCase() : data.email
    };
    if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
    } else {
        delete updateData.password;
    }
    const user = await prisma.user.update({
        where: { id },
        data: updateData,
    });
    revalidatePath("/");
    return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
}

export async function deleteUser(id: number) {
    await requireAdmin();
    await prisma.user.delete({ where: { id } });
    revalidatePath("/");
}

// ----------------------
// PAYMENT METHODS
// ----------------------
export async function getPaymentMethods() {
    await requireAuth();
    return prisma.paymentMethod.findMany({ 
        where: { isActive: true },
        orderBy: { name: "asc" } 
    });
}

export async function addPaymentMethod(name: string) {
    await requireAdmin();
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    // Check if it already exists to avoid unique constraint error
    const existing = await prisma.paymentMethod.findUnique({
        where: { name: formattedName }
    });
    
    if (existing) {
        if (!existing.isActive) {
            await prisma.paymentMethod.update({
                where: { id: existing.id },
                data: { isActive: true }
            });
            revalidatePath("/");
            return existing;
        }
        return existing; // Already exists and is active
    }

    const method = await prisma.paymentMethod.create({
        data: { name: formattedName }
    });
    revalidatePath("/");
    return method;
}

export async function deletePaymentMethod(id: number) {
    await requireAdmin();
    await prisma.paymentMethod.delete({ where: { id } });
    revalidatePath("/");
}

// ----------------------
// OTHER EXPENSES (OTROS GASTOS)
// ----------------------
export async function getOtherExpenses() {
    await requireAuth();
    return prisma.otherExpense.findMany({ orderBy: { id: "desc" } });
}

export async function addOtherExpense(data: { productOrService: string; quantity: number; date?: string; paymentMethod?: string; moneyOrigin?: string; provider?: string; unitValue: number; totalValue: number }) {
    await requireAuth();
    const expense = await prisma.otherExpense.create({ 
        data: {
            ...data,
            date: data.date ? new Date(data.date) : undefined
        }
    });
    revalidatePath("/");
    return expense;
}

export async function updateOtherExpense(id: number, data: { productOrService: string; quantity: number; date?: string; paymentMethod?: string; moneyOrigin?: string; provider?: string; unitValue: number; totalValue: number }) {
    await requireAdmin();
    const updateData: any = { ...data };
    if (data.date) {
        updateData.date = new Date(data.date);
    } else {
        delete updateData.date;
    }
    const expense = await prisma.otherExpense.update({ 
        where: { id }, 
        data: updateData 
    });
    revalidatePath("/");
    return expense;
}

export async function deleteOtherExpense(id: number) {
    await requireAdmin();
    await prisma.otherExpense.delete({ where: { id } });
    revalidatePath("/");
}

export async function uploadOtherExpenseReceipt(expenseId: number, formData: FormData) {
    await requireAuth();
    const file = formData.get('file') as File | null;
    if (!file) throw new Error("No se proporcionó ningún archivo.");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `otherexpense-${expenseId}-${uniqueSuffix}-${file.name.replace(/\\s+/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'otherexpenses');
    const filepath = join(uploadDir, filename);
    
    const fsP = require('fs/promises');
    try {
        await fsP.mkdir(uploadDir, { recursive: true });
        await fsP.writeFile(filepath, buffer);
    } catch (error) {
        console.error("Error saving file:", error);
        throw new Error("No se pudo guardar el archivo en el servidor.");
    }
    const fileUrl = `/uploads/otherexpenses/${filename}`;
    const expense = await prisma.otherExpense.update({
        where: { id: expenseId },
        data: { receiptUrl: fileUrl }
    });
    revalidatePath("/");
    return expense;
}

export async function deleteOtherExpenseReceipt(expenseId: number, currentFileUrl: string) {
    await requireAuth();
    if (currentFileUrl.startsWith('/uploads/otherexpenses/')) {
        const filename = currentFileUrl.replace('/uploads/otherexpenses/', '');
        const filepath = join(process.cwd(), 'public', 'uploads', 'otherexpenses', filename);
        try {
            const fsP = require('fs/promises');
            await fsP.unlink(filepath);
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    }
    const expense = await prisma.otherExpense.update({
        where: { id: expenseId },
        data: { receiptUrl: null }
    });
    revalidatePath("/");
    return expense;
}

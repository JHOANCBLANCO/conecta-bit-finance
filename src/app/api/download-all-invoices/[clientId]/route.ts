import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import JSZip from "jszip";
import path from "path";
import fs from "fs";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { clientId: rawClientId } = await params;
        const clientId = parseInt(rawClientId, 10);
        if (isNaN(clientId)) {
            return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Buscar las ventas del cliente que tengan archivo PDF
        const salesWithInvoices = await prisma.sale.findMany({
            where: {
                clientId: clientId,
                invoiceFileUrl: { not: null }
            },
            select: {
                id: true,
                invoiceNumber: true,
                invoiceFileUrl: true,
                date: true,
                serviceName: true,
                service: { select: { name: true } }
            }
        });

        if (salesWithInvoices.length === 0) {
            return NextResponse.json({ error: "No invoices found for this client" }, { status: 404 });
        }

        const zip = new JSZip();

        // Determinar el directorio de subidas real del sistema (ajustar si se usan blobs S3 después)
        const uploadDir = path.join(process.cwd(), 'public');

        let addedFilesCount = 0;

        for (const sale of salesWithInvoices) {
            if (!sale.invoiceFileUrl) continue;
            
            // Reconstruir la ruta local (asumiendo que empieza por /uploads/invoices/)
            const filePath = path.join(uploadDir, sale.invoiceFileUrl);
            
            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath);
                
                // Formatear el nombre del archivo en el ZIP para que sea amigable
                const dateStr = new Date(sale.date).toISOString().split('T')[0];
                const realServiceName = sale.service?.name || sale.serviceName || 'Servicio';
                
                // Limpiar posibles caracteres inválidos en el nombre
                const safeName = realServiceName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const invNum = sale.invoiceNumber ? `_${sale.invoiceNumber}` : `_id${sale.id}`;
                
                // Ejemplo de nombre: 2024-03-25_minutos_FVE-001.pdf
                // Extraer extensión original, si no asume .pdf
                const ext = path.extname(filePath) || '.pdf';
                const zipFileName = `${dateStr}_${safeName}${invNum}${ext}`;
                
                zip.file(zipFileName, fileData);
                addedFilesCount++;
            }
        }

        if (addedFilesCount === 0) {
            return NextResponse.json({ error: "Some invoice records exist but the physical files were missing" }, { status: 404 });
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        const clientSafeName = client.name.replace(/[^a-z0-9]/gi, '_');
        
        const response = new NextResponse(zipBuffer as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="Facturas_${clientSafeName}.zip"`,
                'Content-Length': zipBuffer.length.toString()
            }
        });
        
        return response;

    } catch (error) {
        console.error("ZIP Generation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getPaymentMethods } from "@/app/actions";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import SalesManager from "./SalesManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function VentasPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined } }) {
    // Next.js 14 treats searchParams as normal obj, Next >= 15 treats. We Await if promise.
    const searchParams = await props.searchParams;
    const initialFilter = typeof searchParams?.filter === 'string' ? searchParams.filter : undefined;

    const session = await getSession();
    if (!session) redirect("/login");

    const clients = await prisma.client.findMany({ orderBy: { id: "desc" } });
    const services = await prisma.service.findMany({ orderBy: { id: "desc" } });
    const sales = await prisma.sale.findMany({
        include: { client: true, service: true, payments: true },
        orderBy: { date: "desc" }
    });
    
    const paymentMethods = await getPaymentMethods();

    return <SalesManager initialSales={sales} clients={clients} services={services} paymentMethods={paymentMethods} role={session.role} initialFilter={initialFilter} />;
}

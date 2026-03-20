import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import ClientManager from "./ClientManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function ClientesPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const clients = await prisma.client.findMany({ orderBy: { id: "desc" } });
    const services = await prisma.service.findMany({ orderBy: { id: "desc" } });

    return <ClientManager initialClients={clients} services={services} role={session.role} />;
}

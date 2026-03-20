import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import ServiceManager from "./ServiceManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function ServiciosPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const services = await prisma.service.findMany({ orderBy: { id: "desc" } });

    return <ServiceManager initialServices={services} role={session.role} />;
}

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import UserManager from "./UserManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function UsuariosPage() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') redirect("/");

    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, mustChangePassword: true }, orderBy: { id: "desc" } });

    return <UserManager initialUsers={users} currentUserId={session.id} />;
}

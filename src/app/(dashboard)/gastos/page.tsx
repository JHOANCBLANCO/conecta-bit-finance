import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import ExpenseManager from "./ExpenseManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function GastosPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });

    return <ExpenseManager initialExpenses={expenses} role={session.role} />;
}

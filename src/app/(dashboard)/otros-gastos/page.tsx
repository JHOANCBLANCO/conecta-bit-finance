import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import OtherExpenseManager from "./OtherExpenseManager";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export default async function OtherExpensesPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const expenses = await prisma.otherExpense.findMany({ orderBy: { date: "desc" } });

    return <OtherExpenseManager initialExpenses={expenses} role={session.role} />;
}

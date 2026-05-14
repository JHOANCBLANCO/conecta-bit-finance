import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getUpcomingBillings } from "@/app/actions";
import CuentasPendientesManager from "./CuentasPendientesManager";

export default async function CuentasPendientesPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const { dueSales } = await getUpcomingBillings();

    return <CuentasPendientesManager dueSales={dueSales} role={session.role} />;
}

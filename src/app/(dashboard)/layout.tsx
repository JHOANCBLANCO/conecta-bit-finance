import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <DashboardLayout sessionData={session}>
            {children}
        </DashboardLayout>
    );
}

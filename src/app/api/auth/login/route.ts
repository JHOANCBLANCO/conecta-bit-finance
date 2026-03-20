import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        // Convertimos a minúscula para que el login sea case-insensitive (ignorando mayúsculas)
        const emailLowerCase = email.toLowerCase();

        // Si la base de datos está vacía, permitimos un login por defecto para el primer acceso y creamos el super admin.
        let user = await prisma.user.findUnique({ where: { email: emailLowerCase } });

        if (!user) {
            // Verificamos si no hay usuarios en la DB para setear el inicial
            const count = await prisma.user.count();
            if (count === 0 && email === "admin@controlbiz.com" && password === "123456") {
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name: "Administrador Principal",
                        role: "ADMIN"
                    }
                });
            } else {
                return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
        }

        // Crear la sesión JWT
        const sessionData = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
        };

        const sessionToken = await encrypt(sessionData);

        const cookieStore = await cookies();
        cookieStore.set("session", sessionToken, {
            httpOnly: true,
            // Solo activar 'secure' si estamos en producción Y usando HTTPS real (para evitar bloqueos en red local)
            secure: process.env.NODE_ENV === "production" && req.url.startsWith("https"),
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 horas
            path: "/",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

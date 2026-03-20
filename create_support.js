const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function createSupportUser() {
    const email = '1016095229';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('Support user already exists');
        return;
    }
    const hashedPassword = await bcrypt.hash('1016095229', 10);
    await prisma.user.create({
        data: {
            name: 'SOPORTE CENTRAL',
            email: email,
            password: hashedPassword,
            role: 'ADMIN',
            mustChangePassword: false
        }
    });
    console.log('Support user created successfully');
}

createSupportUser().catch(console.error).finally(() => prisma.$disconnect());

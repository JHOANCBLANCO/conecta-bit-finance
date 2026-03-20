const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function updateSupportUser() {
    const oldEmail = '1016095229';
    const newEmail = 'soporte';

    // First make sure 'soporte' doesn't exist
    const existingSoporte = await prisma.user.findUnique({ where: { email: newEmail } });

    if (!existingSoporte) {
        const existingOld = await prisma.user.findUnique({ where: { email: oldEmail } });
        if (existingOld) {
            await prisma.user.update({
                where: { email: oldEmail },
                data: { email: newEmail }
            });
            console.log('Support user email updated to soporte');
        } else {
            const hashedPassword = await bcrypt.hash('1016095229', 10);
            await prisma.user.create({
                data: {
                    name: 'SOPORTE CENTRAL',
                    email: newEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    mustChangePassword: false
                }
            });
            console.log('Support user created with email soporte');
        }
    } else {
        console.log('Support user soporte already exists');
    }
}

updateSupportUser().catch(console.error).finally(() => prisma.$disconnect());

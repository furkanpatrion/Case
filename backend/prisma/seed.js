const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Create System Admin
    await prisma.user.upsert({
        where: { email: 'sysadmin@patrion.com' },
        update: {},
        create: {
            email: 'sysadmin@patrion.com',
            password: hashedPassword,
            role: 'SYSTEM_ADMIN',
        },
    });

    // 2. Create Company
    const company = await prisma.company.upsert({
        where: { name: 'Patrion Corp' },
        update: {},
        create: {
            name: 'Patrion Corp',
        },
    });

    // 3. Create Company Admin
    await prisma.user.upsert({
        where: { email: 'compadmin@patrion.com' },
        update: {},
        create: {
            email: 'compadmin@patrion.com',
            password: hashedPassword,
            role: 'COMPANY_ADMIN',
            companyId: company.id
        },
    });

    // 4. Create Regular User
    await prisma.user.upsert({
        where: { email: 'user@patrion.com' },
        update: {},
        create: {
            email: 'user@patrion.com',
            password: hashedPassword,
            role: 'USER',
            companyId: company.id
        },
    });

    // 5. Create Sensor
    await prisma.sensor.upsert({
        where: { sensorExternalId: 'temp_sensor_01' },
        update: {},
        create: {
            sensorExternalId: 'temp_sensor_01',
            name: 'Main Temperature Sensor',
            type: 'Environment',
            companyId: company.id,
            metadata: { location: 'Factory Floor', unit: 'Celsius' }
        },
    });

    console.log('Seed completed successfully. Passwords: admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

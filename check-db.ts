
import prisma from './src/model/index';

async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
        const users = await prisma.user.findMany({ take: 5 });
        console.log('Users:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

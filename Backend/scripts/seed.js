import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../Models/DB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected for seeding...');

        // Seed admin user
        const existingAdmin = await User.findOne({ email: 'quiz@gmail.com' });
        if (!existingAdmin) {
            await User.create({
                registrationId: 'quiz001',
                firstName: 'quiz',
                lastName: 'buzz',
                email: 'quiz@gmail.com',
                phone: '9876543210',
                isAdmin: true,
                isDeleted: false,
            });
            console.log('Admin user seeded.');
        } else {
            console.log('Admin user already exists.');
        }

        // Seed test participant
        const existingParticipant = await User.findOne({ registrationId: 'QUIZ-001001' });
        if (!existingParticipant) {
            await User.create({
                registrationId: 'QUIZ-001001',
                firstName: 'Test',
                lastName: 'User',
                email: 'quizbuzz@gmail.com',
                phone: '7248988485',
                isAdmin: false,
                isDeleted: false,
            });
            console.log('Test participant seeded.');
        } else {
            console.log('Test participant already exists.');
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();

import mongoose from 'mongoose';
import { DEFAULT_DOMAIN_NAMES, normalizeDomainName, toDomainKey } from '../utils/domainCatalog.js';
import { Contest as ContestModel } from './contest.model.js';
import { ContestRegistration as ContestRegistrationModel } from './contest-registration.model.js';
import { Message as MessageModel } from './message.model.js';
import { Payment as PaymentModel } from './payment.model.js';
import { Question as QuestionModel } from './question.model.js';
import { ProctoringEvent as ProctoringEventModel } from './proctoring-event.model.js';
import { Submission as SubmissionModel } from './submission.model.js';

const userSchema = new mongoose.Schema({
    registrationId: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    password: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    college: { type: String },
    department: { type: String },
    isAdmin: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ registrationId: 1 }, { sparse: true });
userSchema.index({ phone: 1 }, { sparse: true });

const domainSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, lowercase: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

domainSchema.pre('validate', function (next) {
    const normalizedName = normalizeDomainName(this.name);
    this.name = normalizedName;
    this.key = toDomainKey(normalizedName);
    next();
});

domainSchema.index({ key: 1 }, { unique: true });
domainSchema.index({ name: 1, isDeleted: 1 });

const certificatesSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
    url: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

certificatesSchema.index({ userRef: 1, contestRef: 1 });

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    device: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

sessionSchema.index({ userId: 1, isActive: 1 });

const settingsSchema = new mongoose.Schema({
    // General Settings
    platformName: { type: String, default: 'Quizbuzz' },
    supportEmail: { type: String },
    contactNumber: { type: String },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    maintenanceMode: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },

    // Contest Settings
    defaultDuration: { type: Number, default: 60 },
    allowPaidContests: { type: Boolean, default: true },
    minEntryFee: { type: Number, default: 0 },
    maxParticipantsLimit: { type: Number, default: 1000 },
    autoStart: { type: Boolean, default: false },
    autoEnd: { type: Boolean, default: true },
    defaultCutOff: { type: Number, default: 50 },

    // Question Settings
    defaultQuestionsPerContest: { type: Number, default: 20 },
    difficultyLevels: { type: [String], default: ['easy', 'medium', 'hard'] },
    negativeMarking: { type: Boolean, default: false },
    marksPerQuestion: { type: Number, default: 1 },
    timePerQuestion: { type: Number, default: 60 },

    // Proctoring & Security
    tabSwitchLimit: { type: Number, default: 3 },
    forceFullscreen: { type: Boolean, default: false },
    maxLoginAttempts: { type: Number, default: 5 },
    sessionTimeout: { type: Number, default: 1440 }, // in minutes

    // User & Auth Settings
    allowRegistration: { type: Boolean, default: true },
    emailVerification: { type: Boolean, default: false },
    otpLogin: { type: Boolean, default: true },

    // Payment Settings
    gateway: { type: String, enum: ['RazorPay', 'Stripe'], default: 'RazorPay' },
    apiKey: { type: String },
    secretKey: { type: String },
    currency: { type: String, default: 'INR' },
    platformCommission: { type: Number, default: 10 },
    enableWallet: { type: Boolean, default: false },

    // SEO & Analytics
    metaDescription: { type: String },
    googleAnalyticsId: { type: String }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Contest = ContestModel;
export const ContestRegistration = ContestRegistrationModel;
export const Message = MessageModel;
export const Payment = PaymentModel;
export const Question = QuestionModel;
export const ProctoringEvent = ProctoringEventModel;
export const Submission = SubmissionModel;
export const Domain = mongoose.models.Domain || mongoose.model('Domain', domainSchema);
export const Certificate = mongoose.models.Certificate || mongoose.model("Certificate", certificatesSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

const seedDefaultDomains = async () => {
    const operations = DEFAULT_DOMAIN_NAMES.map((domainName, index) => ({
        updateOne: {
            filter: { key: toDomainKey(domainName) },
            update: {
                $set: {
                    name: normalizeDomainName(domainName),
                    key: toDomainKey(domainName),
                    displayOrder: index,
                    isActive: true,
                    isDeleted: false
                }
            },
            upsert: true
        }
    }));

    if (operations.length > 0) {
        await Domain.bulkWrite(operations);
    }
};

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');

        try {
            await seedDefaultDomains();
            console.log('Default domains synchronized');
        } catch (domainSeedError) {
            console.error('Failed to synchronize default domains', domainSeedError);
        }
    } catch (error) {
        console.error('MongoDB connection failed', error);
        process.exit(1);
    }
};

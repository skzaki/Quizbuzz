import slugify from "slugify";
import mongoose from 'mongoose';

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

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true },
    correctOptionText: { type: String, required: true },
    domain: { type: String, required: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true },
    hint: { type: String },
    explanation: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

const contestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, immutable: true },
    description: { type: String },
    details: { type: String },
    topics: [{ type: String }],
    domainDistribution: [{
        name: { type: String, required: true },
        percentage: { type: Number, required: true, min: 10, max: 100 }
    }],
    rules: [{ type: String }],
    registerFee: { type: Number, required: true },
    duration: { type: Number },
    cutOff: { type: Number },
    startTime: { type: Date, required: true },
    deadline: { type: Date, required: true },
    // Explicit status field: draft → upcoming → ongoing → completed
    status: {
        type: String,
        enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    QuestionBank: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    prizes: [{
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        benefits: [{ type: String }]
    }],
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

contestSchema.index({ slug: 1, isDeleted: 1 });
contestSchema.index({ startTime: 1, isDeleted: 1 });
contestSchema.index({ status: 1, isDeleted: 1 });

contestSchema.pre("validate", function (next) {
    if (this.title && !this.slug) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }
    next();
});

const certificatesSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
    url: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

certificatesSchema.index({ userRef: 1, contestRef: 1 });

const paymentsSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    orderId: { type: String },
    paymentId: { type: String },
    amount: { type: Number },
    status: { type: String, default: "pending" },
    description: { type: String },
    adminNote: { type: String },
    provider: { type: String, default: 'RazorPay' },
    metadata: {
        ip: { type: String },
        userAgent: { type: String }
    },
    isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

paymentsSchema.index({ orderId: 1 });
paymentsSchema.index({ paymentId: 1 }, { sparse: true });
paymentsSchema.index({ userRef: 1, isDeleted: 1 });
paymentsSchema.index({ contestRef: 1, status: 1, isDeleted: 1 });

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

const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        answer: { type: String },
        answerIndex: Number,
        isCorrect: Boolean,
        correctAnswer: String,
        submittedAt: { type: Date, default: Date.now },
    }],
    score: { type: Number },
    totalQuestions: Number,
    status: { type: String, enum: ['submitted', 'evaluated'], default: 'submitted' }
}, { timestamps: true });

submissionSchema.index({ userId: 1, contestId: 1 }, { unique: true });
submissionSchema.index({ contestId: 1, score: -1, createdAt: 1 });

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
export const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentsSchema);
export const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export const Certificate = mongoose.models.Certificate || mongoose.model("Certificate", certificatesSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed', error);
        process.exit(1);
    }
};

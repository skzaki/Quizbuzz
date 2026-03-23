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
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
    password: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true },
    correctOptionText: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true },
    hint: { type: String },
    explanation: { type: String },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const contestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, immutable: true },
    description: { type: String },
    details: { type: String },
    topics: [{ type: String }],
    rules: [{ type: String }],
    registerFee: { type: Number, required: true },
    duration: { type: Number },
    cutOff: { type: Number },
    startTime: { type: Date, required: true },
    deadline: { type: Date, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    QuestionBank: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    prizes: [{
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        benefits: [{ type: String }]
    }],
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

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
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

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
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

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

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Contest = mongoose.models.Contest || mongoose.model("Contest", contestSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentsSchema);
export const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export const Certificate = mongoose.models.Certificate || mongoose.model("Certificate", certificatesSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
        // Small delay to ensure models are ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Auto-seed admin user if not exists
        const existing = await User.findOne({ email: 'quiz@gmail.com' });
        if (!existing) {
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
        }
    } catch (error) {
        console.error('MongoDB connection failed', error);
        process.exit(1);
    }
};

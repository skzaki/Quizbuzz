import slugify from "slugify";

import mongoose from 'mongoose';

const userSchema = new  mongoose.Schema({
    registrationId: { type: String },
    firstName: {type: String },
    lastName: {type: String },
    password: { type: String},
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: {type: Number },
    college: {type: String },
    department: {type: String },
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

const AdminSchema = new  mongoose.Schema({
    password: { type: String},
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

const QuestionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true},
    correctOptionText: { type: String, required: true},
    difficulty: { type: String, enum:['easy', 'medium', 'hard'], required:true, index:true },
    hint: {type: String},
    explanation: { type: String },
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });



const contestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, immutable: true},
    description: { type: String },
    details: { type: String },
    topics: { type: String },
    rules: [ { type: String } ],
    registerFee: { type: Number, required: true },
    duration: { type: String },
    cutOff: { type: Number },
    startTime: { type: Date, required: true },
    deadline: { type: Date, required: true },
    participants: [ { type: mongoose.Schema.Types.ObjectId, ref: "User" } ],
    QuestionBank: [ { type: mongoose.Schema.Types.ObjectId, ref: "Question" } ],
    prizes: [{
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        benefits: [{ type: String }]
    }],
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

contestSchema.pre("validate", function (next) {
    if (this.title && !this.slug) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }
    next();
});


const  certificatesSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
    url: { type: String}, 
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

const paymentsSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    contestRef: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    orderId: { type: String },
    paymentId: { type: String },
    amount: { type: Number },
    status: {type: String, default: "pending" },
    description: { type: String, },
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true }, // Add this for JWT reference
    isActive: { type: Boolean, default: true }, // Track active status
    joinedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    device: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }, // Browser/app info
    lastActivity: { type: Date, default: Date.now }, // Track activity
}, { timestamps: true });

// Index for faster queries
sessionSchema.index({ userId: 1, isActive: 1 });



const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true },
    answers: [{
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
            answer: { type: String },
            answerIndex: Number,
            isCorrect: Boolean,
            submittedAt: { type: Date, default: Date.now },
        }],
    score: { type: Number },
    totalQuestions: Number,
    status: { type: String, enum: ['submitted', 'evaluated'], default: 'submitted' }

}, { timestamps: true });

// Indexing
submissionSchema.index({ userId: 1, contestId: 1 }, { unique: true });
sessionSchema.index({ userId: 1, contestId: 1 });


export const Admin = mongoose.model("Admin", AdminSchema);
export const User = mongoose.model("User", userSchema);
export const Contest = mongoose.model("Contest", contestSchema);
export const Payment = mongoose.model("Payment", paymentsSchema);
export const Question = mongoose.model("Question", QuestionSchema);
export const Certificate = mongoose.model("Certificate", certificatesSchema);
export const Session = mongoose.model("Session", sessionSchema);
export const Submission = mongoose.model("Submission", submissionSchema);


export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed', error);
        process.exit(1);
    }
};

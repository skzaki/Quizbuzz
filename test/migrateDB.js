import fs from "fs";
import path from "path";
import {
    Contest,
    Payment,
    User,
    connectDB
} from "./DB.js"; // adjust path if needed

// Paths to your JSON files
const usersFile = path.join("./quizBuzz-registration.users.json");
const paymentsFile = path.join("./quizBuzz-registration.payments.json");

async function migrateData() {
  await connectDB();

  try {
    // 1️⃣ Check or Create Contest
    let contest = await Contest.findOne({ title: "QuizBuzz-3" });
    if (!contest) {
      contest = await Contest.create({
        title: "QuizBuzz-3",
        description: "Technical Quiz Competition Edition 3.",
        rules: [
            "Quizbuzz - Technical Quiz Competition, hosted by YSM Info Solution, is a unique event targeting over 10,000 participants.",
            "The competition consists of 100 multiple-choice questions (MCQs) to be completed within 40 minutes.",
            "Negative marking will apply, with 0.25 marks deducted for each incorrect answer.",
            "Once the contest is completed, participants must submit it.",
            "If the allotted time elapses, the contest will be auto-submitted.",
            "Merit ranking will be based on both time taken and accuracy.",
            "If two or more candidates have the same score, the candidate who submitted their contest entry in the shortest time will be given priority.",
            "If both the scores and submission times are identical for multiple candidates, the prizes will be equally shared among those candidates.",
            "Participants are required to prepare using the provided resources according to the syllabus.",
            "You can participate in the competition online using any device - mobile, laptop or desktop.",
            "During the contest if electricity breakups or if your mobile gets hanged or any internet issue regarding your system organisers will not be responsible for the same.",
            "Each correct answer earns you +1 mark, while incorrect answers will result in a deduction of 0.25 marks."
        ],
        registerFee: 99,
        duration: "50 minutes",
        cutOff: 50,
        startTime: new Date("2025-09-14T17:00:00.000Z"),
        deadline: new Date("2025-09-14T18:00:00.000Z"),
        prizes: [
          {
            rankFrom: 1,
            rankTo: 1,
            amount: 5000,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
          {
            rankFrom: 2,
            rankTo: 2,
            amount: 4000,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
          {
            rankFrom: 3,
            rankTo: 3,
            amount: 3000,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
          {
            rankFrom: 4,
            rankTo: 5,
            amount: 1500,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
          {
            rankFrom: 6,
            rankTo: 15,
            amount: 1000,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
          {
            rankFrom: 16,
            rankTo: 25,
            amount: 500,
            currency: "INR",
            benefits: ["AI Internship Program", "Certificate Of Achievement","Medal Of Recognition"]
          },
        ]
      });
      console.log(`✅ Contest created: ${contest._id}`);
    } else {
      console.log(`ℹ Contest already exists: ${contest._id}`);
    }

    const contestId = contest._id;

    // 2️⃣ Create Users with Duplicate Check
    const usersData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    const userIdMap = new Map(); // oldId -> newId
    let newUsersCount = 0;

    for (const u of usersData) {
      let existingUser = await User.findOne({ email: u.email.trim().toLowerCase() });

      let phoneNumber = null;
        if (u.phone) {
        // Remove spaces and non-digits
        const cleaned = String(u.phone).replace(/\D/g, "");
            phoneNumber = cleaned ? Number(cleaned) : null;
        }
       
        if (existingUser) {
            userIdMap.set(u._id.$oid, existingUser._id);
        } else {
            const newUser = new User({
                _id: u._id.$oid,
                registrationId: u.registrationId || `QUIZ-${u._id.$oid.toString().slice(-6).toUpperCase()}`,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: phoneNumber,
                college: u.college,
                department: u.department,
                isDeleted: u.hidden || false
            });
            const savedUser = await newUser.save();
            userIdMap.set(u._id.$oid, savedUser._id);
            newUsersCount++;
        }
    }
    console.log(`✅ Users processed. New: ${newUsersCount}, Total Mapped: ${userIdMap.size}`);

    // 3️⃣ Create Payments with Duplicate Check
    const paymentsData = JSON.parse(fs.readFileSync(paymentsFile, "utf8"));
    const paidUserIds = [];
    let newPaymentsCount = 0;

    for (const p of paymentsData) {
    const mappedUserId = userIdMap.get(p.userRef.$oid);
    if (!mappedUserId) {
        console.warn(`⚠ Skipping payment ${p.orderId}, user not found`);
        continue;
    }

    let existingPayment = await Payment.findOne({ orderId: p.orderId });
    if (existingPayment) {
        continue; // skip duplicates
    }

    // 🔹 Find the user in usersData to get paymentId if missing in payment JSON
    let paymentIdToUse = p.paymentId || null;
    if (!paymentIdToUse) {
        const originalUser = usersData.find(u => u._id.$oid === p.userRef.$oid);
        if (originalUser && originalUser.paymentId) {
        paymentIdToUse = originalUser.paymentId;
        }
    }

    await Payment.create({
        userRef: mappedUserId,
        contestRef: contestId,
        orderId: p.orderId,
        paymentId: paymentIdToUse || undefined, // use from user JSON if missing
        amount: p.amount,
        status: p.status,
        description: p.description || "",
        isDeleted: p.hidden || false
    });

    newPaymentsCount++;
    if (p.status === "paid") {
        paidUserIds.push(mappedUserId);
    }
    }
    console.log(`✅ Payments processed. New: ${newPaymentsCount}, Paid: ${paidUserIds.length}`);

    //  Update Contest participants
    if (paidUserIds.length > 0) {
      await Contest.updateOne(
        { _id: contestId },
        { $addToSet: { participants: { $each: paidUserIds } } }
      );
      console.log(`✅ Contest participants updated with ${paidUserIds.length} paid users`);
    } else {
      console.log(`ℹ No new paid users to add to contest participants`);
    }

    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
}

migrateData();

import { Contest } from "./Models/DB.js";
import {
    getUserState,
    markUserDisconnected,
    markUserReconnected,
    saveUserState,
    storeCorrectAnswers
} from "./store/contestStateService.js";

export default function initSocket(io) {
    console.log("Initial websockets");
    const scheduledStarts = new Map();

    io.on("connection", (socket) => {
        console.log("✅ New client connected", socket.id);

        socket.on("join-waiting-room", async ({ contestId, userId, startTime }) => {
            socket.userId = userId;
            socket.contestId = contestId;
            
            // Check if the user already has saved state (resume flow)
            const savedState = await getUserState(contestId, userId);
            if (savedState) {
                await markUserReconnected(contestId, userId);
                socket.emit("resume-quiz", savedState);
                console.log(`🔄 Resumed ${userId} from Q${savedState.currentQuestion}`);
            }

            const now = Date.now();
            const quizStartTime = new Date(startTime).getTime();

            if (now >= quizStartTime || scheduledStarts.get(contestId)?.started) {
                socket.join(`quiz-${contestId}`);
                socket.emit("quiz-started", { contestId });
                console.log(`⚡ ${userId} joined quiz room directly for ${contestId}`);
                return;
            }

            socket.join(`waiting-${contestId}`);
            console.log(`📢 ${userId} joined waiting room for contest ${contestId}`);
            io.to(`waiting-${contestId}`).emit("participant-joined", { userId });

            if (!scheduledStarts.has(contestId)) {
                scheduleQuizStart(io, contestId, startTime);
            }
        });

        socket.on("leave-waiting-room", ({ contestId, userId }) => {
            socket.leave(`waiting-${contestId}`);
            if (socket.userId === userId) {
                delete socket.userId;
                delete socket.contestId;
            }
            console.log(`🚪 ${userId} left waiting room for contest ${contestId}`);
            io.to(`waiting-${contestId}`).emit("participant-left", { userId });
        });

        socket.on("start-quiz", ({ contestId }) => {
            console.log(`🚀 Starting quiz for contest ${contestId}`);

            const waitingRoom = `waiting-${contestId}`;
            const quizRoom = `quiz-${contestId}`;

            io.in(waitingRoom).socketsJoin(quizRoom);
            io.in(waitingRoom).socketsLeave(waitingRoom);
            io.to(quizRoom).emit("quiz-started", { contestId });

            const scheduled = scheduledStarts.get(contestId);
            if (scheduled?.timeout) clearTimeout(scheduled.timeout);
            scheduledStarts.set(contestId, { started: true });
        });

      socket.on("save-progress", async ({ contestId, userId, currentQuestion, answers }) => {
        console.log(`💾 Progress received for ${userId} in contest ${contestId}: Q${currentQuestion}`);

        const existing = await getUserState(contestId, userId) || {};
        let mergedAnswers = existing.answers || [];

        const map = new Map(mergedAnswers.map(a => [a.questionId, a]));

        for (const ans of answers) {
            if (ans.answer !== "" && ans.answer !== null && ans.answer !== undefined) {
                // overwrite only if new answer is valid
                map.set(ans.questionId, ans);
            } else if (!map.has(ans.questionId)) {
                // if question has never been saved before, store it as unanswered
                map.set(ans.questionId, ans);
            }
            // else: skip empty overwrite to preserve previous answer
        }

        const updated = {
            ...existing,
            currentQuestion,
            answers: Array.from(map.values()),
            disconnected: false,
            updatedAt: Date.now()
        };

        await saveUserState(contestId, userId, updated);

        console.log(`💾 Saved state for ${userId} in ${contestId} (answers: ${updated.answers.length})`);
    });


        socket.on("heartbeat", async ({ contestId, userId, questionIndex }) => {
            console.log(`💓 Heartbeat from ${userId} at Q${questionIndex}`);
            // Save last active question without answers
            const savedState = await getUserState(contestId, userId) || {};
            await saveUserState(contestId, userId, {
                ...savedState,
                currentQuestion: questionIndex
            });
        });

        socket.on("get-room-status", ({ contestId, room }) => {
            const getParticipants = (roomName) => {
                const roomData = io.sockets.adapter.rooms.get(roomName);
                const participants = [];

                if (roomData) {
                    for (const socketId of roomData) {
                        const s = io.sockets.sockets.get(socketId);
                        if (s?.userId) participants.push(s.userId);
                    }
                }

                return {
                    room: roomName,
                    participants,
                    count: participants.length
                };
            };

            if (room) {
                socket.emit("room-status", getParticipants(room));
                return;
            }

            const waitingRoom = `waiting-${contestId}`;
            const quizRoom = `quiz-${contestId}`;

            socket.emit("room-status", {
                waiting: getParticipants(waitingRoom),
                quiz: getParticipants(quizRoom)
            });
        });

        socket.on("disconnect", async () => {
            console.log("❌ Client disconnected", socket.id);
            if (socket.contestId && socket.userId) {
                await markUserDisconnected(socket.contestId, socket.userId);
                console.log(`⚠️ ${socket.userId} marked disconnected but progress saved`);
            }
        });
    });

   async function scheduleQuizStart(io, contestSlug, startTime) {
        const delay = new Date(startTime) - new Date();
        
        if (delay > 0) {
            console.log(`⏳ Quiz ${contestSlug} will start in ${delay / 1000} seconds`);

            const timeout = setTimeout(async () => {
                console.log(`🚀 Starting quiz ${contestSlug}`);

                // Move participants from waiting room to quiz room
                io.in(`waiting-${contestSlug}`).socketsJoin(`quiz-${contestSlug}`);
                io.in(`waiting-${contestSlug}`).socketsLeave(`waiting-${contestSlug}`);

                // Notify clients
                io.to(`quiz-${contestSlug}`).emit("quiz-started", { contestId: contestSlug });
                
                scheduledStarts.set(contestSlug, { started: true });
            }, delay);

            scheduledStarts.set(contestSlug, { timeout, startTime, started: false });

            // Fetch contest + questions (with correct answers)
            const contest = await Contest.findOne({ slug: contestSlug })
                .select('_id title QuestionBank')
                .populate('QuestionBank');

            if (!contest) {
                console.error(`❌ Contest not found: ${contestSlug}`);
                return;
            }

            // Extract correct answers
            const questions = contest.QuestionBank;
            
            await storeCorrectAnswers(contestSlug, questions);

        } else {
            console.log(`⚡ Contest ${contestSlug} already started`);
            scheduledStarts.set(contestSlug, { started: true });
        }
    }

}

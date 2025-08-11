import {
    getUserState,
    markUserDisconnected,
    markUserReconnected,
    saveUserState
} from "./service/contestStateService.js";

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
            console.log(`💾 Progress saved for ${userId} in contest ${contestId}`);
            await saveUserState(contestId, userId, {
                currentQuestion,
                answers,
                disconnected: false
            });
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

    function scheduleQuizStart(io, contestId, startTime) {
        const delay = new Date(startTime) - new Date();
        if (delay > 0) {
            console.log(`⏳ Quiz ${contestId} will start in ${delay / 1000} seconds`);
            const timeout = setTimeout(() => {
                console.log(`🚀 Starting quiz ${contestId}`);
                io.in(`waiting-${contestId}`).socketsJoin(`quiz-${contestId}`);
                io.in(`waiting-${contestId}`).socketsLeave(`waiting-${contestId}`);
                io.to(`quiz-${contestId}`).emit("quiz-started", { contestId });
                scheduledStarts.set(contestId, { started: true });
            }, delay);
            scheduledStarts.set(contestId, { timeout, startTime, started: false });
        } else {
            scheduledStarts.set(contestId, { started: true });
        }
    }
}

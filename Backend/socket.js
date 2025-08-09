export default function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("✅ New client connected", socket.id);

    // Join waiting room
    socket.on("join-waiting-room", ({ contestId, userId }) => {
      socket.join(`contest-${contestId}`);
      console.log(`📢 ${userId} joined waiting room for contest ${contestId}`);
      io.to(`contest-${contestId}`).emit("participant-joined", { userId });
    });

    // Leave waiting room
    socket.on("leave-waiting-room", ({ contestId, userId }) => {
      socket.leave(`contest-${contestId}`);
      console.log(`🚪 ${userId} left waiting room for contest ${contestId}`);
      io.to(`contest-${contestId}`).emit("participant-left", { userId });
    });

    // Save progress
    socket.on("save-progress", ({ contestId, userId, answers }) => {
      console.log(`💾 Progress saved for ${userId} in contest ${contestId}`);
      // TODO: Save to DB
    });

    // Proctoring frames
    socket.on("proctoring-frame", ({ contestId, userId, frame }) => {
      console.log(`📸 Proctoring frame from ${userId} in contest ${contestId}`);
      // TODO: Save frame / run detection
    });

    // Heartbeat
    socket.on("heartbeat", ({ contestId, userId, questionIndex }) => {
      console.log(`💓 Heartbeat from ${userId} at Q${questionIndex}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected", socket.id);
    });
  });
}

import * as liveService from "../../services/live.service.js";
import { findUserById } from "../../repositories/user.repository.js";
import * as proctoringRepo from "../../repositories/proctoring.repository.js";
import * as submissionRepo from "../../repositories/submission.repository.js";

export function registerQuizHandlers(io, socket) {
  socket.on("join-waiting-room", async ({ contestId, startTime }) => {
    socket.contestId = contestId;

    const savedState = await liveService.getUserState(contestId, socket.userId);

    if (savedState) {
      await liveService.markReconnected(contestId, socket.userId);
      socket.join(`quiz-${contestId}`);
      await liveService.incrementConnectedCount(contestId);
      socket.emit("resume-quiz", savedState);
      return;
    }

    socket.join(`waiting-${contestId}`);
    await liveService.incrementConnectedCount(contestId);

    const count = await liveService.getParticipantCount(contestId);
    io.to(`waiting-${contestId}`).emit("participant-count", { count });

    await liveService.scheduleQuizStart(io, contestId, startTime);
  });

  socket.on("join-admin-room", async ({ contestId }) => {
    const user = await findUserById(socket.userId, "_id isAdmin");

    if (!user?.isAdmin) {
      socket.emit("admin-access-denied", { contestId });
      return;
    }

    socket.join(`admin-${contestId}`);

    socket.emit("live-stats", {
      connected: await liveService.getConnectedCount(contestId),
      submitted: await submissionRepo.countByContest(contestId),
      flagged: await proctoringRepo.countFlaggedUsers(contestId)
    });
  });

  socket.on("join-admin-room", async ({ contestId }) => {
    const user = await findUserById(socket.userId, "_id isAdmin firstName lastName email");

    if (!user?.isAdmin) {
      socket.emit("admin-access-denied", { contestId });
      return;
    }

    socket.join(`admin-${contestId}`);

    socket.emit("live-stats", {
      connected: await liveService.getConnectedCount(contestId),
      submitted: await submissionRepo.countByContest(contestId),
      flagged: await proctoringRepo.countFlaggedUsers(contestId)
    });
  });

  socket.on("save-progress", async ({ contestId, answers, currentQuestion }) => {
    await liveService.saveProgress(contestId, socket.userId, currentQuestion, answers);
  });

  socket.on("heartbeat", async ({ contestId, questionIndex }) => {
    await liveService.updateHeartbeat(contestId, socket.userId, questionIndex);
  });

  socket.on("disconnect", async () => {
    if (socket.contestId && socket.userId) {
      await liveService.markDisconnected(socket.contestId, socket.userId);
    }
  });
}
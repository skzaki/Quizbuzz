import * as proctoringRepo from "../../repositories/proctoring.repository.js";
import { uploadProctoring } from "../../services/s3.service.js";

const MULTIPLE_FACE_WINDOW_MS = 5 * 60 * 1000;
const MULTIPLE_FACE_THRESHOLD = 3;

export function registerProctoringHandlers(io, socket) {
  socket.on("proctoring-event", async ({ contestId, eventType, screenshotBase64 }) => {
    let screenshotUrl = null;

    if (screenshotBase64) {
      screenshotUrl = await uploadProctoring(contestId, socket.userId, screenshotBase64);
    }

    await proctoringRepo.create({
      userId: socket.userId,
      contestId,
      eventType,
      screenshotUrl,
      occurredAt: new Date()
    });

    if (eventType === "MULTIPLE_FACES") {
      const recentCount = await proctoringRepo.countRecentEvents(socket.userId, contestId, eventType, MULTIPLE_FACE_WINDOW_MS);

      if (recentCount > MULTIPLE_FACE_THRESHOLD) {
        socket.emit("proctoring-warning", {
          contestId,
          eventType,
          message: "Multiple faces detected repeatedly."
        });

        io.to(`admin-${contestId}`).emit("flag-participant", {
          userId: socket.userId,
          eventType
        });
      }
    }
  });
}
import { useEffect, useRef } from "react";
import io from "socket.io-client";

const useContestSocket = (questions, answers, currentQ) => {
  const socketRef = useRef(null);
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const contestInfo = JSON.parse(localStorage.getItem("contestInfo") || "{}");

  // --- Setup socket ---
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_WEBSOCKET_URL, {
      path: "/ws/",
      transports: ["websocket"],
      auth: { token: localStorage.getItem("authToken") },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Live contest socket connected:", socketRef.current.id);
      socketRef.current.emit("join-waiting-room", {
        contestId: contestInfo.slug,
        userId: userInfo.registrationId,
        startTime: Date.now(),
      });
    });

    return () => socketRef.current?.disconnect();
  }, []);

  // --- Auto-save every 60s ---
  useEffect(() => {
    if (!questions?.length) return;

    const interval = setInterval(() => {
      const structuredAnswers = questions
        .map((q, i) => {
          if (answers[i] !== null && answers[i] !== undefined && answers[i] !== "") {
            return {
              questionId: q._id,
              answer: q.options[answers[i]],
              answerIndex: answers[i],
              submittedAt: new Date(),
            };
          }
          return null;
        })
        .filter(Boolean);

      if (structuredAnswers.length > 0 && socketRef.current) {
        socketRef.current.emit("save-progress", {
          contestId: contestInfo.slug,
          userId: userInfo.registrationId,
          currentQuestion: currentQ,
          answers: structuredAnswers,
        });
        console.log("📦 Full snapshot auto-saved with answered questions only");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [answers, questions, currentQ, contestInfo.slug, userInfo.registrationId]);

  // --- Delta save (on single answer/skip) ---
  const saveDelta = (questionId, answerIndex, answerText, nextQ) => {
    if (!socketRef.current) return;
    const structuredAnswer = {
      questionId,
      answer: answerText || "",
      answerIndex: answerIndex ?? "",
      submittedAt: new Date(),
    };

    socketRef.current.emit("save-progress", {
      contestId: contestInfo.slug,
      userId: userInfo.registrationId,
      currentQuestion: nextQ,
      answers: [structuredAnswer],
    });

    console.log(`💾 Delta progress emitted for Q${nextQ}`);
  };

  return { socket: socketRef.current, saveDelta };
};

export default useContestSocket;

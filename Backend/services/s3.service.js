export async function uploadProctoring(contestId, userId, screenshotBase64) {
  const timestamp = Date.now();
  const safeContestId = String(contestId);
  const safeUserId = String(userId);
  const extension = screenshotBase64?.startsWith("data:image/png") ? "png" : "jpg";
  return `proctoring/${safeContestId}/${safeUserId}/${timestamp}.${extension}`;
}
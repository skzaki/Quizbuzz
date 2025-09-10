// services/contestApi.js

// Submit contest attempt
export async function submitContest({ contestSlug, userRegistrationId }) {
  const url = `${import.meta.env.VITE_URL}/contests/${contestSlug}/submit`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify({ contestSlug, userRegistrationId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to submit contest");
  }

  return res.json(); // { submissionId, jobId }
}

// Poll submission status
export async function getSubmissionStatus(contestSlug, submissionId) {
  const url = `${import.meta.env.VITE_URL}/contests/${contestSlug}/status/${submissionId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch submission status");
  }

  return res.json(); // { status: "pending" | "completed", score?: number }
}

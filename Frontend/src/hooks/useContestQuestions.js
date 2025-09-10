import CryptoJS from "crypto-js";
import { useEffect, useState } from "react";

const useContestQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const contestInfo = JSON.parse(localStorage.getItem("contestInfo") || "{}");

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1: Try localStorage
      const encrypted = localStorage.getItem(`questions_${contestInfo.slug}`);
      if (encrypted) {
        try {
          const bytes = CryptoJS.AES.decrypt(encrypted, import.meta.env.VITE_SECRET_KEY);
          const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
            setIsLoading(false);
            return;
          }
        } catch {}
      }

      // 2: API call
      const res = await fetch(`${import.meta.env.VITE_URL}/contests/${contestInfo.slug}/questions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });

      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      const qArray = data.questions || data;

      setQuestions(qArray);
      localStorage.setItem(
        `questions_${contestInfo.slug}`,
        CryptoJS.AES.encrypt(JSON.stringify(qArray), import.meta.env.VITE_SECRET_KEY).toString()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return { questions, error, isLoading, retry: fetchQuestions };
};

export default useContestQuestions;

import { Award, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ContestResult = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    // 🚀 TODO: Replace mock data with API call
    // Example:
    // fetch(`/api/contests/${id}/result`, {
    //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    // })
    // .then(res => res.json())
    // .then(data => { setResultData(data); setLoading(false); });

    // Mock Data
    const mockData = {
      userName: "John Doe",
      correctAnswers: 76,
      totalQuestions: 100,
      answers: Array.from({ length: 100 }, (_, i) => ({
        questionNo: i + 1,
        correct: Math.random() > 0.3
      }))
    };
    setTimeout(() => {
      setResultData(mockData);
      setLoading(false);
    }, 800);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading result...</p>
      </div>
    );
  }

  const handleDownloadCertificate = () => {
    // 🚀 TODO: API call or PDF generation logic
    alert("Certificate download triggered (replace with real download)");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Score Card */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-6 md:p-10 text-white shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{resultData.userName}</h1>
              <p className="text-lg mt-1">
                Score:{" "}
                <span className="font-bold">{resultData.correctAnswers}</span> /{" "}
                {resultData.totalQuestions} Correct
              </p>
            </div>
            <button
              onClick={handleDownloadCertificate}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-3 rounded-lg font-semibold shadow-md transition-colors"
            >
              <Award className="h-5 w-5" />
              Download Certificate
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-y-auto h-[65vh]">
            <table className="w-full text-sm md:text-base border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                <tr>
                  <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Question No</th>
                  <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {resultData.answers.map((ans, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 dark:border-gray-700 ${
                      idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/20" : ""
                    }`}
                  >
                    <td className="p-3 text-gray-800 dark:text-gray-200">{ans.questionNo}</td>
                    <td className="p-3">
                      {ans.correct ? (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Correct
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 dark:text-red-400">
                          <XCircle className="h-5 w-5 mr-2" />
                          Incorrect
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContestResult;

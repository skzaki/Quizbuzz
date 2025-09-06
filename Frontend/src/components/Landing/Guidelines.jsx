
const Guidelines = () => {
  return (
    <div className="py-16 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CONTEST</span> <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">GUIDELINES</span>
          </h2>
        </div>

        {/* About the Competition */}
        <div className="bg-white rounded-2xl p-8 border-2 border-blue-200 shadow-xl mb-8 hover:shadow-2xl transition-all duration-300">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">About the Competition:</h3>
          <ol className="space-y-4 text-gray-700 text-lg">
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">1</span>
              <span><strong>Quizbuzz</strong> - Technical Quiz Competition, hosted by YSM Info Solution, is a unique event targeting over 10,000 participants.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">2</span>
              <span>The competition consists of 100 multiple-choice questions (MCQs) to be completed within 40 minutes.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">3</span>
              <span>Negative marking will apply, with 0.25 marks deducted for each incorrect answer.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">4</span>
              <span>Once the contest is completed, participants must submit it.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">5</span>
              <span>If the allotted time elapses, the contest will be auto-submitted.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">6</span>
              <span>Merit ranking will be based on both time taken and accuracy.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">7</span>
              <span>If two or more candidates have the same score, the candidate who submitted their contest entry in the shortest time will be given priority.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">8</span>
              <span>If both the scores and submission times are identical for multiple candidates, the prizes will be equally shared among those candidates.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold min-w-6">9</span>
              <span>Participants are required to prepare using the provided resources according to the syllabus.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-7 h-6 flex items-center justify-center text-xs font-bold min-w-7">10</span>
              <span>You can participate in the competition online using any device - mobile, laptop or desktop.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-7 h-6 flex items-center justify-center text-xs font-bold min-w-7">11</span>
              <span>During the contest if electricity breakups or if your mobile gets hanged or any internet issue regarding your system organisers will not be responsible for the same.</span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-7 h-6 flex items-center justify-center text-xs font-bold min-w-7">12</span>
              <span>Each correct answer earns you +1 mark, while incorrect answers will result in a deduction of 0.25 marks.</span>
            </li>
          </ol>
        </div>

        {/* Additional Guidelines */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">Admission Rights:</h4>
              <p className="text-gray-700">YSM Info Solution reserves all admission rights.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Qualification for Prizes:</h4>
              <p className="text-gray-700">Minimum 50 marks are required to pass.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">Payment and Refund:</h4>
              <p className="text-gray-700">Participation confirmation is considered upon receiving payment from the candidate. No refunds will be initiated.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">Invoice and Receipts:</h4>
              <p className="text-gray-700">Upon successful payment, participants will receive an invoice and receipt on their registered email.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Competition Updates:</h4>
              <p className="text-gray-700">Participants will receive all updates on their registered email ID or whatsapp number.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h4 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">Rewards and Recognition:</h4>
              <p className="text-gray-700">An awards ceremony will be conducted upon the successful completion of Internship provided by YSM to top 25 winners. TDS will be deducted from cash prizes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;
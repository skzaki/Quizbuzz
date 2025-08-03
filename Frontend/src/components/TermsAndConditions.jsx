import { useState } from 'react';

// Terms and Conditions Component
const TermsAndConditions = ({ onAccept, onDecline }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;
    if (isNearBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (accepted && hasScrolledToBottom) {
      onAccept();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Terms & Conditions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please read and accept the terms to continue
        </p>
      </div>

      <div 
        className="h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
        onScroll={handleScroll}
      >
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Contest Terms & Conditions</h3>
          
          <div>
            <h4 className="font-medium mb-2">1. Eligibility</h4>
            <p>Participants must be registered users and provide valid contact information. Only one entry per person is allowed.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Contest Rules</h4>
            <p>The contest will run for the specified duration. Late submissions will not be accepted. Participants must answer questions within the given time limits.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Technical Requirements</h4>
            <p>A stable internet connection is required. Technical issues on the participant's end will not be grounds for contest extensions or re-attempts.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">4. Fair Play</h4>
            <p>Any form of cheating, collaboration, or use of unauthorized aids is strictly prohibited and will result in immediate disqualification.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">5. Prizes and Rewards</h4>
            <p>Prizes will be awarded as specified in the contest announcement. Prize distribution is subject to verification of eligibility and compliance with these terms.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">6. Data Privacy</h4>
            <p>Your participation data will be used for contest administration and may be used for future communications about similar events.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">7. Disputes</h4>
            <p>Contest organizers' decisions are final. Any disputes will be resolved according to the organization's dispute resolution process.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">8. Liability</h4>
            <p>The contest organizers are not liable for any technical failures, network issues, or other circumstances beyond their control that may affect contest participation.</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">9. Modifications</h4>
            <p>The organizers reserve the right to modify these terms or cancel the contest if necessary due to unforeseen circumstances.</p>
          </div>

          <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
            <p className="font-medium">
              By participating in this contest, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
            </p>
          </div>
        </div>
      </div>

      {!hasScrolledToBottom && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            Please scroll down to read all terms and conditions before accepting.
          </div>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={!hasScrolledToBottom}
            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            I have read and agree to the Terms & Conditions for this contest
          </span>
        </label>

        <div className="flex space-x-4">
          <button
            onClick={onDecline}
            className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg transition-colors font-medium"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || !hasScrolledToBottom}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
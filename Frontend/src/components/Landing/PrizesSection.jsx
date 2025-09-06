import { Award, Medal, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrizesSection = () => {
    const navigate = useNavigate();
  const prizes = [
    {
      position: "1st Place",
      cashPrize: "₹ 5,000",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Trophy className="w-12 h-12 text-yellow-600" />,
      gradient: "from-yellow-400 to-orange-400"
    },
    {
      position: "2nd Place",
      cashPrize: "₹ 4,000",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Medal className="w-12 h-12 text-gray-600" />,
      gradient: "from-gray-400 to-gray-500"
    },
    {
      position: "3rd Place",
      cashPrize: "₹ 3,000",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Medal className="w-12 h-12 text-amber-700" />,
      gradient: "from-amber-500 to-amber-600"
    },
    {
      position: "4th - 5th Place",
      cashPrize: "₹ 1,500",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Award className="w-12 h-12 text-green-600" />,
      gradient: "from-green-400 to-green-500"
    },
    {
      position: "6th - 15th Place",
      cashPrize: "₹ 1,000",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Award className="w-12 h-12 text-blue-600" />,
      gradient: "from-blue-400 to-blue-500"
    },
    {
      position: "16th - 25th Place",
      cashPrize: "₹ 500",
      benefits: [
        "AI Internship Program",
        "Certificate Of Achievement",
        "Medal Of Recognition"
      ],
      icon: <Award className="w-12 h-12 text-purple-600" />,
      gradient: "from-purple-400 to-purple-500"
    }
  ];

  return (
    <div className="py-16 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CONTEST</span> <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">PRIZES</span>
          </h2>
        </div>

        {/* Prizes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {prizes.map((prize, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-purple-400 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${prize.gradient} rounded-full mb-4 shadow-md`}>
                  {prize.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{prize.position}</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {prize.cashPrize}
                </div>
                <p className="text-gray-600 text-sm">Cash Prize</p>
              </div>
              
              <ul className="space-y-2 text-gray-700">
                {prize.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center justify-center space-x-2">
                    {/* <span className="text-purple-500  text-lg">•</span> */}
                    <span className="text-md">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-2xl p-8 border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2"></h3>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            HURRY UP!
          </h3>
          <p className="text-2xl mb-6">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">BE FIRST</span> <span className="text-gray-800">TO JOIN THE CONTEST</span>
          </p>
          <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            onClick={() => navigate('/contest/join')}
          >
            Start Contest
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrizesSection;
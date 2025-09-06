import { Play } from 'lucide-react';
import { useState } from 'react';

const TechGenius = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  // Extract video ID from YouTube URL
  const videoId = 'EuFGrGM51CU';

  return (
    <div className="py-16 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Text content */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">TECH GENIUS?</span> <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">WIN BIG PRIZES NOW!</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mt-2 flex-shrink-0 shadow-md"></div>
                <p className="text-gray-700 text-lg">Global exposure to showcase skills.</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mt-2 flex-shrink-0 shadow-md"></div>
                <p className="text-gray-700 text-lg">
                  Access to YSM's tech platform, downloads, manuals, and dedicated portals for learning.
                </p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mt-2 flex-shrink-0 shadow-md"></div>
                <p className="text-gray-700 text-lg">Skill enhancement and knowledge testing.</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mt-2 flex-shrink-0 shadow-md"></div>
                <p className="text-gray-700 text-lg">
                  Opportunities for cash rewards, certificates, and job invitations from industry leaders.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Video */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-blue-400 via-purple-500 to-pink-600 rounded-2xl overflow-hidden aspect-video shadow-2xl border-4 border-white">
              {!isPlaying ? (
                <>
                  {/* YouTube thumbnail */}
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <button
                        onClick={handleVideoPlay}
                        className="bg-red-600 hover:bg-red-700 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 shadow-xl group px-9 py-4"
                    >
                        <Play className="w-9 h-9 text-white fill-white ml-1 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                    </div>
                </>
              ) : (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="rounded-2xl"
                ></iframe>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechGenius;
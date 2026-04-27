import { useEffect, useState } from 'react';
import AboutSection from '../components/Landing/AboutSection';
import Footer from '../components/Landing/Footer';
import Guidelines from '../components/Landing/Guidelines';
import HeroBanner from '../components/Landing/HeroBanner';
import PrizesSection from '../components/Landing/PrizesSection';
import triggerConfetti from '../components/ui/triggerConfetti';

const Landing = () => {
    const [contest, setContest] = useState(null);

    useEffect(() => {
        triggerConfetti();
        fetchActiveContest();
    }, []);

    const fetchActiveContest = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_URL}/contests/active`);
            if (res.ok) {
                const data = await res.json();
                setContest(data);
            }
        } catch (err) {
            console.error('Failed to fetch active contest:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-10 left-10 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <div className="absolute top-32 right-20 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                <div className="absolute top-64 left-1/4 w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <div className="absolute top-96 right-1/3 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-64 left-16 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-32 right-10 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <HeroBanner contest={contest} />
                <AboutSection />
                <Guidelines />
                <PrizesSection />
                <Footer />
            </div>
        </div>
    );
};

export default Landing;
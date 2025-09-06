import confetti from 'canvas-confetti';

// Confetti animation function
const triggerConfetti = () => {
    // Main burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.7 }
    });

    // Additional bursts with delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 80,
        spread: 55,
        origin: { x: 0 }
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 140,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);

    // Continuous smaller bursts
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#d946ef', '#f97316', '#3b82f6']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#d946ef', '#f97316', '#3b82f6']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };


  export default triggerConfetti;
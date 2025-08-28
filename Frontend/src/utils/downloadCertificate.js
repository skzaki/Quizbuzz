import { jsPDF } from "jspdf";

// Helper function to draw images proportionally without stretching
function drawImageProportional(ctx, img, x, y, maxWidth, maxHeight) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(maxWidth / iw, maxHeight / ih); // preserve aspect ratio
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, x + (maxWidth - w) / 2, y + (maxHeight - h) / 2, w, h);
}

const downloadCertificate = (studentName, format = 'png') => {
  if (!studentName || !studentName.trim()) {
    console.error("Please provide a valid student name");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size (A4 ratio)
  canvas.width = 595;
  canvas.height = 842;

  // Load background
  const background = new Image();
  background.src = "/src/assets/certificate.png";

  background.onload = () => {
    drawImageProportional(ctx, background, 0, 0, canvas.width, canvas.height);

    // Load YSM logo
    const ysmLogo = new Image();
    ysmLogo.src = "/src/assets/ysm1.png";

    ysmLogo.onload = () => {
      drawImageProportional(ctx, ysmLogo, canvas.width / 2 - 100, 80, 200, 95);

      // Certificate Title
      const certTitle = new Image();
      certTitle.src = "/src/assets/appre1.png";

      certTitle.onload = () => {
        drawImageProportional(ctx, certTitle, canvas.width / 2 - 80, 280, 150, 70);

        // Certification text
        const certText = new Image();
        certText.src = "/src/assets/cert.png";

        certText.onload = () => {
          drawImageProportional(ctx, certText, canvas.width / 2 - 100, 200, 200, 50);

          // Student Name
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "#B8860B";
          ctx.textAlign = "center";
          ctx.fillText(studentName, canvas.width / 2, 380);

          // Event details
          ctx.font = "20px Arial";
          ctx.fillStyle = "#000080";
          ctx.fillText("has participated in the QUIZBUZZ-3", canvas.width / 2, 430);
          ctx.fillText("Technical Online Quiz Competition", canvas.width / 2, 460);
          ctx.fillText("on 14th September, 2025.", canvas.width / 2, 490);

          // Signature + Stamp
          const signature = new Image();
          signature.src = "/src/assets/sign-with-stamp1.png";

          signature.onload = () => {
            drawImageProportional(ctx, signature, 100, canvas.height - 290, 400, 120);

            // Footer
            const footer = new Image();
            footer.src = "/src/assets/footer11.png";

            footer.onload = () => {
              drawImageProportional(ctx, footer, 80, canvas.height - 140, 435, 65);
              triggerDownload(canvas, studentName, format);
            };

            footer.onerror = () => triggerDownload(canvas, studentName, format);
          };

          signature.onerror = () => {
            const footer = new Image();
            footer.src = "/src/assets/footer11.png";
            footer.onload = () => {
              drawImageProportional(ctx, footer, 0, canvas.height - 60, canvas.width, 60);
              triggerDownload(canvas, studentName, format);
            };
            footer.onerror = () => triggerDownload(canvas, studentName, format);
          };
        };

        certText.onerror = () => {
          // Fallback text
          ctx.font = "18px Arial";
          ctx.fillStyle = "#000080";
          ctx.textAlign = "center";
          ctx.fillText("OF PARTICIPATION", canvas.width / 2, 220);
          ctx.font = "14px Arial";
          ctx.fillText("This is to certify that", canvas.width / 2, 260);

          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "#B8860B";
          ctx.fillText(studentName, canvas.width / 2, 320);

          ctx.font = "14px Arial";
          ctx.fillStyle = "#000080";
          ctx.fillText("has participated in the QUIZBUZZ-3", canvas.width / 2, 360);
          ctx.fillText("Technical Online Quiz Competition", canvas.width / 2, 380);
          ctx.fillText("on 14th September, 2025.", canvas.width / 2, 400);

          triggerDownload(canvas, studentName, format);
        };
      };

      certTitle.onerror = () => {
        ctx.font = "bold 36px serif";
        ctx.fillStyle = "#B8860B";
        ctx.textAlign = "center";
        ctx.fillText("Certificate", canvas.width / 2, 150);
        triggerDownload(canvas, studentName, format);
      };
    };

    ysmLogo.onerror = () => {
      ctx.font = "bold 36px Arial";
      ctx.fillStyle = "#000080";
      ctx.textAlign = "center";
      ctx.fillText("YSM", canvas.width / 2, 100);
      triggerDownload(canvas, studentName, format);
    };
  };

  background.onerror = () => {
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.font = "bold 48px serif";
    ctx.fillStyle = "#B8860B";
    ctx.textAlign = "center";
    ctx.fillText("Certificate", canvas.width / 2, 180);

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#B8860B";
    ctx.fillText(studentName, canvas.width / 2, 330);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#000080";
    ctx.fillText("has participated in the QUIZBUZZ-3", canvas.width / 2, 380);
    ctx.fillText("Technical Online Quiz Competition", canvas.width / 2, 405);
    ctx.fillText("on 14th September, 2025.", canvas.width / 2, 430);

    triggerDownload(canvas, studentName, format);
  };
};

// Helper function to trigger the download
const triggerDownload = (canvas, studentName, format) => {
  if (format.toLowerCase() === 'pdf') {
    // Download as PDF
    const certificateUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pdfWidth = 595.28;
    const pdfHeight = 841.89;

    pdf.addImage(certificateUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${studentName}_QUIZBUZZ-3_certificate.pdf`);
  } else {
    // Download as PNG (default)
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${studentName}_QUIZBUZZ-3_certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
};

export default downloadCertificate;

// Usage examples:
// <button onClick={() => downloadCertificate('Bruce Wayne')}>Download PNG Certificate</button>
// <button onClick={() => downloadCertificate('Bruce Wayne', 'pdf')}>Download PDF Certificate</button>
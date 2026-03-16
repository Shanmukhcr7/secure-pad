import { useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEF01<>{}[]|/\\*+-=_$#@!?abcdef';

export default function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const fontSize = 14;
        let cols: number[] = [];
        let animId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const count = Math.floor(canvas.width / fontSize);
            cols = Array.from({ length: count }, () => Math.random() * -canvas.height);
        };

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            // Fade trail
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px "Share Tech Mono", monospace`;

            cols.forEach((y, i) => {
                const char = CHARS[Math.floor(Math.random() * CHARS.length)];
                const x = i * fontSize;

                // Head char — bright white-green
                const isHead = y > 0 && y < canvas.height;
                if (isHead) {
                    ctx.fillStyle = '#afffb0';
                    ctx.shadowColor = '#00ff41';
                    ctx.shadowBlur = 8;
                } else {
                    // Trail — dimmer green
                    const alpha = Math.max(0.1, 1 - (canvas.height - y) / canvas.height);
                    ctx.fillStyle = `rgba(0, 200, 50, ${alpha * 0.8})`;
                    ctx.shadowBlur = 0;
                }

                ctx.fillText(char, x, y);

                // Reset column when it scrolls past bottom
                if (y > canvas.height + fontSize * 20) {
                    cols[i] = -(Math.random() * canvas.height * 0.5);
                } else {
                    cols[i] = y + fontSize;
                }
            });

            ctx.shadowBlur = 0;
            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0, opacity: 0.55 }}
        />
    );
}

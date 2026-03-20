"use client";

import React, { useEffect, useRef } from 'react';

export default function MatrixBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const resizeCanvas = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // --- Configuración de Nodos de Red (Puntos Conectados) ---
        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
        }

        const nodes: Node[] = [];
        // Optimizando densidad para evitar LAG en procesadores móviles
        const density = Math.min(Math.floor((width * height) / 28000), 65);

        for (let i = 0; i < density; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35, // Aún más lento y elegante
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 1.5 + 1 // Puntos pequeños
            });
        }

        const maxDistance = 160;
        const maxDistSq = maxDistance * maxDistance; // Optimization: Comparación precalculada cuadrática

        let animationFrameId: number;

        const draw = () => {
            // Limpia el canvas (el color de fondo lo inyecta tailwind por debajo para NO gastar CPU)
            ctx.clearRect(0, 0, width, height);

            // BATCH RENDER: Dibujar TODOS LOS PUNTOS de una en la GPU
            ctx.fillStyle = 'rgba(6, 182, 212, 0.8)'; // Cyan-500
            ctx.beginPath();
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                node.x += node.vx;
                node.y += node.vy;

                // Rebote suave en los bordes
                if (node.x <= 0 || node.x >= width) node.vx *= -1;
                if (node.y <= 0 || node.y >= height) node.vy *= -1;

                ctx.moveTo(node.x, node.y);
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            }
            ctx.fill(); // Pinta todos los puntos de un solo golpe ahorrando 95% de llamadas

            // DIBUJAR LÍNEAS CON FILTRO MATEMÁTICO PREVIO
            ctx.lineWidth = 0.8;
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeB = nodes[j];
                    const dx = node.x - nodeB.x;
                    const dy = node.y - nodeB.y;
                    const distSq = dx * dx + dy * dy;

                    // Descarte automático sin pasar por raiz (Alivia enorme procesador matemático CPU)
                    if (distSq < maxDistSq) {
                        const distance = Math.sqrt(distSq); // Recién se calcula la raíz real aquí
                        const opacity = 1 - (distance / maxDistance);

                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(14, 165, 233, ${opacity * 0.4})`; // Sky-500
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(nodeB.x, nodeB.y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
        />
    );
}

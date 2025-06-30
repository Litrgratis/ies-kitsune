import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files
app.get('/api/sse/updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const stages = [
        { stage: 'Idea Architect', progress: 25, builder: 'builder1' },
        { stage: 'Innovation Catalyst', progress: 50, builder: 'builder2' },
        { stage: 'Solution Synthesizer', progress: 75, builder: 'synthesizer' },
        { stage: 'Evaluator', progress: 100, builder: 'evaluator' }
    ];
    let stageIndex = 0;
    const interval = setInterval(() => {
        if (res.finished || stageIndex >= stages.length) {
            clearInterval(interval);
            return;
        }
        res.write(`data: ${JSON.stringify({
            type: 'evolution_progress',
            payload: { ...stages[stageIndex], estimatedTime: 10 - stageIndex * 2 }
        })}\n\n`);
        stageIndex++;
        if (stageIndex >= stages.length) {
            res.write(`data: ${JSON.stringify({
                type: 'consensus_update',
                payload: { quality: 8.8, consensus: 0.86, version: 1.1 }
            })}\n\n`);
            clearInterval(interval);
        }
    }, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 60000);
    req.on('close', () => {
        clearInterval(interval);
        clearTimeout(timeout);
    });
});

// Mock AI API endpoint
app.post('/v1/chat/completions', (req, res) => {
    const { builder, topic, prompt } = req.body;
    
    // Simulate API delay
    setTimeout(() => {
        const responses = {
            builder1: `Analiza: ${topic} wymaga wieloaspektowego podejścia z uwzględnieniem czynników technicznych i społecznych.`,
            builder2: `Wyzwanie: Czy rozważano alternatywne rozwiązania dla ${topic}? Proponuję dodanie mechanizmu gamifikacji.`,
            synthesizer: `Synteza: Łącząc wszystkie propozycje dla ${topic}, optymalnym rozwiązaniem jest hybrydowe podejście.`
        };
        
        res.json({
            response: responses[builder] || `Mock response for ${builder}: ${prompt}`,
            quality: Math.random() * 2 + 7, // 7-9
            confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
        });
    }, Math.random() * 1000 + 500); // 0.5-1.5s delay
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🦊 IES/Kitsune Server running on http://localhost:${PORT}`);
    console.log(`📊 SSE endpoint: http://localhost:${PORT}/api/sse/updates`);
    console.log(`🤖 AI API: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

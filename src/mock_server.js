const express = require('express');
const app = express();
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
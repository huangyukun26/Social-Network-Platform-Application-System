const mongoose = require('mongoose');

const cacheMetricsSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    hits: {
        type: Number,
        required: true
    },
    misses: {
        type: Number,
        required: true
    },
    totalRequests: {
        type: Number,
        required: true
    },
    hitRate: {
        type: Number,
        required: true
    },
    averageLatency: {
        type: Number,
        required: true
    },
    memoryUsage: {
        type: Number,
        required: true
    },
    keysCount: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('CacheMetrics', cacheMetricsSchema); 
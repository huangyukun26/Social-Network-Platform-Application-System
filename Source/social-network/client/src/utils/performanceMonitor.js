class PerformanceMonitor {
    static requestTimes = new Map();
    static cacheHits = 0;
    static cacheMisses = 0;

    static startRequest(key) {
        this.requestTimes.set(key, performance.now());
    }

    static endRequest(key, isCacheHit = false) {
        const startTime = this.requestTimes.get(key);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.requestTimes.delete(key);
            
            if (isCacheHit) {
                this.cacheHits++;
            } else {
                this.cacheMisses++;
            }

            return {
                duration,
                hitRate: (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
            };
        }
        return null;
    }

    static getMetrics() {
        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
        };
    }
}

export default PerformanceMonitor; 
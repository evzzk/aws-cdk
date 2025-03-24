"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStream = void 0;
/**
 * Routines for corking stdout and stderr
 */
const stream = require("stream");
class MemoryStream extends stream.Writable {
    constructor() {
        super(...arguments);
        this.parts = new Array();
    }
    _write(chunk, _encoding, callback) {
        this.parts.push(chunk);
        callback();
    }
    buffer() {
        return Buffer.concat(this.parts);
    }
    clear() {
        this.parts.splice(0, this.parts.length);
    }
    async flushTo(strm) {
        const flushed = strm.write(this.buffer());
        if (!flushed) {
            return new Promise(ok => strm.once('drain', ok));
        }
        return;
    }
    toString() {
        return this.buffer().toString();
    }
}
exports.MemoryStream = MemoryStream;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ya2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvcmtpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7O0dBRUc7QUFDSCxpQ0FBaUM7QUFFakMsTUFBYSxZQUFhLFNBQVEsTUFBTSxDQUFDLFFBQVE7SUFBakQ7O1FBQ1UsVUFBSyxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7SUEwQnRDLENBQUM7SUF4QlEsTUFBTSxDQUFDLEtBQWEsRUFBRSxTQUFpQixFQUFFLFFBQXdDO1FBQ3RGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLFFBQVEsRUFBRSxDQUFDO0lBQ2IsQ0FBQztJQUVNLE1BQU07UUFDWCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxLQUFLO1FBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBMkI7UUFDOUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsT0FBTztJQUNULENBQUM7SUFFTSxRQUFRO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsQ0FBQztDQUNGO0FBM0JELG9DQTJCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUm91dGluZXMgZm9yIGNvcmtpbmcgc3Rkb3V0IGFuZCBzdGRlcnJcbiAqL1xuaW1wb3J0ICogYXMgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdHJlYW0gZXh0ZW5kcyBzdHJlYW0uV3JpdGFibGUge1xuICBwcml2YXRlIHBhcnRzID0gbmV3IEFycmF5PEJ1ZmZlcj4oKTtcblxuICBwdWJsaWMgX3dyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogKGVycm9yPzogRXJyb3IgfCBudWxsKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5wYXJ0cy5wdXNoKGNodW5rKTtcbiAgICBjYWxsYmFjaygpO1xuICB9XG5cbiAgcHVibGljIGJ1ZmZlcigpIHtcbiAgICByZXR1cm4gQnVmZmVyLmNvbmNhdCh0aGlzLnBhcnRzKTtcbiAgfVxuXG4gIHB1YmxpYyBjbGVhcigpIHtcbiAgICB0aGlzLnBhcnRzLnNwbGljZSgwLCB0aGlzLnBhcnRzLmxlbmd0aCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZmx1c2hUbyhzdHJtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmbHVzaGVkID0gc3RybS53cml0ZSh0aGlzLmJ1ZmZlcigpKTtcbiAgICBpZiAoIWZsdXNoZWQpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShvayA9PiBzdHJtLm9uY2UoJ2RyYWluJywgb2spKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcHVibGljIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlcigpLnRvU3RyaW5nKCk7XG4gIH1cbn1cbiJdfQ==
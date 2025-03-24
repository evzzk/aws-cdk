"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkList = void 0;
exports.exec = exec;
exports.flatten = flatten;
exports.chain = chain;
exports.chunks = chunks;
// Helper functions for CDK Exec
const child_process_1 = require("child_process");
/**
 * Our own execute function which doesn't use shells and strings.
 */
function exec(commandLine, options = {}) {
    const proc = (0, child_process_1.spawnSync)(commandLine[0], commandLine.slice(1), {
        stdio: ['ignore', 'pipe', options.verbose ? 'inherit' : 'pipe'], // inherit STDERR in verbose mode
        env: {
            ...process.env,
            ...options.env,
        },
        cwd: options.cwd,
    });
    if (proc.error) {
        throw proc.error;
    }
    if (proc.status !== 0) {
        if (process.stderr) { // will be 'null' in verbose mode
            process.stderr.write(proc.stderr);
        }
        throw new Error(`Command exited with ${proc.status ? `status ${proc.status}` : `signal ${proc.signal}`}`);
    }
    const output = proc.stdout.toString('utf-8').trim();
    return output;
}
/**
 * Flatten a list of lists into a list of elements
 */
function flatten(xs) {
    return Array.prototype.concat.apply([], xs);
}
/**
 * Chain commands
 */
function chain(commands) {
    return commands.filter(c => !!c).join(' && ');
}
/**
 * Split command to chunks by space
 */
function chunks(command) {
    const result = command.match(/(?:[^\s"]+|"[^"]*")+/g);
    return result !== null && result !== void 0 ? result : [];
}
/**
 * A class holding a set of items which are being crossed off in time
 *
 * If it takes too long to cross off a new item, print the list.
 */
class WorkList {
    constructor(items, options = {}) {
        var _a;
        this.items = items;
        this.options = options;
        this.remaining = new Set(this.items);
        this.timeout = (_a = options.timeout) !== null && _a !== void 0 ? _a : 60000;
        this.scheduleTimer();
    }
    crossOff(item) {
        this.remaining.delete(item);
        this.stopTimer();
        if (this.remaining.size > 0) {
            this.scheduleTimer();
        }
    }
    done() {
        this.remaining.clear();
        this.stopTimer();
    }
    stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
    scheduleTimer() {
        this.timer = setTimeout(() => this.report(), this.timeout);
    }
    report() {
        var _a, _b;
        (_b = (_a = this.options).onTimeout) === null || _b === void 0 ? void 0 : _b.call(_a, this.remaining);
    }
}
exports.WorkList = WorkList;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQSxvQkFxQkM7QUFLRCwwQkFFQztBQUtELHNCQUVDO0FBS0Qsd0JBR0M7QUFqREQsZ0NBQWdDO0FBQ2hDLGlEQUEwQztBQUUxQzs7R0FFRztBQUNILFNBQWdCLElBQUksQ0FBQyxXQUFxQixFQUFFLFVBQTBELEVBQUc7SUFDdkcsTUFBTSxJQUFJLEdBQUcsSUFBQSx5QkFBUyxFQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzNELEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxpQ0FBaUM7UUFDbEcsR0FBRyxFQUFFO1lBQ0gsR0FBRyxPQUFPLENBQUMsR0FBRztZQUNkLEdBQUcsT0FBTyxDQUFDLEdBQUc7U0FDZjtRQUNELEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztLQUNqQixDQUFDLENBQUM7SUFFSCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUFDLENBQUM7SUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3RCLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsaUNBQWlDO1lBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFcEQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsT0FBTyxDQUFJLEVBQVM7SUFDbEMsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLEtBQUssQ0FBQyxRQUFrQjtJQUN0QyxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hELENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLE1BQU0sQ0FBQyxPQUFlO0lBQ3BDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUN0RCxPQUFPLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLEVBQUUsQ0FBQztBQUN0QixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQWEsUUFBUTtJQUtuQixZQUE2QixLQUFVLEVBQW1CLFVBQThCLEVBQUU7O1FBQTdELFVBQUssR0FBTCxLQUFLLENBQUs7UUFBbUIsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFKekUsY0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUsvQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQUEsT0FBTyxDQUFDLE9BQU8sbUNBQUksS0FBTSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU0sUUFBUSxDQUFDLElBQU87UUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRU0sSUFBSTtRQUNULElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFTyxTQUFTO1FBQ2YsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZixZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQ3pCLENBQUM7SUFDSCxDQUFDO0lBRU8sYUFBYTtRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFTyxNQUFNOztRQUNaLE1BQUEsTUFBQSxJQUFJLENBQUMsT0FBTyxFQUFDLFNBQVMsbURBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQXJDRCw0QkFxQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBIZWxwZXIgZnVuY3Rpb25zIGZvciBDREsgRXhlY1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5cbi8qKlxuICogT3VyIG93biBleGVjdXRlIGZ1bmN0aW9uIHdoaWNoIGRvZXNuJ3QgdXNlIHNoZWxscyBhbmQgc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZWMoY29tbWFuZExpbmU6IHN0cmluZ1tdLCBvcHRpb25zOiB7IGN3ZD86IHN0cmluZzsgdmVyYm9zZT86IGJvb2xlYW47IGVudj86IGFueSB9ID0geyB9KTogYW55IHtcbiAgY29uc3QgcHJvYyA9IHNwYXduU3luYyhjb21tYW5kTGluZVswXSwgY29tbWFuZExpbmUuc2xpY2UoMSksIHtcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsIG9wdGlvbnMudmVyYm9zZSA/ICdpbmhlcml0JyA6ICdwaXBlJ10sIC8vIGluaGVyaXQgU1RERVJSIGluIHZlcmJvc2UgbW9kZVxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAuLi5vcHRpb25zLmVudixcbiAgICB9LFxuICAgIGN3ZDogb3B0aW9ucy5jd2QsXG4gIH0pO1xuXG4gIGlmIChwcm9jLmVycm9yKSB7IHRocm93IHByb2MuZXJyb3I7IH1cbiAgaWYgKHByb2Muc3RhdHVzICE9PSAwKSB7XG4gICAgaWYgKHByb2Nlc3Muc3RkZXJyKSB7IC8vIHdpbGwgYmUgJ251bGwnIGluIHZlcmJvc2UgbW9kZVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUocHJvYy5zdGRlcnIpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgZXhpdGVkIHdpdGggJHtwcm9jLnN0YXR1cyA/IGBzdGF0dXMgJHtwcm9jLnN0YXR1c31gIDogYHNpZ25hbCAke3Byb2Muc2lnbmFsfWB9YCk7XG4gIH1cblxuICBjb25zdCBvdXRwdXQgPSBwcm9jLnN0ZG91dC50b1N0cmluZygndXRmLTgnKS50cmltKCk7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLyoqXG4gKiBGbGF0dGVuIGEgbGlzdCBvZiBsaXN0cyBpbnRvIGEgbGlzdCBvZiBlbGVtZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbjxUPih4czogVFtdW10pOiBUW10ge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgeHMpO1xufVxuXG4vKipcbiAqIENoYWluIGNvbW1hbmRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGFpbihjb21tYW5kczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gY29tbWFuZHMuZmlsdGVyKGMgPT4gISFjKS5qb2luKCcgJiYgJyk7XG59XG5cbi8qKlxuICogU3BsaXQgY29tbWFuZCB0byBjaHVua3MgYnkgc3BhY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNodW5rcyhjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdCA9IGNvbW1hbmQubWF0Y2goLyg/OlteXFxzXCJdK3xcIlteXCJdKlwiKSsvZyk7XG4gIHJldHVybiByZXN1bHQgPz8gW107XG59XG5cbi8qKlxuICogQSBjbGFzcyBob2xkaW5nIGEgc2V0IG9mIGl0ZW1zIHdoaWNoIGFyZSBiZWluZyBjcm9zc2VkIG9mZiBpbiB0aW1lXG4gKlxuICogSWYgaXQgdGFrZXMgdG9vIGxvbmcgdG8gY3Jvc3Mgb2ZmIGEgbmV3IGl0ZW0sIHByaW50IHRoZSBsaXN0LlxuICovXG5leHBvcnQgY2xhc3MgV29ya0xpc3Q8QT4ge1xuICBwcml2YXRlIHJlYWRvbmx5IHJlbWFpbmluZyA9IG5ldyBTZXQodGhpcy5pdGVtcyk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdGltZW91dDogbnVtYmVyO1xuICBwcml2YXRlIHRpbWVyPzogTm9kZUpTLlRpbWVvdXQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBpdGVtczogQVtdLCBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IFdvcmtMaXN0T3B0aW9uczxBPiA9IHt9KSB7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8/IDYwXzAwMDtcbiAgICB0aGlzLnNjaGVkdWxlVGltZXIoKTtcbiAgfVxuXG4gIHB1YmxpYyBjcm9zc09mZihpdGVtOiBBKSB7XG4gICAgdGhpcy5yZW1haW5pbmcuZGVsZXRlKGl0ZW0pO1xuICAgIHRoaXMuc3RvcFRpbWVyKCk7XG4gICAgaWYgKHRoaXMucmVtYWluaW5nLnNpemUgPiAwKSB7XG4gICAgICB0aGlzLnNjaGVkdWxlVGltZXIoKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZG9uZSgpIHtcbiAgICB0aGlzLnJlbWFpbmluZy5jbGVhcigpO1xuICAgIHRoaXMuc3RvcFRpbWVyKCk7XG4gIH1cblxuICBwcml2YXRlIHN0b3BUaW1lcigpIHtcbiAgICBpZiAodGhpcy50aW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgICAgdGhpcy50aW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlVGltZXIoKSB7XG4gICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5yZXBvcnQoKSwgdGhpcy50aW1lb3V0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0KCkge1xuICAgIHRoaXMub3B0aW9ucy5vblRpbWVvdXQ/Lih0aGlzLnJlbWFpbmluZyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrTGlzdE9wdGlvbnM8QT4ge1xuICAvKipcbiAgICogV2hlbiB0byByZXBseSB3aXRoIHJlbWFpbmluZyBpdGVtc1xuICAgKlxuICAgKiBAZGVmYXVsdCA2MDAwMFxuICAgKi9cbiAgcmVhZG9ubHkgdGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogRnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRpbWVvdXQgaGl0c1xuICAgKi9cbiAgcmVhZG9ubHkgb25UaW1lb3V0PzogKHg6IFNldDxBPikgPT4gdm9pZDtcbn0iXX0=
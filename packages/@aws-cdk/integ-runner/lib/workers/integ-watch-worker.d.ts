import * as workerpool from 'workerpool';
import { IntegTestInfo } from '../runner';
export interface IntegWatchOptions extends IntegTestInfo {
    readonly region: string;
    readonly profile?: string;
    readonly verbosity?: number;
}
export declare function watchIntegrationTest(pool: workerpool.WorkerPool, options: IntegWatchOptions): Promise<void>;

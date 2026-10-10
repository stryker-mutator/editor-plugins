import type {
  DiscoverParams,
  DiscoverResult,
  MutationTestParams,
  MutationTestResult,
} from 'mutation-server-protocol';
import type { Observable } from 'rxjs';

/**
 * Platform-agnostic view of a mutation server, implemented per supported platform.
 */
export interface MutationServer {
  init(): Promise<void>;
  discover(discoverParams: DiscoverParams): Promise<DiscoverResult>;
  mutationTest(
    mutationTestParams: MutationTestParams,
  ): Observable<MutationTestResult>;
  dispose(): Promise<void>;
}

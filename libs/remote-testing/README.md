# @pixel-brewery/remote-testing

Deterministic test adapters and shared protocol vectors. This portable package
contains no production credential vault, fake authorization bypass or network
runtime.

- `MemoryRemoteAccessStore` returns detached records, validates successful writes
  and can fail exactly the next save before changing the preceding record.
- `FakeRemoteClock` supplies the access clock and client scheduler. Advancing time
  runs due callbacks in deadline/registration order and supports cancellation.
- `MemoryRemoteCredentialStore` isolates test values by app and host identity.
- `FakeRemoteConnector` records selected endpoints and calls the supplied scripted
  transport factory once. Cancellation disposes a late transport result.
- `remoteContractVectors` supplies fixed wire examples and rejected destinations
  and paths. Invitation material in these examples is deliberately expired.
- `remoteRouteMatchVectors` supplies exact-method, named-parameter, query,
  precedence and ambiguity cases for native/TypeScript route-matcher parity.

```ts
import { FakeRemoteClock, MemoryRemoteAccessStore } from '@pixel-brewery/remote-testing';

const clock = new FakeRemoteClock();
const store = new MemoryRemoteAccessStore();
store.failNextSave();
clock.advance(5 * 60_000);
```

Use real runtime integration tests for cookies, TLS, streaming and native
boundaries. These adapters make portable state/lifecycle races reproducible;
they do not establish that an operating-system adapter is configured or running.

See the generated [API reference](../../.docs/packages/remote-testing/api/index.md).

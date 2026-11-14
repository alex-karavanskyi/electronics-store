# Stage 1: connection recovery investigation

Installed sources inspected: Mongoose 9.12.0 and MongoDB driver 7.8.0.

- Mongoose `lib/connection.js`, `readyState` getter: reports disconnected when
  the latest heartbeat is at least two heartbeat intervals old, even if internal
  state is connected. Its comment explicitly mentions frozen Lambda containers.
- Mongoose `lib/drivers/node-mongodb-native/connection.js`, `_setClient`:
  server/topology changes trigger reconnection events. Successful heartbeats
  update freshness and flush queues, without necessarily emitting `connected`.
- MongoDB `src/sdam/topology.ts`, `selectServer` and `processWaitQueue`:
  server selection can wait within a timeout and request monitor checks.
- Our product service checks `readyState` before calling the driver. Both a real
  disconnected state and a stale heartbeat therefore produce an immediate 503.
- Our cached initialization promises represent successful startup, not current
  connection health; calling the existing connect helper again does not by
  itself verify recovery.

`database-recovery.test.ts` reproduces both cases using the actual Mongoose
readyState getter, controlled connection metadata, and a mocked database command.
It confirms no delete command executes on the rejected attempt, and exactly one
executes after simulated recovery. This is deterministic characterization, not
a live network interruption test or proof of the production disconnect cause.

Stage 2 must account for heartbeat freshness as well as actual topology loss.
Waiting only for a `connected` event can miss recovery from stale monitoring.
Do not use Mongoose private fields in production recovery code; the test uses
them only to reproduce driver-observed states without touching a real database.
No runtime changes are included in stage 1.

## Stage 2: readiness helper

`src/config/database-ready.ts` provides `waitForDatabase(signal?)`. Healthy
connections return immediately. Other states join one shared polling loop (50 ms)
with a five-second deadline. Late callers share the remaining deadline rather
than extending it. The helper reads the public `readyState` getter, so a fresh
heartbeat can release callers without a `connected` event.

Each caller can cancel independently; the final cancellation, success, or timeout
removes timers and abort listeners. Timeout returns the existing safe 503 message.
This helper waits for the existing driver's recovery: it does not initialize or
reopen an explicitly closed client. Startup remains the responsibility of
`connectDatabase`. It does not ping, retry mutations, or modify private fields.

Integration into product operations is deliberately reserved for stage 3. A
five-second limit may expire before the next driver heartbeat; this is a bounded
wait, not a guarantee of recovery or evidence that a network fault was fixed.

## Stage 3: product service integration

The shared product request wrapper now awaits waitForDatabase before executing
reads or writes. Caller cancellation propagates without a database failure log.
Product diagnostics include phase=readiness for wait failures and phase=operation
for errors after waiting. No mutation is retried. Startup logging is unchanged.

The stage 1 characterization tests are now regression tests: the original delete
waits for both disconnected-state and stale-heartbeat recovery and executes once.
The simulated driver tests do not establish production recovery timing; deployment
verification remains a separate stage.

## Stage 4: verification

Server unit suite: 75 passed. Type checking, ESLint, and server build passed.
Additional coverage: healthy fast path without timers, one cancelled waiter with
another recovering successfully, shared deadline for late callers, listener and
polling cleanup, and one create/update execution each after shared recovery.
Existing tests cover delete recovery, timeout diagnostics, cancelled reads,
non-retry of failed commands, and exclusion of sensitive data from logs.

These are deterministic service/driver-boundary tests. The MongoDB integration
suite was not run: MONGODB_TEST_BINARY is unset and mongod was not found in PATH
or the standard Windows install directory. No production records were modified.
Live post-deployment recovery validation remains stage 5.

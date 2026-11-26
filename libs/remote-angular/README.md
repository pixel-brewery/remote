# @pixel-brewery/remote-angular

Function-only Angular22 dependency injection and read-only signal bindings for `@pixel-brewery/remote-client`.

Register `provideRemoteSession(() => new RemoteSession(options))` at the owning application or route scope. The factory runs in Angular's injection context. The provider creates one canonical session and disposes it with that injector; asynchronous cleanup failures go to Angular's `ErrorHandler`. It does not initialize networking eagerly.

Call `injectRemoteSession()` in a component or presenter injection context. The result contains the same `session`, a read-only `state` signal and a derived `ready` signal. Consumer destruction removes its own subscription. It does not construct a second connection state machine or dispose a provider shared by other consumers.

Applications choose transport, host identity, safe profile persistence, protected credential mediation and product state. Templates react to explicit lifecycle states and perform product read reconciliation after a restored connection. Domain errors remain product errors; connection state is determined by the dedicated Remote protocol.

The package has an Angular22 peer dependency and publishes strict ESM JavaScript and declarations. Run `yarn nx run remote-angular:build`, `:typecheck` and `:test`. The test exercises actual environment-injector ownership, signal projection and disposal of the original session.

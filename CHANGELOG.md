# Changelog

## [0.0.3](https://github.com/MonsieurBarti/pi-verifier/compare/pi-verifier-v0.0.2...pi-verifier-v0.0.3) (2026-05-12)


### Bug Fixes

* trigger release after publish auth fix ([61d488f](https://github.com/MonsieurBarti/pi-verifier/commit/61d488f0f25c0266b9eb52eaf84ab42a07a42fd8))

## [0.0.2](https://github.com/MonsieurBarti/pi-verifier/compare/pi-verifier-v0.0.1...pi-verifier-v0.0.2) (2026-05-12)

### Features

- add stub extension entry point with PiExtensionApi types ([a7926b4](https://github.com/MonsieurBarti/pi-verifier/commit/a7926b48900b7a6a8fcfb59bd89e3b6907edaf27))
- **M1:** complete package scaffold with pnpm, oxlint, oxfmt, vitest, CI, stub extension ([16a6a29](https://github.com/MonsieurBarti/pi-verifier/commit/16a6a293ad98856a7544722fc404ae42c56df741))
- **M3:** builder-side infrastructure — toggle, TCP server, session capture, status UI, 18 tests ([e8c55c0](https://github.com/MonsieurBarti/pi-verifier/commit/e8c55c0a14478a02cd131b1e62e535b9a1f78911))
- **M4:** verifier subagent, feedback loop, and bidirectional IPC ([b54d6b7](https://github.com/MonsieurBarti/pi-verifier/commit/b54d6b72bc3a6d6266edbed3c9d35d2a09483c8e))
- **M5:** safety, prompts & advanced UI ([b904dae](https://github.com/MonsieurBarti/pi-verifier/commit/b904dae8d0af636729541d885270f7bfa2acc36c))

### Bug Fixes

- **build:** remove tests from tsconfig include so dist/ is flat ([66eb042](https://github.com/MonsieurBarti/pi-verifier/commit/66eb042bcd9f0e7002988bc386b2b2b87fb625ea))
- **integration-test:** use random free port to avoid EADDRINUSE flakiness ([1659b7b](https://github.com/MonsieurBarti/pi-verifier/commit/1659b7ba3a1bca8575fba4b620442d7576155c82))

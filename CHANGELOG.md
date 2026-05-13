# Changelog

## [0.0.4](https://github.com/MonsieurBarti/pi-verifier/compare/pi-verifier-v0.0.3...pi-verifier-v0.0.4) (2026-05-13)

### Features

- **launcher:** terminal launcher with tmux + OS window dispatch (Warp, iTerm, etc.) ([e542703](https://github.com/MonsieurBarti/pi-verifier/commit/e542703e88101bca7a527b38ae6a5ffb62c05713))
- **report:** session summary tracker and /verify report command ([16d4ecd](https://github.com/MonsieurBarti/pi-verifier/commit/16d4ecd62a4ec4903e18b8c7895c0696f96110f2))
- resilience, intelligence, polish + terminal launcher + auto-format hooks ([7d8e3f0](https://github.com/MonsieurBarti/pi-verifier/commit/7d8e3f08733329940a50fbe9667ed0c387ba70da))
- **resilience:** port fallback and auto-restart with exponential backoff ([4e2d835](https://github.com/MonsieurBarti/pi-verifier/commit/4e2d835ec44adaf3d597fbfd13ec07add2545ff2))
- **verifier:** accumulate session history across turns for richer analysis ([c9fea51](https://github.com/MonsieurBarti/pi-verifier/commit/c9fea51ca8731e6d1b3c2f6451343da624fe56e1))
- **verifier:** report analysis failures back to builder as feedback ([f420db6](https://github.com/MonsieurBarti/pi-verifier/commit/f420db619c203f41d0d18f157b92bee7047188d5))

### Bug Fixes

- **feedback-loop:** turn skip counter prevents feedback injection loops ([9888a6a](https://github.com/MonsieurBarti/pi-verifier/commit/9888a6af74ba54f6262fd612c44216d0194baa5d))
- **launcher:** bash wrapper script + stable session ID — no more 'no sessions' ([51930bf](https://github.com/MonsieurBarti/pi-verifier/commit/51930bf2d23ff3ee4b885c5cc2948ae732a7cbab))
- **lint:** resolve oxlint errors in socket-server; update types and UI ([d231289](https://github.com/MonsieurBarti/pi-verifier/commit/d231289f2e09468a4f6350ed256bf7199317ab99))
- **prompt-loader:** resolve persona/prompts from dist/ or src/ ([30ff48b](https://github.com/MonsieurBarti/pi-verifier/commit/30ff48b95a56477a292cd6c2c79a35725e49171c))
- **verifier-spawn:** auto-resolve verifier.js path — works from dist/ or src/ ([a9fe7c3](https://github.com/MonsieurBarti/pi-verifier/commit/a9fe7c3fcc47f63c5f234e908cdff71f98291849))
- **verifier:** concurrency guard prevents 'Agent already processing' crash ([4f7a479](https://github.com/MonsieurBarti/pi-verifier/commit/4f7a479e5fbd5b3a27699ae58cb1530e5a3fc343))

## [0.0.3](https://github.com/MonsieurBarti/pi-verifier/compare/pi-verifier-v0.0.2...pi-verifier-v0.0.3) (2026-05-12)

### Bug Fixes

- trigger release after publish auth fix ([61d488f](https://github.com/MonsieurBarti/pi-verifier/commit/61d488f0f25c0266b9eb52eaf84ab42a07a42fd8))

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

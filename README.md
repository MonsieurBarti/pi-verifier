# @the-forge-flow/pi-verifier

[![CI](https://github.com/MonsieurBarti/pi-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/MonsieurBarti/pi-verifier/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@the-forge-flow/pi-verifier)](https://www.npmjs.com/package/@the-forge-flow/pi-verifier)

> **PI extension that replicates the two-agent observer system from `disler/the-verifier-agent`: a Builder agent runs normally, while a Verifier subagent observes its session and injects corrective feedback after each turn.**

## Architecture

_(To be documented in M6 — placeholder for architecture diagram)_

## Installation

```bash
pi install npm:@the-forge-flow/pi-verifier
```

## Usage

```bash
/verify on   # Enable verifier mode
/verify off  # Disable verifier mode
```

## Development

```bash
pnpm install
pnpm test
pnpm run lint
pnpm run typecheck
pnpm run format:check
```

## License

MIT

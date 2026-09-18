# Add a temporary worker pool for release builds

- **Feature Name**: temporary_release_worker_pool
- **Start Date**: 2026-08-18
- **Authors**: [TODO: provide author]
- **Title**: Add a temporary worker pool for release builds

## Summary

Release periods increase build wait time because normal builds and release builds
share one worker pool. This specification defines a temporary worker pool for
release builds.

## Motivation

The change reduces release-build wait time without adding permanent workers. The
current wait-time baseline is `[TODO: provide the baseline]`.

## Background

One shared worker pool handles normal builds and release builds. The release-period
threshold and available worker capacity are `[TODO: provide the missing values]`.

## Specs

### Interface Changes

No interface changes are currently identified.

### Behavioural Changes

The system adds a temporary worker pool for release builds. The system limits the
pool size so release builds cannot use all available capacity. The temporary pool
could starve normal builds.

### Examples

Test the pool with one repository before expanding it. The expected wait-time target
is `[TODO: provide the target]`.

## Design Decisions & Alternatives Considered

The preferred approach adds a temporary release worker pool. This approach avoids
permanent worker capacity but adds queue configuration and a starvation risk.

The alternative keeps one pool and increases its size. This approach preserves the
current queue model but adds permanent worker capacity.

## Migration Steps

1. Measure the current release-build wait time.
2. Configure the temporary pool for one repository.
3. Monitor normal-build wait time during the pilot.
4. Expand the pool after validation.

Disable the temporary pool to roll back the change. The rollback owner and trigger
are `[TODO: provide the missing values]`.

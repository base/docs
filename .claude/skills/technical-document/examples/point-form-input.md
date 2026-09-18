# Point-form input for TEMPLATE_POINT_FORM

- **Feature Name**: temporary_release_worker_pool
- **Start Date**: 2026-08-18
- **Authors**: [TODO: provide author]
- **Title**: Add a temporary worker pool for release builds

## Summary

- Release periods increase build wait time.
- Normal builds and release builds share one worker pool.

## Motivation

- Reduce release-build wait time.
- Avoid adding permanent workers.

## Background

- One shared worker pool handles normal builds and release builds.
- The current wait-time baseline is not available.

## Specs

### Interface Changes

- No interface changes are currently identified.

### Behavioural Changes

- Add a temporary worker pool for release builds.
- Limit the release-pool size.
- The temporary pool could starve normal builds.

### Examples

- Test the pool with one repository before expanding it.

## Design Decisions & Alternatives Considered

- Preferred approach: add a temporary release worker pool.
- Alternative: keep one pool and increase its size.
- Mitigation: set a maximum release-pool size.

## Migration Steps

- Test with one repository.
- Expand after validation.
- The target wait time is not defined.

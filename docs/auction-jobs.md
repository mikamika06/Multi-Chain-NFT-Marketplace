# Auctions & Bundle Queue Runbook

This document summarises the BullMQ queues introduced for auction and bundle lifecycle management.

## Queues

- **listings** – handles activation, settlement and Dutch price synchronisation.
  - `activate-listing`: flips listings from `PENDING` to `ACTIVE` when the start timestamp is reached.
  - `settle-auction`: marks expired listings as `EXPIRED` and cancels open bids. Keepers can rely on the job payload to trigger on-chain settlement.
  - `sync-dutch-price`: recomputes the Dutch auction price every 60 seconds during the active window.

## Configuration

- Defined in `apps/api/src/modules/listings/listings.module.ts` via `BullModule.registerQueue`.
- Jobs are scheduled from the `ListingsService` on creation and rescheduled via `ListingsQueueService` helpers.
- Activation and settlement jobs reuse deterministic job IDs (`activate:<id>`, `settle:<id>`, `sync:<id>`) so they can be cleared if the listing is sold early.

## Monitoring

- Expose queue metrics (waiting, active, failed) via Bull board or custom Prometheus exporter.
- Recommended alerts:
  - `listings` queue has `failed` jobs > 0 for 5 minutes.
  - `settle-auction` job delayed beyond `listing.endTs + 5m`.
  - `sync-dutch-price` job absent while active Dutch auctions exist.

## Operations

- Clear jobs when a listing is manually cancelled/sold using `ListingsQueueService.clearScheduledJobs`.
- To manually reschedule an auction settlement:
  ```ts
  await listingsQueueService.rescheduleSettlement(listingId, new Date(Date.now() + 5 * 60 * 1000));
  ```
- Use `pnpm --filter @apps/api bull:dashboard` (custom script) or `redis-cli` to inspect queue state during incidents.

## Future Work

- Integrate Slack/Email notifications when settlement jobs expire without marking the listing as SOLD.
- Attach OpenTelemetry spans around processor handlers for observability consistency with the indexer pipeline.

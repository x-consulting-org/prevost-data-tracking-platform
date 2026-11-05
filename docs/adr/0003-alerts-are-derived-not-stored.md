# Alerts are derived, not stored

Whether a shipment needs attention depends on the current time (a pickup within 24 hours, an overdue delivery), so a stored flag would go stale without a job to refresh it. Alerts are computed by the pure `getShipmentAlerts(shipment, now, settings)` on every read. The thresholds the review shares (when a request counts as unanswered, how late counts as late) come from the `MetricSettings` row, editable on Kollégák › Mérőszámok; the rest stay constants next to the function.

# Alerts are derived, not stored

Whether a shipment needs attention depends on the current time (a pickup within 24 hours, an overdue delivery), so a stored flag would go stale without a job to refresh it. Alerts are computed by the pure `getShipmentAlerts(shipment, now)` on every read, and their thresholds live as constants next to it.

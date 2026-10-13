# Every signed-in user reads every shipment in the pilot

The operations dashboard is meant to give dispatchers and their manager the same shared view, so the pilot has no roles or per-object permissions: authentication is the only check. This changes with the performance review view, which shows data about individual colleagues and will need roles.

The performance review arrived in the demo before roles: its only account is the manager's (`Demo Vezető`), so nobody can see a colleague's review who should not. The same holds for the metric settings, which any signed-in user can change for now. Roles have to land before dispatchers get their own accounts.

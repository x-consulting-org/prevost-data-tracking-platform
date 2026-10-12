# Prévost operations

The operational view of Prévost's freight forwarding: which shipments are open, who handles them and what needs attention. The data comes from the dispatchers' mailboxes and T-Port; the UI is in Hungarian, so each term also gives its UI label.

## Language

**Shipment** (UI: _fuvar_):
One customer request to move cargo from an origin to a destination, from the first email until it is completed or cancelled.
_Avoid_: Order, job, case, load

**T-Port trip** (UI: _T-Port járat_):
The trip a shipment is matched to in T-Port, identified by `tportTripId`. A shipment can exist without one.
_Avoid_: Calling the trip a "fuvar"

**Dispatcher** (UI: _kolléga_, _fuvarszervező_):
A Prévost colleague whose mailbox receives requests and who organises shipments. Not the same as an app user.
_Avoid_: User, agent, planner

**Customer** (UI: _megbízó_):
The company that requested the shipment.
_Avoid_: Client, partner, shipper

**Shipment status** (UI: _státusz_):
Where a shipment is in its lifecycle: unhandled request, organizing, in transit, completed or cancelled.
_Avoid_: State, phase, stage

**Shipment event** (UI: _esemény_):
A business fact on a shipment's timeline, such as a schedule change, with the source it came from.
_Avoid_: Audit, log, history

**Alert** (UI: _jelzés_):
A condition that needs a dispatcher's attention, derived from a shipment's current data and the current time. Never stored.
_Avoid_: Warning, notification, flag

**Data source** (UI: _forrás_):
Where a fact came from: email, T-Port or manual entry.
_Avoid_: Origin, channel

**Source sync** (UI: _adatok frissessége_):
The last successful load from an external data source.
_Avoid_: Refresh, update

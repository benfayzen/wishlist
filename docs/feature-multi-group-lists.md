# Lists shared across groups

Each list has one owner and may be shared with several groups. Owners can change
these shares in the list form. New shares require membership of both the owner
and the person making the change. Managers cannot remove shares outside their
own groups. At least one group must be selected when saving the form.

My Lists includes all owned lists. The overview defaults to all of the viewer's
groups and supports a separate group filter. A global group switch is not needed.
Members manage their memberships under Account → Groups. Creating a group gives
the creator a group manager role, without global administration rights. The last
group manager must assign a successor before leaving through this area.

Items and reservations are shared rather than copied. Reservation quantity checks
and creation run in a transaction. Own reservations remain accessible after a
share is revoked. Successful reservation changes refresh the claims overview.
Live updates recheck access before sending data.

## Storage and compatibility

`ListGroupShare` stores unique `(listId, groupId)` pairs. The migration imports
each list's previous group as its first share and removes the cascading foreign
key from list to group. Lists continue to belong to their owner; deleting a group
removes shares without deleting the lists or reservations.

`List.groupId` is retained as a stable settings context, rather than a visibility
rule. Existing suggestion and reservation settings remain associated with that
context. New lists use the first selected group's settings, with the alphabetically
first membership as the initial selection. Older clients may still use the active
membership API, but the interface does not depend on it.

Automatic list creation is disabled by default. Explicitly saved configuration
values are preserved. Older list forms that omit sharing fields preserve existing
shares; the current form distinguishes omitted fields from an empty selection.

Group-scoped bulk cleanup skips lists shared with other groups. Removing a
membership revokes the user's own list shares in that group while preserving
owned lists and reservations. Import operates directly on owned lists.

## Migration and rollback

Back up the database and uploads before upgrading. Startup applies pending
migrations. Older application versions cannot use the new sharing table and may
require the original group relation. After deleting an original group, an image
rollback alone is not a reliable recovery path; retain a pre-upgrade database
backup.

## Development checks

Run `pnpm check`, `pnpm lint`, `pnpm build` and `pnpm test:native`. Migration tests
can be run with `python3 -m unittest discover -s tests/migrations`. Test container
startup with a disposable database before publishing an upgrade.

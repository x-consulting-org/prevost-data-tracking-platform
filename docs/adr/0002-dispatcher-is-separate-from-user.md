# Dispatcher is separate from User

A dispatcher's mailbox is a data source even if that colleague never logs in, and a manager logs in without having a mailbox. So `Dispatcher` is its own model and better-auth's `User` stays the only source of app identities. Linking the two (an optional `userId` on `Dispatcher`) comes with the first feature that needs it, such as "my shipments".

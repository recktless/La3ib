# Security Specification: La3ib Firestore Access Control

## 1. Data Invariants
- **User Ownership**: A user profile document `/users/{userId}` can only be created or modified by the authenticated user whose `request.auth.uid == userId`. Users cannot escalate their own role to 'admin'.
- **Game Organization**: A game document `/games/{gameId}` has an `organizerId` that must match `request.auth.uid` upon creation. Only the organizer or an admin may update game metadata or cancel the game.
- **Game Participation**: A participant document `/gameParticipants/{participantId}` links a `userId` to a `gameId`. A user can only register themselves (`request.auth.uid == userId`) unless modified by the game's organizer (for check-ins/attendance) or an admin.
- **Chat Access**: A chat message `/chatMessages/{messageId}` can only be sent by authenticated users. The sender UID in the message must match `request.auth.uid`.
- **Notifications**: Users can only read notifications where `resource.data.userId == request.auth.uid`.
- **Reports**: Any authenticated user can submit a community safety report with their `reporterId == request.auth.uid`. Only admins can review or resolve reports.
- **Friend Requests & Friendship Invariants**:
  - A user cannot send a friend request to themselves (`requesterId != recipientId`).
  - Only the authenticated requester (`request.auth.uid == requesterId`) can initiate or cancel an outgoing friend request.
  - The recipient can accept or decline a pending friend request targeted to them (`request.auth.uid == recipientId`).
  - Mutual friends documents (`users/{userId}/friends/{friendUserId}`) are created atomically upon accepting a request, restricted strictly to the mutual parties.
  - User counters (`friendCount`) can only be incremented or decremented atomically alongside friend relationships, strictly bounded to `>= 0`.
- **Admin Isolation**: Admin actions require verification against `/admins/{userId}` or the designated administrator UID.

## 2. The "Dirty Dozen" Attack Payloads (Must be blocked)
1. **Payload 1 (Privilege Escalation)**: User updates own `/users/{uid}` with `role: "admin"`.
2. **Payload 2 (User Impersonation)**: User creates `/users/{otherUid}` with someone else's UID.
3. **Payload 3 (Game Host Hijack)**: User creates `/games/{gameId}` with `organizerId: "other_user"`.
4. **Payload 4 (Unauthorized Game Cancellation)**: Non-organizer attempts to set `status: "Cancelled"` on a game.
5. **Payload 5 (Fake Spot Confirmation)**: Non-host, non-admin user creates a participant record for someone else with `paymentStatus: "Paid"`.
6. **Payload 6 (Cross-User Notification Read)**: User queries `/notifications` without scoping to their own `userId`.
7. **Payload 7 (Chat Impersonation)**: User creates `/chatMessages/{msgId}` with `senderId: "host_uid"` while authenticated as a different player.
8. **Payload 8 (Report Tampering)**: Regular user attempts to update a report's `resolved: true`.
9. **Payload 9 (Court Tampering)**: Regular user attempts to edit court pricing or details in `/courts/{courtId}`.
10. **Payload 10 (Orphan Participant Write)**: Writing a participant with negative amount or mismatched transaction ID.
11. **Payload 11 (Oversized Payload / Denial of Wallet)**: Injecting 2MB payload into game title or chat text.
12. **Payload 12 (Direct Payment Record Forgery)**: User creates a completed payment record bypassing verification.

# Tests

What the site's tests check, in plain words. `[auto]` tests run with `npm run test` (and before every ship); `[manual]` tests are checked by a person on the staging site.

Rules: one test per line, add new lines at the bottom, and never delete or weaken a test to make it pass — fix the site instead. Every bug fix adds a test here.

- [auto] The home page loads and shows a heading. (tests/home.spec.ts)
- [auto] The messages page shows the sample messages and lets a visitor post a new one. (tests/home.spec.ts)
- [auto] The messages API lists the sample messages. (tests/api.spec.ts)
- [auto] The messages API saves a new message to the database. (tests/api.spec.ts)
- [auto] The messages API rejects a message with a blank name. (tests/api.spec.ts)
- [auto] The messages API rejects a submission that skipped the spam check. (tests/api.spec.ts)
- [auto] The messages API stops a visitor after 5 submissions in a minute. (tests/api.spec.ts)
- [auto] The login API signs in the seeded admin and sets a session cookie. (tests/stewards-auth.spec.ts)
- [auto] The login API rejects a wrong password. (tests/stewards-auth.spec.ts)
- [auto] An applicant can apply, an admin can approve them, and the new steward can reach the dashboard. (tests/stewards-auth.spec.ts)
- [auto] An active steward can update profile preferences. (tests/stewards-platform.spec.ts)
- [auto] A steward can request a circle join and an admin can approve it. (tests/stewards-platform.spec.ts)
- [auto] Directory connections and steward messaging work. (tests/stewards-platform.spec.ts)
- [auto] Admin email reply and campaign simulate without a provider key. (tests/stewards-platform.spec.ts)
- [auto] A steward can RSVP to an event. (tests/stewards-platform.spec.ts)
- [auto] An admin can add an FAQ item. (tests/stewards-platform.spec.ts)
- [auto] Join/apply requires the Connect welcome survey fields (profile type, contact, regions, sector, interests, charter). (tests/stewards-auth.spec.ts)
- [auto] Signed-in header uses an account name menu; Profile and Settings are tabs on one page. (tests/stewards-platform.spec.ts)
- [auto] Circles header lists the steward’s circles; circle detail pages open; dashboard shows events today and upcoming. (tests/stewards-platform.spec.ts)
- [auto] Events page offers list/calendar views and keeps the add-event form collapsed by default. (tests/stewards-platform.spec.ts)
- [auto] Directory search and sector filter return matching stewards. (tests/stewards-platform.spec.ts)
- [auto] Migrating steward can activate with a short form; admin sees an Activation badge. (tests/stewards-auth.spec.ts)
- [auto] Directory uses a steward card grid with Share connection and an email-icon message control. (tests/stewards-platform.spec.ts)
- [auto] Messages show the other person once, with photo thumbnails. (tests/stewards-platform.spec.ts)
- [auto] Any active steward can ask an FAQ with an optional answer; blank answers are flagged for admins. (tests/stewards-platform.spec.ts)
- [auto] Alliance email has Inbox and Campaigns tabs, sample threads, and inbox search. (tests/stewards-platform.spec.ts)
- [auto] Account menu Edit profile includes a person icon. (tests/stewards-platform.spec.ts)
- [auto] Interest matching (“Who is interested?”) returns topic matches; network map page embeds graph data. (tests/stewards-platform.spec.ts)

# NLV admin panel

The admin panel lives at `/admin`. It manages the landing page's content and collects the
"Order a device" requests. Only admins can open it (signed in, email verified). Other signed-in users
get a 403 page, and guests are sent to the login page. Everyone lands on `/admin` after signing in;
the starter kit's old `/dashboard` address redirects there for good (301).

## What the admin controls

| Section      | Path                                     | What it does                                                                                                                                                                                 |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard    | `/admin`                                 | New leads, leads per day over the last 30 days, latest leads and latest activity.                                                                                                            |
| Leads        | `/admin/leads`                           | Every request sent from the order pop-up. Set a status (new, contacted, qualified, won, lost), assign someone, add internal notes, delete and restore, and export the current filter as CSV. |
| Stories      | `/admin/stories`                         | The shop owners quoted on the page: quote (the `*starred*` phrase is set in italics), metric, portrait and its focus point, page order, live or hidden.                                      |
| Lookbook     | `/admin/looks`, `/admin/look-categories` | Try-on photos (the result, plus an optional "before" photo of the shopper), and the filter tabs with their weekly note and figure.                                                           |
| Pricing      | `/admin/plans`, `/admin/faqs`            | Buy, Lease and Chain (name, prices per currency, features), the currencies the page offers, and the questions under the plans.                                                               |
| Pages        | `/admin/pages`                           | Markdown pages at `/pages/{slug}` (About, Privacy, Terms...), and which footer column lists them.                                                                                            |
| Site content | `/admin/content`                         | Page copy by section, contact details, social links, headline figures, SEO title and description, and the address new requests are emailed to. An empty field shows the default copy.        |
| Activity log | `/admin/activity`                        | See [Activity log](#activity-log).                                                                                                                                                           |
| Users        | `/admin/users`                           | Every account, all of them admins. Add someone with a password you set or an emailed link, change a name or email, set a new password or send a link, delete an account.                     |

The product mockups (hero photo, device screens, partner wordmarks, the fanned looks at the end) are
designed artwork in the code, not managed content.

## Admin accounts

Every account is an admin: there are no other roles, and nobody can sign up on their own. Admins add
the people who run the site.

Create the first admin on the server:

```sh
php artisan admin:create owner@example.com --name="Owner Name"
```

The command asks for anything missing (the password needs at least 12 characters) and creates a
verified account. If the email already belongs to a user, that user becomes an admin. In a
non-interactive script, pass `--password=...` too.

After that, add people under **Users → Add user** (`/admin/users/create`): a name, an email address
(saved in lowercase), and one of:

- **Set a password now.** At least 12 characters; in production it also needs upper and lower case,
  a number and a symbol, and must not appear in known data leaks. Nothing is emailed: pass it on
  yourself. "Suggest one" fills in a strong password you can copy.
- **Email them a link.** They get an email with a button to the app's password page (the same kind
  of link as "Forgot your password?"). It works for 60 minutes (`auth.passwords.users.expire`), and
  needs working mail (see the production checklist). With `MAIL_MAILER=log` the email lands in
  `storage/logs/laravel.log`. If it can't be sent, the account is still added and its page opens so
  you can send the link again.

Accounts added here are verified admins straight away and sign in at `/login`.

On an account's page (`/admin/users/{id}/edit`):

- **Name and email.** The account stays verified with a new address, and a password link sent to
  the old one stops working.
- **Password.** Set a new one now (the person is signed out on every device), or email them a link
  to choose one (their current password keeps working until they use it; one link a minute). Admins
  change their own password, two-factor and passkeys in their account settings, which ask for the
  current password first.
- **Delete.** Type the account's email address to confirm. You can't delete your own account here,
  and the last admin can never be deleted. Leads assigned to the account become unassigned (each
  lead's timeline says why), and its past activity stays in the log under the name it had, marked
  "(deleted account)".

Each of these is logged: `user.created`, `user.updated` (with a before/after of the name and email),
`user.password_set`, `user.password_link_sent` and `user.deleted`. Passwords never reach the log.

An account made before every account was an admin shows as "No panel access". Open it and choose
**Give panel access**, or on the server:

```sh
php artisan admin:grant colleague@example.com
```

## Signing in and your account

**Logging in.** Everyone logs in at `/login`, in the admin's design: email and password (with "Keep me
logged in on this device"), or a passkey. There is no public sign-up: `/register` is a 404, and the
login page says to ask an admin. "Forgot your password?" emails a link to choose a new one (it works
for 60 minutes). Accounts with two-factor authentication are then asked for the 6-digit code from
their authenticator app, or one of their recovery codes. The landing page's navbar shows **Admin
panel** (Arabic: لوحة التحكم) instead of **Log in** to anyone signed in.

**Your account.** **Account**, at the bottom of the admin sidebar (also **Profile** in the account
menu under it), holds each admin's own settings in two tabs:

| Tab      | Path                 | What it does                                                                                                                                                                           |
| -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile  | `/settings/profile`  | Your name and email address. A new address has to be confirmed from the email that is sent; the panel stays locked until then. Also deletes your own account (asks for your password). |
| Security | `/settings/security` | Change your password; turn two-factor authentication on (scan a QR code, enter the first code) or off, show, copy or regenerate recovery codes; list, add and remove passkeys.         |

The Security tab asks for your password first (or a passkey), then not again for three hours
(`auth.password_timeout`). There is no appearance setting: the admin is always dark.

## Content

A new database starts empty. This command loads the launch content: 4 stories, 4 lookbook categories
with 12 looks, the 3 plans, 3 questions and placeholder footer pages.

```sh
php artisan db:seed --class=LandingContentSeeder
```

You can run it again safely: it only creates missing records and never changes what an admin has
edited. A seeded record that was deleted or renamed in the admin counts as missing, though, so it
comes back on the next run (for example a story's name, a look's title or a page's slug). Plans cannot
be created in the admin, so run the seeder once on every new database or the pricing section stays
empty.

Everything seeded is placeholder content: the people, stores and figures are fictional, and the pages
are marked as placeholders. Replace it before launch.

**Site content → Contact** details are public as soon as they are filled in: the phone and WhatsApp
numbers appear in the footer, under the order section's email line and on the order pop-up's thank-you
screen (as call and WhatsApp links), and the office address appears in the footer. An empty field hides
its line.

## Activity log

**Activity log** in the sidebar (`/admin/activity`) lists every change and sign-in. That covers
content created, edited, reordered or deleted (with a before/after table of the changed fields),
settings and prices saved, and leads submitted, updated or exported. It also covers admin rights
granted or removed, sign-ins, sign-outs, failed sign-ins, password resets and two-factor changes.
Each entry shows who did it, when, and from which IP address and browser. You can filter by kind of
event, person, date range or text. **Done by → Deleted accounts** shows what accounts that have
since been deleted did; they keep their name, marked "(deleted account)".

Entries are stored in the `activity_logs` table and are never pruned automatically. Each one keeps
the name of the person who did it (`causer_name`), so deleting an account doesn't blank its history.

## Production checklist

- **App:** in `.env`, set `APP_NAME="NLV"`, `APP_ENV=production`, `APP_DEBUG=false`, and `APP_URL` to
  the public https address.
- **Mail:** set `MAIL_MAILER` and its credentials, plus `MAIL_FROM_ADDRESS` and `MAIL_FROM_NAME`. Then
  fill in **Site content → Contact → "Send new order requests to"**. If it is empty, new leads only
  appear in the admin.
- **Queue worker:** the new-lead email is queued. With `QUEUE_CONNECTION=database`, keep
  `php artisan queue:work` running (Supervisor, systemd or your host's worker feature). Without a
  worker the email never sends. `php artisan queue:failed` lists emails that failed.
- **Storage link:** run `php artisan storage:link` once per server. Without it, uploaded photos
  return 404.
- **Upload limits:** set PHP's `upload_max_filesize` to at least `10M` and `post_max_size` to at least
  `40M`. The admin already shrinks photos in the browser before upload (longest edge 2,400 px, usually
  under 1.5 MB), and the server accepts up to 8 MB per image. The higher limits are headroom for a
  form with several photos.
- **Proxies:** behind a load balancer, CDN or reverse proxy, set `TRUSTED_PROXIES` to the proxy's IPs
  or CIDR ranges (comma separated). Use `*` only when the app can be reached through the proxy alone.
  Without it, every visitor seems to come from the proxy. The order form's rate limit (5 a minute and
  20 a day per IP) then applies to all visitors together, the activity log records the proxy's IP,
  and https may not be detected. When the app faces the internet directly, leave it empty: with `*`
  there, anyone could fake their IP. See `config/trustedproxy.php`.
- **Local accounts:** a database copied from a development machine brings its local accounts with it.
  The seeded local admin (`eng.mohamed.izeldeen@gmail.com`) has the password `password`: change it
  (or delete the account and create the production admin with `admin:create`). Delete the old test
  accounts if they are there:

    ```sh
    php artisan tinker --execute="App\Models\User::whereIn('email', ['dev-admin@nlv.local', 'qa-member@nlv.local'])->delete();"
    ```

    `db:seed` creates the local admin only when `APP_ENV` is `local` or `testing`.

- **Deploy:** run `php artisan migrate --force`, then `php artisan optimize` (caches config, routes
  and views; run it again after every `.env` change). The landing page's content is cached until an
  admin saves something, so after a deploy that adds or changes defaults in `config/landing.php`, clear
  it too:

    ```sh
    php artisan tinker --execute="App\Support\LandingContent::forget(); App\Support\Settings::forget();"
    ```

- **Front-end build and delivery:** on every deploy, run `npm ci && npm run build` (or
  `npm run build:ssr` with server-side rendering, below). The files in `public/build/assets` get new
  names on every build, so serve them compressed (brotli or gzip) and with
  `Cache-Control: public, max-age=31536000, immutable`. `public/.htaccess` does both on Apache when
  the modules are on; on nginx or a CDN, set it up there. Check one file:

    ```sh
    curl -sI -H 'Accept-Encoding: br, gzip' https://<site>/build/assets/<file>.js
    ```

    The answer should show `content-encoding` and that `cache-control`. Without them, a phone on slow
    4G waits more than twice as long for the first screen. Serve the site over HTTP/2 or HTTP/3, and
    never with `php artisan serve` (one worker, no compression, no caching).

    Server-side rendering is optional and needs Node on the server: keep
    `php artisan inertia:start-ssr` running (Supervisor or systemd), run `php artisan inertia:stop-ssr`
    on every deploy so it restarts with the new bundle, and check it with
    `php artisan inertia:check-ssr`. If the SSR bundle is built but that server doesn't run, set
    `INERTIA_SSR_ENABLED=false` in `.env`: otherwise every page view first tries to reach it.

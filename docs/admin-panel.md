# NLV admin panel

The admin panel lives at `/admin`. It manages the landing page's content and collects the
"Order a device" requests. Only admins can open it (signed in, email verified). Other signed-in users
get a 403 page, and guests are sent to the login page. Admins land on `/admin` after signing in.

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
| Users        | `/admin/users`                           | Every account. Make someone an admin, or remove their admin rights.                                                                                                                          |

The product mockups (hero photo, device screens, partner wordmarks, the fanned looks at the end) are
designed artwork in the code, not managed content.

## Admin accounts

Create the first admin on the server:

```sh
php artisan admin:create owner@example.com --name="Owner Name"
```

The command asks for anything missing (the password needs at least 12 characters) and creates a
verified account. If the email already belongs to a user, that user becomes an admin. In a
non-interactive script, pass `--password=...` too.

To add more admins, the person registers at `/register` and confirms their email. Then an admin
promotes them under **Users**, or on the server:

```sh
php artisan admin:grant colleague@example.com
```

Admin rights are removed under **Users**. The last admin cannot be demoted. Accounts are never deleted
from the admin panel. Users delete their own account under Settings → Profile.

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

## Activity log

**Activity log** in the sidebar (`/admin/activity`) lists every change and sign-in. That covers
content created, edited, reordered or deleted (with a before/after table of the changed fields),
settings and prices saved, and leads submitted, updated or exported. It also covers admin rights
granted or removed, sign-ins, sign-outs, failed sign-ins, password resets and two-factor changes.
Each entry shows who did it, when, and from which IP address and browser. You can filter by kind of
event, person, date range or text.

Entries are stored in the `activity_logs` table and are never pruned automatically.

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

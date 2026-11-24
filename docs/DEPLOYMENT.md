# Production deployment: Feta Awards

Target: `13.140.175.12`, at `http://13.140.175.12:3006`.
Server directory and Compose project: `/opt/kaba-prod` and `kaba-prod`.

This server used to run **Feta Show**. Feta Show is archived on the git branch `first`
and is never deployed again: deploys run only from `main`, which now holds Feta Awards only.
Switching the server is a one-time step (section 1).

## How it runs

- PostgreSQL has no published port.
- The database and uploaded media live in persistent named volumes (`awards_pgdata`, `awards_media`).
  The old Feta Show volumes are left untouched.
- Nginx is the only public service, and it passes the real client IP to the app's rate limiter.
- Public content loads at request time, through tagged caches. Image builds therefore need no database and no production credentials.
- Registry credentials live in `/opt/kaba-prod/.docker`, so the SSH account's own Docker credentials file is never touched.
- Deploy commands always select the `kaba-prod` Compose project. They never restart the Docker daemon or the host's Nginx.

**Resource limits:**

| Service | CPU | Memory |
|---|---|---|
| web | 1 CPU | 1 GiB |
| PostgreSQL | 0.5 CPU | 512 MiB |
| proxy | 0.25 CPU | 128 MiB |
| **Steady-state total** | **1.75 CPUs** | **1,664 MiB** |
| Migration and seed jobs (run separately) | 0.5 CPU | 512 MiB |

Each container rotates its logs at three 10 MiB files. Images are built on GitHub's runners.

**There are no public accounts.** Only staff (super admins and editors) sign in, at `/sign-in`.
Visitors browse without an account.

## 1. One-time switch from Feta Show

Do this once, before the first Feta Awards deployment, in your SSH session on the server.

1. Copy `deploy/switch-to-awards.sh` to `/opt/kaba-prod/`, either with `scp` or by pasting it into the terminal.
2. Run it:

   ```bash
   bash /opt/kaba-prod/switch-to-awards.sh
   ```

   It does the following:
   - Dumps the Feta Show database to `backups/feta-show-final-<time>.sql.gz`.
   - Archives the Feta Show media to `backups/feta-show-media-<time>.tar.gz`.
   - Stops and removes the Feta Show containers. Their volumes are kept, so there is a second copy of the data.
   - Adds the keys Feta Awards needs to `.env`. Existing values are never changed.

   It is safe to run twice.
3. Open `/opt/kaba-prod/.env` and check the following:
   - `SEED_ADMIN_EMAIL` and `SEED_EDITOR_EMAIL` are the staff emails you want.
     A server that ran Feta Show may still have `@fetashow.com` addresses here.
   - **Optional:** fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`.
     Any SMTP provider works. SMTP is used only to email staff password-reset codes.
     Without it, a super admin resets passwords on **Admin → Staff**.

A brand-new server uses `deploy/bootstrap.sh` instead: it creates `.env` and the deploy SSH key.

## 2. GitHub configuration

This is unchanged from the Feta Show setup. Go to **Settings → Secrets and variables → Actions** in the `ArsemaYemiru/kaba` repository.

| Secret | Value |
| --- | --- |
| `PROD_HOST` | `13.140.175.12` |
| `PROD_USER` | The SSH Linux account |
| `PROD_SSH_KEY` | The private key from `~/.ssh/kaba_github_actions` |
| `PROD_KNOWN_HOSTS` | `13.140.175.12 ` followed by the contents of `/etc/ssh/ssh_host_ed25519_key.pub` |
| `GHCR_USERNAME` / `GHCR_TOKEN` | A classic token with `read:packages` |

| Repository variable | Value |
| --- | --- |
| `PRODUCTION_URL` | `http://13.140.175.12:3006` |
| `R2_PUBLIC_URL` | Leave unset when using local storage |

The images are now published as `ghcr.io/arsemayemiru/kaba-awards` and `…/kaba-awards-tooling`.
If package access is restricted, give the repository's Actions access to those two packages.

## 3. Deploy

1. Open a pull request into `main`. **PR Checks** runs:
   - lint, type checks and unit tests;
   - Prisma validation;
   - both Docker builds;
   - migrations against a fresh PostgreSQL;
   - HTTP checks against the running production container.
2. Merge it. The push to `main` builds and publishes images tagged with the commit SHA. Over SSH, it then:
   - backs up the database;
   - applies migrations;
   - recreates the web and proxy containers.

   The deployment only succeeds once `/api/health` is healthy and the running image matches the commit.

## 4. Seed the staff accounts (after the first deploy; safe to re-run)

```bash
cd /opt/kaba-prod
set -a; . ./.image.env; set +a
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml run --rm migrator pnpm db:seed
```

The seed only creates what is missing and never overwrites edits made in the admin:
- the two staff accounts (it refuses default passwords);
- the welcome news post;
- default site settings.

It creates no artists, photos, editions or honorees: you add all of them in the admin. On deploy, the database migrations automatically remove leftover sample data and the 13 placeholder artist profiles the old seed created. A profile is kept if it already has a photo or an honor.

Sign in at `http://13.140.175.12:3006/sign-in` with the email and password from `.env`; you are asked to choose a new password first.
Then, in the admin:
1. **Media Library:** drag in your photos. Large camera JPEGs are resized in the browser before upload (up to 3000px on the long edge), so 20 MB originals upload quickly, three at a time. Add alt text (what the photo shows) and captions.
2. **Artists:** add each artist, pick at least one category (Singer, Musician…), choose a portrait from the Media Library and publish. **Delete** (in the editor, or select rows in the list) also removes that artist's honors.
3. **Editions → Genre categories:** create the edition and its genres, then use **Add artists to this genre**, write citations, and set the edition to **Announced**.
4. **Gallery:** create albums from the uploaded photos. **Site Settings:** pick the hero photo, share image and featured honorees.

## Operations

```bash
cd /opt/kaba-prod
set -a; . ./.image.env; set +a
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml ps
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml logs --tail=100 web
curl --fail http://127.0.0.1:3006/api/health
```

**Backups:**
- Each deploy saves a compressed SQL dump to `backups/` before running migrations.
- Copy those dumps and the media volume to independent storage, and set a retention policy.
- Never run `docker compose down --volumes` in production.

**Rollback:**
- Check migration compatibility first. Then run:

  ```bash
  IMAGE_PREFIX=ghcr.io/arsemayemiru/kaba IMAGE_TAG=<previous-full-sha> bash /opt/kaba-prod/deploy.sh
  ```

- Migrations only move forward; a rollback does not undo schema changes.
- A failed migration leaves the previous web container running.

**Restoring Feta Show data, if it is ever needed:**
- The final dump and media archive are in `backups/feta-show-final-*`.
- The original `kaba-prod_pgdata` and `kaba-prod_media` volumes are still on disk.

**HTTPS:**
- When a domain is ready, update `PRODUCTION_URL` in both GitHub and `.env`.
- Put TLS in front of the app, set `WEB_BIND_IP=127.0.0.1`, and redeploy.
- Staff sign-in cookies become HTTPS-only automatically, and HSTS turns on.
- Until then, login traffic travels unencrypted, so use strong, unique staff passwords.

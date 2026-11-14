# Production deployment

Target: `13.140.175.12`, initially at `http://13.140.175.12:3006`.
Server directory and Compose project: `/opt/kaba-prod` and `kaba-prod`.
This is separate from the other projects on the server. PostgreSQL has no
published port. Database and uploaded media use persistent named volumes.
Nginx is the only public service and supplies the real client IP to the app's
rate limiter. Public CMS content loads at request time with the existing tagged
query caches, so image builds require no database or production credentials.
Registry credentials live in `/opt/kaba-prod/.docker`, leaving the SSH account's
default Docker credentials file untouched. Deployment commands always select
the `kaba-prod` Compose project and do not restart the Docker daemon or host Nginx.
Kaba's steady-state limits total 1.75 CPUs and 1,664 MiB RAM (web: 1 CPU/1 GiB,
PostgreSQL: 0.5 CPU/512 MiB, proxy: 0.25 CPU/128 MiB). Migration/seed jobs are
separately capped at 0.5 CPU/512 MiB. Each container rotates its logs at three
10 MiB files. These limits bound CPU and memory usage; disk capacity and shared
disk/network traffic still need monitoring. Builds run on GitHub's runners.

## 1. Prepare the server

SSH in as the Linux account Actions will use. It needs working Docker Engine
and Compose v2 with `up --wait` support, sudo for creating `/opt/kaba-prod`,
and outgoing access to GHCR. The server must be Linux x86_64 (the workflow builds
on GitHub's x86_64 runners). Confirm with `uname -m`.

Open `deploy/bootstrap.sh` locally and paste its entire contents into the SSH
terminal. It creates random credentials without replacing an existing `.env`,
and a dedicated SSH key. Keep the session open for copying the secrets below.
The script does not install Docker or change existing applications.

Check that TCP 3006 is available:

```bash
sudo ss -ltnp | grep ':3006' || true
```

Allow inbound TCP 3006 in the cloud security group and any host firewall.
Keep SSH restricted to your usual allowed sources and the deployment runner's
access path. If port 3006 is occupied, choose another port and change both
`WEB_PORT` and `PRODUCTION_URL` on the server and the GitHub URL variable below.

## 2. Configure GitHub

In the `ArsemaYemiru/kaba` repository, open Settings → Secrets and variables →
Actions. Use repository secrets so build and deployment jobs can access them.

| Secret | Value |
| --- | --- |
| `PROD_HOST` | `13.140.175.12` |
| `PROD_USER` | Your SSH Linux account, printed by bootstrap |
| `PROD_SSH_KEY` | Complete private key from `cat ~/.ssh/kaba_github_actions`, including BEGIN/END lines |
| `PROD_KNOWN_HOSTS` | On the server, run `printf '13.140.175.12 '; cat /etc/ssh/ssh_host_ed25519_key.pub` and copy the single line |
| `GHCR_USERNAME` | GitHub username owning a token that can read the published packages |
| `GHCR_TOKEN` | Classic personal access token with `read:packages`; authorize organization SSO if required |

| Repository variable | Value |
| --- | --- |
| `PRODUCTION_URL` | `http://13.140.175.12:3006` |
| `R2_PUBLIC_URL` | Leave unset when using local storage |

The image publishing job uses GitHub's automatic `GITHUB_TOKEN`; do not create
a secret for it. If package access is restricted, grant the repository Actions
access to the `kaba-web` and `kaba-tooling` packages. The deploy job uses the
`production` GitHub environment; configure any desired environment protections.
The URL variable is a repository variable because the image build happens
outside that environment.

App secrets and database credentials stay in `/opt/kaba-prod/.env` on the server.
Neither GitHub nor a source checkout on the server needs those credentials.

## 3. Push, review, and deploy

Commit the completed build configuration and deployment files on
`codex/production-deployment`, push that branch, and open a PR to `main`.
The checkout already had local changes to the Next config, package manifest,
lockfile, and PostCSS config before deployment work began. Keep those build
fixes in the branch that gets tested; the Docker build uses the committed files.

`PR Checks / Verify application` runs lint, type generation and TypeScript,
unit tests, Prisma validation, both Docker builds, migrations against fresh
PostgreSQL, and HTTP checks on the running production container. It uses dummy
credentials and needs no production secrets. In a branch ruleset for `main`,
require a pull request and select the emitted `Verify application` status check
after its first run. Adding workflow files alone does not enable branch protection.

Merge the passing PR. A push to `main` runs the same checks, publishes images
tagged with the full commit SHA, then connects via SSH to pull images, back up
the database, apply migrations, and recreate the web container. Deployment is
successful only after the database-backed health endpoint is healthy and the
running image/revision match the commit. You can also rerun Deploy Production
from the Actions page using the `main` branch.

## 4. Initialize content and accounts after the first successful deployment

Seeding is manual so subsequent deployments do not add sample content back.
Run this on the server once (the existing seed creates accounts, site settings,
and demo content):

```bash
cd /opt/kaba-prod
set -a
. ./.image.env
set +a
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml run --rm migrator pnpm db:seed
```

Then visit `http://13.140.175.12:3006/admin/login`. Use the email and generated
password from the server `.env`; change the password at first login. The seed
also prints credentials, so run it only in your private SSH terminal. Sample
content can be removed from the CMS. Uploaded files survive container recreation.

## Operations

For subsequent maintenance sessions, load the last successful image metadata:

```bash
cd /opt/kaba-prod
set -a
. ./.image.env
set +a
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml ps
docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml logs --tail=100 web
curl --fail http://127.0.0.1:3006/api/health
```

Each deploy saves a compressed SQL dump in `/opt/kaba-prod/backups` before
migrations. Copy backups and the media volume to independent storage and set a
retention policy; the deployment does not delete backups automatically. Never
run `docker compose down --volumes` in production.

The `.deployed-sha`, `.previous-sha`, and `.image.env` files record successful
deployments. For an application rollback, inspect migration compatibility first,
then run:

```bash
IMAGE_PREFIX=ghcr.io/arsemayemiru/kaba IMAGE_TAG=<previous-full-sha> bash /opt/kaba-prod/deploy.sh
```

This reapplies pending forward migrations; it
does not undo database schema changes. A failed migration leaves the previous
web container running. A failed web replacement fails the workflow and requires
operator recovery; there is no automatic rollback.

When a domain and HTTPS are ready, update `PRODUCTION_URL` in GitHub and the
server `.env`, put a reverse proxy in front of the app, change `WEB_BIND_IP` to
`127.0.0.1`, and redeploy. Cookies automatically become HTTPS-only when
`BETTER_AUTH_URL` uses HTTPS. The initial HTTP/IP setup transmits login traffic
without encryption; use it only for the initial setup and switch to HTTPS before
using real credentials or content on an untrusted network.

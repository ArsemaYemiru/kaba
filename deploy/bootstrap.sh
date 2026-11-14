#!/usr/bin/env bash
# Paste this entire script into your SSH session on 13.140.175.12.
# Run as the Linux account GitHub Actions should use (e.g. ubuntu).
set -euo pipefail
command -v openssl >/dev/null
docker info >/dev/null
docker compose version

if [ ! -d /opt/kaba-prod ]; then
  sudo install -d -m 750 -o "$(id -un)" -g "$(id -gn)" /opt/kaba-prod
fi
test -w /opt/kaba-prod || { echo 'Your SSH account needs write access to /opt/kaba-prod.'; exit 1; }
cd /opt/kaba-prod
umask 077
if [ ! -f .env ]; then
  cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
PRODUCTION_URL=http://13.140.175.12:3006
WEB_BIND_IP=0.0.0.0
WEB_PORT=3006
STORAGE_DRIVER=local
SEED_ADMIN_EMAIL=admin@fetashow.com
SEED_ADMIN_PASSWORD=$(openssl rand -hex 24)
SEED_EDITOR_EMAIL=editor@fetashow.com
SEED_EDITOR_PASSWORD=$(openssl rand -hex 24)
EOF
  chmod 600 .env
  echo 'Created /opt/kaba-prod/.env with random credentials.'
else
  echo 'Kept the existing .env.'
fi

install -d -m 700 "$HOME/.ssh"
key="$HOME/.ssh/kaba_github_actions"
if [ ! -f "$key" ]; then
  ssh-keygen -t ed25519 -N '' -C kaba-github-actions -f "$key"
fi
touch "$HOME/.ssh/authorized_keys"
public_key=$(cat "$key.pub")
if ! grep -qF "$public_key" "$HOME/.ssh/authorized_keys"; then
  printf 'restrict %s\n' "$public_key" >> "$HOME/.ssh/authorized_keys"
fi
chmod 600 "$key" "$HOME/.ssh/authorized_keys"

echo
echo 'Use these GitHub Actions secrets:'
echo 'PROD_HOST = 13.140.175.12'
printf 'PROD_USER = %s\n' "$(id -un)"
printf 'PROD_SSH_KEY = copy the complete output of: cat %s\n' "$key"
echo 'PROD_KNOWN_HOSTS = copy the output of:'
printf '  printf "13.140.175.12 "; cat /etc/ssh/ssh_host_ed25519_key.pub\n'
echo 'Do not paste private keys, passwords, or tokens into chat.'
echo 'Allow inbound TCP 3006 in the cloud security group and server firewall.'
echo 'Check for a port conflict: sudo ss -ltnp | grep :3006'

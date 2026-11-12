#!/bin/sh
set -eu
cd /var/www/html

# Database health is checked by Compose before this entrypoint is started.
if [ "${TIMEFOLD_SEED_DEMO:-0}" = 1 ]; then
    php bin/timefold.php init --demo
else
    php bin/timefold.php init
fi
chown -R www-data:www-data "${TIMEFOLD_DATA_DIR:-/var/www/html/var}"
exec docker-php-entrypoint "$@"

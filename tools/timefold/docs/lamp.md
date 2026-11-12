# A native LAMP installation

These commands target Debian/Ubuntu and keep the example Apache endpoint on
localhost. On Slackware or another distribution, install equivalent PHP PDO
MySQL, Fileinfo, Apache, and MariaDB packages through your normal package tools.
The application itself does not depend on a distribution-specific service.

## Install and clone

```sh
sudo apt install git apache2 mariadb-server php-cli php-mysql libapache2-mod-php
sudo install -d -o "$USER" -g www-data /var/www/timefold
git clone https://github.com/jsdyer/jsdyer.github.io.git /var/www/timefold
cd /var/www/timefold/tools/timefold
```

## Create a dedicated database

Run `sudo mariadb` and enter the following SQL. Replace the password before
running it; keep it distinct from the archive's owner password.

```sql
CREATE DATABASE timefold CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'timefold'@'localhost' IDENTIFIED BY 'CHOOSE_A_DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON timefold.* TO 'timefold'@'localhost';
EXIT;
```

Initialize from the repository directory. Bash `read` keeps your database
password out of the command line and shell history:

```sh
read -rs -p 'Database password: ' TIMEFOLD_DB_PASSWORD
export TIMEFOLD_DB_PASSWORD
TIMEFOLD_DSN='mysql:host=localhost;dbname=timefold;charset=utf8mb4' \
TIMEFOLD_DB_USER=timefold php bin/timefold.php init --demo
unset TIMEFOLD_DB_PASSWORD
```

Save the generated owner password printed by `init`. It is stored as a hash.
Database credentials are saved in `config.local.php`, which is outside the
document root and ignored by Git. Leave off `--demo` to start with no samples.

Allow Apache to read configuration and write private storage:

```sh
sudo chgrp -R www-data config.local.php var
sudo chmod 640 config.local.php
sudo chmod -R g+rwX var
```

## Give Apache the public directory

Create `/etc/apache2/sites-available/timefold.conf` with:

```apache
Listen 127.0.0.1:8081
<VirtualHost 127.0.0.1:8081>
    ServerName localhost
    DocumentRoot /var/www/timefold/tools/timefold/public
    <Directory /var/www/timefold/tools/timefold/public>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
    php_admin_value upload_max_filesize 64M
    php_admin_value post_max_size 66M
    php_admin_value memory_limit 256M
</VirtualHost>
```

```sh
sudo a2ensite timefold
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Open **http://localhost:8081** and sign in. To use a domain or a reverse proxy,
adapt this vhost to your existing HTTPS setup and preserve `public/` as the
document root. If another vhost already listens on port 8081, choose a free port.
Never expose the repository root as a document root.

## Updates

Export a backup first, then run `git pull --ff-only` in the checkout. Read
release notes before installing a future major version. Runtime configuration
and archive contents are ignored by Git. No asset build or package restore is
needed for Timefold itself.

If you run the CLI as a different user from Apache, ensure both users can read
and write `var/`; new files use the caller's permissions. Prefer running backup
and import commands as the web-server user, for example:

```sh
sudo -u www-data php bin/timefold.php verify
```

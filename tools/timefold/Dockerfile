FROM php:8.5-apache-bookworm

# PDO SQLite and fileinfo ship in the official PHP image; only MySQL needs adding.
RUN docker-php-ext-install pdo_mysql \
    && php -r 'foreach (["pdo_mysql", "pdo_sqlite", "fileinfo"] as $e) { if (!extension_loaded($e)) exit(1); }'

WORKDIR /var/www/html
COPY app/ app/
COPY bin/ bin/
COPY database/ database/
COPY public/ public/
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/timefold.ini
COPY docker/entrypoint.sh /usr/local/bin/timefold-entrypoint
RUN find app bin database public -type d -exec chmod 755 {} + \
    && find app bin database public -type f -exec chmod 644 {} + \
    && mkdir -p var && chown -R www-data:www-data var \
    && chmod 644 /etc/apache2/sites-available/000-default.conf /usr/local/etc/php/conf.d/timefold.ini \
    && chmod 755 /usr/local/bin/timefold-entrypoint

EXPOSE 80
ENTRYPOINT ["timefold-entrypoint"]
CMD ["apache2-foreground"]

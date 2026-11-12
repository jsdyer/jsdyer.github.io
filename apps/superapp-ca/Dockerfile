FROM php:8.4-apache
RUN docker-php-ext-install pdo_mysql && a2enmod rewrite headers
WORKDIR /var/www/superapp
COPY . .
COPY deploy/apache-container.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/php.ini /usr/local/etc/php/conf.d/superapp.ini
RUN mkdir -p var/sessions && chown -R www-data:www-data var && chmod 700 var/sessions
EXPOSE 80

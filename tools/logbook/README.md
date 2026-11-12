# Vhost Logbook

Turn a local Apache access log into a daily traffic report. Each row gives request volume, counts by HTTP status family, and response-body bytes. A second line breaks out the individual status codes, so you can tell a 404 spike from a 403 spike. The report contains aggregate counts and dates only.

## Try it on Linux

From the repository root, run the synthetic sample with PHP 8.0 or newer. Only the PHP CLI is required. On Ubuntu or Debian the package is `php-cli`. On Slackware use the distribution's `php` package.

```sh
php tools/logbook/logbook.php tools/logbook/example.log
```

The sample has six requests. On November 2 it shows five requests, including one 404 and one 503, and 1,053 response-body bytes.

## Read a real vhost log

Point the command at the access log configured by the virtual host's Apache `CustomLog` directive. The following examples use a common Debian path and an example archive-site path. Run them with an account that can read the selected file.

```sh
php tools/logbook/logbook.php /var/log/apache2/access.log
php tools/logbook/logbook.php /var/log/httpd/archive-access.log
gzip -dc /var/log/apache2/access.log.2.gz | php tools/logbook/logbook.php -
```

Reads standard Apache Common and Combined formats, plus Combined with a leading virtual-host field. Dates follow the offset recorded in each line. Files containing multiple hosts produce one combined report. Apache's `%b` dash contributes zero body bytes. Headers and transport overhead are outside this measure.

Input is read one line at a time. You can save the report by redirecting standard output to a text file. Exit status is `0` for a complete report, `1` when any lines were skipped, and `2` for an argument or I/O error. The footer gives the line counts.

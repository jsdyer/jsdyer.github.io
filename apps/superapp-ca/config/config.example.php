<?php
// Copy to config/local.php (ignored by Git). Environment variables override defaults below.
return [
    'app_url' => 'https://superapp.ca',
    'dsn' => 'mysql:host=127.0.0.1;dbname=superapp;charset=utf8mb4',
    'db_user' => 'superapp',
    'db_pass' => '',
    'registration_open' => false,
    'session_secure' => true,
    'demo' => false,
    // Optional hosted donation page. Configure CAD/pay-what-you-can at the provider.
    'donation_url' => '',
    'contact_url' => '',
    'source_url' => 'https://github.com/jsdyer/jsdyer.github.io/tree/superapp-ca/apps/superapp-ca',
    'hosting_note' => 'Hosting location has not been published by this instance.',
];

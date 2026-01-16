<?php
const API_KEY = "Pm=jxMYk5HPeOtIh5e4I2RT12HswTE";
const API_URL = "https://api.cloudways.com/api/v1";
const EMAIL = "it@digitransglobal.com";

function callCloudwaysAPI($method, $url, $accessToken, $post = []) {
    $baseURL = API_URL;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_URL, $baseURL . $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($accessToken) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    }
    $encoded = '';
    if (count($post)) {
        foreach ($post as $name => $value) {
            $encoded .= urlencode($name) . '=' . urlencode($value) . '&';
        }
        $encoded = substr($encoded, 0, strlen($encoded) - 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $encoded);
        curl_setopt($ch, CURLOPT_POST, 1);
    }
    $output = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($httpcode != '200') {
        die('An error occurred code: ' . $httpcode . ' output: ' . substr($output, 0, 10000));
    }
    curl_close($ch);
    return json_decode($output);
}

$tokenResponse = callCloudwaysAPI('POST', '/oauth/access_token', null, [
    'email' => EMAIL, 
    'api_key' => API_KEY
]);

$accessToken = $tokenResponse->access_token;
$gitPullResponse = callCloudwaysAPI('POST', '/git/pull', $accessToken, [
    'server_id' => $_GET['server_id'],
    'app_id' => $_GET['app_id'],
    'git_url' => $_GET['git_url'],
    'branch_name' => $_GET['branch_name']
]);

echo (json_encode($gitPullResponse));
?>

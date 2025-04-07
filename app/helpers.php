<?php

use Illuminate\Support\Facades\Http;

if (!function_exists('str_extract')) {
    function str_extract($str, $pattern, $get = null, $default = null)
    {
        $result = [];
        preg_match($pattern, $str, $matches);
        preg_match_all('/(\(\?P\<(?P<name>.+)\>\.\+\)+)/U', $pattern, $captures);
        $names = $captures['name'] ?? [];
        foreach ($names as $name) {
            $result[$name] = $matches[$name] ?? null;
        }
        return $get ? $result[$get] ?? $default : $result;
    }
}

if (!function_exists('wrap_str')) {
function wrap_str($str = '', $first_delimiter = "'", $last_delimiter = null)
{
    if (!$last_delimiter) {
        return $first_delimiter . $str . $first_delimiter;
    }

    return $first_delimiter . $str . $last_delimiter;
}
}

if (!function_exists('getExtensionImageFromUrl')) {
function getExtensionImageFromUrl($url)
{
    $url = explode('.', $url);
    $extension = end($url);
    return $extension;
}
}
if (!function_exists('clearCacheNode')) {
function clearCacheNode()
{
    try {
        Http::withOptions(['verify' => false])
            ->asForm()
            ->post(env('WA_URL_SERVER') . '/backend-clearCache');
        return true;
    } catch (\Throwable $th) {
        return false;
    }
}
}
if (!function_exists('setEnv')) {
function setEnv(string $key, ?string $value)
{
    // Jika nilai null, set ke string kosong
    $value = $value ?? '';

    $env = array_reduce(
        file(base_path('.env'), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES),
        function ($carry, $item) {
            list($key, $val) = explode('=', $item, 2);

            $carry[$key] = $val;

            return $carry;
        },
        []
    );
    $env[$key] = $value;
    foreach ($env as $k => &$v) {
        $v = "{$k}={$v}";
    }

    file_put_contents(base_path('.env'), implode("\r\n", $env));
}
}

if (!function_exists('backWithFlash')) {
function backWithFlash($type, $message)
{
    return redirect()->back()->with('alert', ['type' => $type, 'msg' => $message]);
}
}

if (!function_exists('redirectWithFlash')) {
function redirectWithFlash($type, $message, $url)
{
    return redirect($url)->with('alert', ['type' => $type, 'msg' => $message]);
}
}
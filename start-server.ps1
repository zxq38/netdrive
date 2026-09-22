# 本地预览服务器（用于 software.json 实时同步，双击打开页面也能用内置数据）
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "网络侠客的网盘  ->  http://localhost:$Port" -ForegroundColor Cyan
Write-Host "根目录：$root`n按 Ctrl+C 停止" -ForegroundColor DarkGray
Start-Process "http://localhost:$Port"

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
        $file = Join-Path $root $rel

        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $ctx.Response.ContentType = $mime[$ext]
            if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = "application/octet-stream" }
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $ctx.Response.OutputStream.Close()
    }
}
finally { $listener.Stop() }

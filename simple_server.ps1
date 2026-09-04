$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8937/")
$listener.Start()
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{ ".html"="text/html"; ".js"="application/javascript"; ".css"="text/css"; ".json"="application/json"; ".png"="image/png"; ".svg"="image/svg+xml"; ".ico"="image/x-icon" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = $ctx.Request.Url.LocalPath
  if ($path -eq "/") { $path = "/index.html" }
  $file = Join-Path $root $path.TrimStart("/")
  if (Test-Path $file -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($file)
    $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.OutputStream.Close()
}

$html = [IO.File]::ReadAllText("e:\Workspace\Praia\index.html")
$html = $html -replace '(?s)<script>\s*const weatherApiKey.*?</script>', '<script src="config.js"></script>' + "`r`n" + '    <script src="script.js"></script>'
[IO.File]::WriteAllText("e:\Workspace\Praia\index.html", $html, [Text.Encoding]::UTF8)

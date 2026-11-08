<#
  Sorrida-Connector installieren (einmal je Praxis-PC, als Administrator).

  Beispiel:
    powershell -ExecutionPolicy Bypass -File install.ps1 -Server https://ihre-sorrida-adresse.de -Key sor_conn_...

  Was passiert:
    1. SorridaConnector.cs wird mit dem in Windows enthaltenen .NET-Compiler
       zu "%ProgramFiles%\Sorrida\SorridaConnector.exe" übersetzt.
    2. Server und Schlüssel landen in "%ProgramData%\Sorrida\connector.ini"
       (nur Administratoren und das System dürfen die Datei ändern).
    3. Sorrida trägt sich nach VDDS-media 1.4 als Bild-/Multimediasystem
       (BVS) in die VDDS_MMI.INI im Windows-Verzeichnis ein. Danach bietet
       die Praxissoftware "Sorrida" in ihrer VDDS-Auswahl an.
    4. Mit -GdtImport (Arztpraxis): Eine Windows-Aufgabe holt alle 2 Minuten
       freigegebene Berichte und Vorschläge als GDT-Dateien in diesen Ordner;
       die Praxissoftware liest sie von dort in die Karteikarte ein.
       Bitte nur an EINEM Praxis-PC einrichten (Empfang oder Server).
    5. Zum Schluss prüft ein Verbindungstest Adresse, Schlüssel und Ordner.

  Arztpraxis (GDT), Beispiel:
    install.ps1 -Server https://www.sorrida.com -Key sor_conn_... -GdtFile C:\GDT\SORRIDA.GDT -GdtImport C:\GDT\IMPORT
#>
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$Key,
  [ValidateSet("abschluss", "bericht", "vorschlag", "verlauf")][string]$View = "abschluss",
  [string]$Source = (Join-Path $PSScriptRoot "SorridaConnector.cs"),
  # Arzt-Praxissoftware (GDT): fest eingestellte Übergabedatei, falls die Software den Pfad nicht mitgibt.
  [string]$GdtFile = "",
  # Arzt-Praxissoftware (GDT): Ordner, aus dem die Software Ergebnisse (Satzart 6310) einliest.
  [string]$GdtImport = "",
  # Fester Dateiname, falls die Praxissoftware nur eine bestimmte Datei einliest (z. B. SORRMEDI.GDT).
  [string]$GdtName = "",
  # Proxy der Praxis, falls der Windows-Proxy nicht reicht (z. B. http://proxy:8080).
  [string]$Proxy = ""
)
$ErrorActionPreference = "Stop"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Bitte PowerShell als Administrator starten."
}
if ($Server -notmatch '^(https://|http://localhost(:\d+)?(/|$))') { throw "Server muss mit https:// beginnen." }
if ($Key -notmatch '^sor_conn_[0-9a-f]{64}$') { throw "Der Schlüssel sieht nicht wie ein Sorrida-Connector-Schlüssel aus (sor_conn_...)." }
if (-not (Test-Path $Source)) { throw "SorridaConnector.cs nicht gefunden: $Source" }

Add-Type -Namespace Sorrida -Name Ini -MemberDefinition @'
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern bool WritePrivateProfileString(string section, string key, string value, string path);
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern uint GetPrivateProfileString(string section, string key, string def, System.Text.StringBuilder buf, uint size, string path);
'@
function Read-Ini([string]$Section, [string]$Name, [string]$Path) {
  $sb = New-Object System.Text.StringBuilder 1024
  [void][Sorrida.Ini]::GetPrivateProfileString($Section, $Name, "", $sb, 1024, $Path)
  $sb.ToString()
}

# 1. Übersetzen
$installDir = Join-Path $env:ProgramFiles "Sorrida"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
$exe = Join-Path $installDir "SorridaConnector.exe"
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw ".NET Framework 4 (csc.exe) nicht gefunden." }
# /codepage:65001: Quelltext ist UTF-8 (sonst liest der Compiler ihn als ANSI und die Meldungen werden unlesbar).
& $csc /nologo /target:winexe /optimize+ /codepage:65001 "/out:$exe" $Source
if ($LASTEXITCODE -ne 0) { throw "Übersetzen fehlgeschlagen." }

# 2. Konfiguration
$configDir = Join-Path $env:ProgramData "Sorrida"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$config = Join-Path $configDir "connector.ini"
$lines = @("[SORRIDA]", "SERVER=$($Server.TrimEnd('/'))", "KEY=$Key", "VIEW=$View", "WINDOW=1200,900")
if ($GdtFile) { $lines += "GDTFILE=$GdtFile" }
if ($GdtImport) {
  if (-not (Test-Path $GdtImport)) { New-Item -ItemType Directory -Force -Path $GdtImport | Out-Null }
  $lines += "GDTIMPORT=$GdtImport"
}
if ($GdtName) { $lines += "GDTNAME=$GdtName" }
if ($Proxy) { $lines += "PROXY=$Proxy" }
$lines | Set-Content -Path $config -Encoding Default
# Lesen dürfen alle Nutzer des PCs (der Connector läuft im Kontext der Praxissoftware), ändern nur Administratoren.
icacls $config /inheritance:r /grant:r "*S-1-5-32-544:F" "*S-1-5-18:F" "*S-1-5-32-545:R" | Out-Null

# 3. VDDS_MMI.INI (VDDS-media 1.4, Abschnitt 1 und Tabelle 2)
$mmi = Join-Path $env:WINDIR "VDDS_MMI.INI"
if (-not (Test-Path $mmi)) {
  New-Item -ItemType File -Path $mmi | Out-Null
  # Laut Spezifikation muss das erste Programm "Jeder: Vollzugriff" setzen.
  icacls $mmi /grant "*S-1-1-0:F" | Out-Null
}
$section = "SORRIDA"
$registered = $false
$free = $null
for ($i = 1; $i -le 99; $i++) {
  $entry = Read-Ini "BVS" "NAME$i" $mmi
  if ($entry -eq $section) { $registered = $true; break }
  if (-not $entry -and -not $free) { $free = $i }
}
if (-not $registered) { [void][Sorrida.Ini]::WritePrivateProfileString("BVS", "NAME$free", $section, $mmi) }
$values = [ordered]@{
  NAME              = "Sorrida (Bericht & Vorschlag)"
  VERSION           = "1.4"
  STAGES            = "1"
  SUPPORTINFO       = "1"
  PATDATIMPORT      = $exe
  PATDATIMPORT_OS   = "1"
}
foreach ($k in $values.Keys) { [void][Sorrida.Ini]::WritePrivateProfileString($section, $k, $values[$k], $mmi) }

# 4. Rückweg: Aufgabe "Sorrida Ergebnisse" für alle angemeldeten Nutzer, alle 2 Minuten
$taskName = "Sorrida Ergebnisse"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
if ($GdtImport) {
  $action = New-ScheduledTaskAction -Execute $exe -Argument "--abholen"
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 2)).Repetition
  $principal = New-ScheduledTaskPrincipal -GroupId "S-1-5-32-545" -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
}

Write-Host "Sorrida-Connector installiert:" -ForegroundColor Green
Write-Host "  Programm:      $exe"
Write-Host "  Konfiguration: $config"
Write-Host "  VDDS:          [$section] in $mmi"
Write-Host "Jetzt in der Praxissoftware unter den VDDS-Einstellungen 'Sorrida (Bericht & Vorschlag)' aktivieren."
if ($GdtImport) { Write-Host "  Rückweg:       alle 2 Minuten nach $GdtImport (Aufgabe '$taskName')" }

# 5. Verbindungstest (zeigt das Ergebnis in einem Fenster)
$test = Start-Process -FilePath $exe -ArgumentList "--test" -Wait -PassThru
if ($test.ExitCode -eq 0) { Write-Host "Verbindungstest: in Ordnung." -ForegroundColor Green }
else { Write-Host "Verbindungstest: bitte die Meldung im Fenster beachten. Protokoll: %LOCALAPPDATA%\Sorrida\connector.log" -ForegroundColor Yellow }

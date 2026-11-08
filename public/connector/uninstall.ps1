<#
  Sorrida-Connector entfernen (als Administrator).
  Entfernt den VDDS-Eintrag, die Aufgabe für den Rückweg, das Programm und die Konfiguration.
#>
$ErrorActionPreference = "Stop"
Add-Type -Namespace Sorrida -Name Ini -MemberDefinition @'
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern bool WritePrivateProfileString(string section, string key, string value, string path);
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
public static extern uint GetPrivateProfileString(string section, string key, string def, System.Text.StringBuilder buf, uint size, string path);
'@
$mmi = Join-Path $env:WINDIR "VDDS_MMI.INI"
if (Test-Path $mmi) {
  for ($i = 1; $i -le 99; $i++) {
    $sb = New-Object System.Text.StringBuilder 256
    [void][Sorrida.Ini]::GetPrivateProfileString("BVS", "NAME$i", "", $sb, 256, $mmi)
    # Nur den eigenen Eintrag löschen; Lücken in der Nummerierung sind laut Spezifikation zulässig.
    if ($sb.ToString() -eq "SORRIDA") { [void][Sorrida.Ini]::WritePrivateProfileString("BVS", "NAME$i", $null, $mmi) }
  }
  [void][Sorrida.Ini]::WritePrivateProfileString("SORRIDA", $null, $null, $mmi)
}
Unregister-ScheduledTask -TaskName "Sorrida Ergebnisse" -Confirm:$false -ErrorAction SilentlyContinue
# Läuft gerade ein Abholvorgang, ist das Programm gesperrt: beenden und mehrmals versuchen
# (auch ein Virenscanner hält frisch übersetzte Programme manchmal kurz fest).
Get-Process -Name "SorridaConnector" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$rest = @()
foreach ($dir in @((Join-Path $env:ProgramFiles "Sorrida"), (Join-Path $env:ProgramData "Sorrida"))) {
  $letzterFehler = $null
  for ($i = 0; $i -lt 15 -and (Test-Path $dir); $i++) {
    try { Remove-Item -Recurse -Force $dir -ErrorAction Stop } catch { $letzterFehler = $_.Exception.Message; Start-Sleep -Seconds 1 }
  }
  if (Test-Path $dir) { $rest += "$dir ($letzterFehler)" }
}
if ($rest.Count) {
  Write-Warning ("Nicht vollständig entfernt: " + ($rest -join "; ") + ". Bitte nach einem Neustart erneut ausführen.")
  exit 1
}
Write-Host "Sorrida-Connector entfernt." -ForegroundColor Green

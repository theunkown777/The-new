// Sorrida-Connector 2.0 für Windows: verbindet die Praxissoftware mit Sorrida.
//
// Zahnarztpraxis (VDDS-media 1.4, PATDATIMPORT): DS-Win, CGM Z1, charly, evident ...
//   rufen dieses Programm mit dem Pfad der Übergabedatei auf.
// Arztpraxis (GDT 2.1 / 3.0): Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS ...
//   schreiben eine GDT-Datei (Satzart 6301/6302) und starten dieses Programm
//   mit dem Pfad oder ohne (dann gilt GDTFILE aus der Konfiguration).
//
// Aufruf aus der Praxissoftware:
//   1. Übergabedatei lesen (Zeichensatz wird erkannt, halb geschriebene oder
//      veraltete Dateien werden nicht verwendet),
//   2. nur Patientennummer, Name, Geburtsdatum, Geschlecht (VDDS zusätzlich
//      Titel und Kasse) an Sorrida schicken - Adresse, Telefon,
//      Versichertennummer usw. verlassen den PC nicht,
//   3. Einmal-Adresse als eigenes App-Fenster öffnen (Microsoft Edge im
//      App-Modus, sonst Standardbrowser),
//   4. VDDS: ERRORLEVEL, ERRORTEXT und zuletzt READY=1 zurückschreiben;
//      GDT: Anforderungsdatei nach dem Lesen löschen (GDT-Regel).
//
// Weitere Aufrufe:
//   SorridaConnector.exe --test      Verbindung, Schlüssel und Einrichtung prüfen
//   SorridaConnector.exe --abholen   freigegebene Berichte/Vorschläge als GDT-Dateien
//                                    (Satzart 6310) in den GDT-Importordner legen
//   SorridaConnector.exe --version
//
// Konfiguration: %ProgramData%\Sorrida\connector.ini, Abschnitt [SORRIDA]
//   SERVER=https://www.sorrida.com       KEY=sor_conn_...
//   VIEW=abschluss | bericht | vorschlag | verlauf    (Standard: abschluss)
//   WINDOW=1200,900
//   GDTFILE=C:\GDT\SORRIDA.GDT     feste Anforderungsdatei, falls kein Pfad übergeben wird
//   GDTIMPORT=C:\GDT\IMPORT         Ordner, aus dem die Praxissoftware Ergebnisse einliest
//   GDTNAME=                        leer: eigene Datei je Ergebnis; sonst fester Dateiname
//                                   (dann erst schreiben, wenn die Praxissoftware die
//                                   vorige Datei eingelesen und gelöscht hat)
//   MAXALTER=300                    Übergabedatei älter als so viele Sekunden: ablehnen (0 = aus)
//   GDTLOESCHEN=1                   GDT-Anforderungsdatei nach dem Lesen löschen (0 = nein)
//   PROXY=http://proxy:8080         nur nötig, wenn der Windows-Proxy nicht reicht
//   BROWSER=C:\...\chrome.exe       anderer Browser für das App-Fenster
//
// Protokoll ohne Patientendaten: %LOCALAPPDATA%\Sorrida\connector.log
//
// Übersetzen (macht install.ps1 automatisch), C# 5 / .NET Framework 4:
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /codepage:65001
//     /out:SorridaConnector.exe SorridaConnector.cs

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

internal static class SorridaConnector
{
    private const string Version = "2.0";

    // Felder der GDT-Anforderung, die Sorrida braucht (alles andere bleibt auf dem PC).
    private static readonly string[] GdtFields = { "8000", "8315", "8316", "9206", "9218", "3000", "3101", "3102", "3103", "3110" };

    // Felder aus VDDS-media 1.4, Tabelle 3, die Sorrida verarbeitet.
    private static readonly string[] Fields =
    {
        "PVS", "PATID", "PATSHOWNR", "LASTNAME", "FIRSTNAME", "TITLE",
        "BIRTHDAY", "SEX", "INSURANCESTATUS", "INSURANCE", "INFO"
    };

    private static readonly bool IsWindows = Environment.OSVersion.Platform == PlatformID.Win32NT;
    private static bool silent;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WritePrivateProfileString(string section, string key, string value, string path);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    private static int Main(string[] args)
    {
        string first = args.Length > 0 ? args[0].Trim().Trim('"') : "";
        // Ohne Meldefenster (automatische Tests auf Windows-Rechnern ohne Bediener).
        if (Environment.GetEnvironmentVariable("SORRIDA_CONNECTOR_STILL") == "1") silent = true;
        if (first == "--version") { Show("Sorrida-Connector " + Version, false); return 0; }
        Dictionary<string, string> config = ReadSection(ConfigPath(), "SORRIDA");
        if (first == "--test") return Test(config);
        if (first == "--abholen") { silent = true; return Abholen(config, true); }
        return Launch(config, first);
    }

    // ---------------------------------------------------------------- Aufruf aus der Praxissoftware

    private static int Launch(Dictionary<string, string> config, string handover)
    {
        bool gdt = false;
        bool vddsFile = false;
        int errorLevel = 0;
        string errorText = "";
        try
        {
            // Arzt-Praxissoftware (GDT) schreibt oft in eine fest eingestellte Datei, ohne sie zu übergeben.
            if (string.IsNullOrEmpty(handover)) handover = Get(config, "GDTFILE");
            if (string.IsNullOrEmpty(handover) || !File.Exists(handover))
                throw new ConnectorException("Keine Übergabedatei erhalten. Sorrida bitte über die Praxissoftware aufrufen."
                    + (string.IsNullOrEmpty(handover) ? "" : " (Datei nicht gefunden: " + handover + ")"));
            string server, key;
            ServerAndKey(config, out server, out key);

            byte[] bytes = ReadStable(handover);
            CheckAge(handover, config);

            var body = new StringBuilder();
            string gdtText = DecodeGdt(bytes);
            if (gdtText != null)
            {
                // GDT: nur die oben genannten Zeilen weitergeben.
                gdt = true;
                foreach (string raw in Regex.Split(gdtText, "\r\n|\r|\n"))
                {
                    string line = raw.TrimStart();
                    if (line.Length >= 7 && Array.IndexOf(GdtFields, line.Substring(3, 4)) >= 0) body.Append(line).Append("\r\n");
                }
            }
            else
            {
                vddsFile = true;
                Dictionary<string, string> patient = ParseSection(DecodeText(bytes), "PATIENT");
                if (patient.Count == 0) throw new ConnectorException("Die Übergabedatei enthält keinen Abschnitt [PATIENT] und ist keine GDT-Datei.");
                body.Append("[PATIENT]\r\n");
                foreach (string field in Fields)
                {
                    string value = Get(patient, field);
                    if (value.Length > 0) body.Append(field).Append('=').Append(value).Append("\r\n");
                }
            }

            string view = Get(config, "VIEW");
            string endpoint = server + "/api/connector/launch" + (view.Length > 0 ? "?view=" + Uri.EscapeDataString(view) : "");
            string response = Request("POST", endpoint, key, body.ToString(), config);

            Match url = Regex.Match(response, "\"url\"\\s*:\\s*\"([^\"]+)\"");
            if (url.Success) OpenWindow(Regex.Unescape(url.Groups[1].Value), config);
            else if (!Regex.IsMatch(response, "\"info\"\\s*:\\s*true"))
                throw new ConnectorException("Unerwartete Antwort von Sorrida.");

            // GDT-Regel: Der Empfänger löscht die Anforderung nach dem Einlesen. So kann eine
            // alte Datei nie versehentlich einen falschen Patienten öffnen.
            if (gdt && Get(config, "GDTLOESCHEN") != "0") TryDelete(handover);
            Log("Aufruf ok (" + (gdt ? "GDT" : "VDDS") + ")");
        }
        catch (ConnectorException ex)
        {
            errorLevel = 1;
            errorText = ex.Message;
        }
        catch (Exception ex)
        {
            errorLevel = 2;
            errorText = "Sorrida ist nicht erreichbar: " + ex.Message;
        }

        if (vddsFile || (!gdt && !string.IsNullOrEmpty(handover) && File.Exists(handover) && !LooksLikeGdt(handover)))
        {
            // Reihenfolge laut VDDS-media: READY=1 immer als letzte Aktion.
            try
            {
                WriteIni(handover, "PATIENT", "ERRORLEVEL", errorLevel.ToString());
                WriteIni(handover, "PATIENT", "ERRORTEXT", errorText);
                WriteIni(handover, "PATIENT", "READY", "1");
            }
            catch (Exception ex) { Log("Rückmeldung an die Praxissoftware nicht geschrieben: " + ex.Message); }
        }
        if (errorLevel > 0)
        {
            Log("Fehler " + errorLevel + ": " + errorText);
            Show(errorText, true);
        }
        else if (Get(config, "GDTIMPORT").Length > 0)
        {
            // Bei der Gelegenheit fertige Ergebnisse gleich mitnehmen (Fehler nur ins Protokoll).
            silent = true;
            Abholen(config, false);
        }
        return errorLevel;
    }

    // ---------------------------------------------------------------- Rückweg (GDT 6310)

    private static int Abholen(Dictionary<string, string> config, bool explicitCall)
    {
        string dir = Get(config, "GDTIMPORT");
        if (dir.Length == 0)
        {
            if (explicitCall) Log("Abholen: GDTIMPORT ist nicht eingerichtet.");
            return explicitCall ? 1 : 0;
        }
        bool created;
        using (var mutex = new Mutex(true, "SorridaConnectorAbholen", out created))
        {
            if (!created && !mutex.WaitOne(0)) return 0; // läuft schon
            try
            {
                string server, key;
                ServerAndKey(config, out server, out key);
                if (!Directory.Exists(dir)) throw new ConnectorException("GDT-Importordner nicht gefunden: " + dir);
                string list = Request("GET", server + "/api/connector/ergebnisse", key, null, config);
                string[] lines = Regex.Split(list.Trim(), "\r\n|\n");
                if (lines.Length == 0 || !lines[0].StartsWith("SORRIDA-ERGEBNISSE")) throw new ConnectorException("Unerwartete Antwort von Sorrida.");
                string fixedName = Get(config, "GDTNAME");
                var done = new StringBuilder();
                int written = 0;
                for (int i = 1; i < lines.Length; i++)
                {
                    string[] t = lines[i].Split('\t');
                    if (t.Length != 4) continue;
                    string name = fixedName.Length > 0 ? fixedName : Path.GetFileName(t[2]);
                    if (name.Length == 0 || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) continue;
                    string target = Path.Combine(dir, name);
                    if (File.Exists(target))
                    {
                        // Fester Name: Die Praxissoftware hat die vorige Datei noch nicht eingelesen. Später weiter.
                        if (fixedName.Length > 0) break;
                        done.Append(t[0]).Append('\t').Append(t[1]).Append("\r\n"); // schon abgelegt
                        continue;
                    }
                    // Erst vollständig unter anderem Namen schreiben, dann umbenennen: die
                    // Praxissoftware sieht nie eine halbe Datei.
                    string tmp = target + ".tmp";
                    File.WriteAllBytes(tmp, Convert.FromBase64String(t[3]));
                    File.Move(tmp, target);
                    done.Append(t[0]).Append('\t').Append(t[1]).Append("\r\n");
                    written++;
                }
                if (done.Length > 0) Request("POST", server + "/api/connector/ergebnisse", key, done.ToString(), config);
                if (written > 0 || explicitCall) Log("Abholen: " + written + " Datei(en) abgelegt");
                return 0;
            }
            catch (Exception ex)
            {
                Log("Abholen fehlgeschlagen: " + ex.Message);
                return 1;
            }
            finally
            {
                mutex.ReleaseMutex();
            }
        }
    }

    // ---------------------------------------------------------------- Verbindungstest

    private static int Test(Dictionary<string, string> config)
    {
        var report = new StringBuilder();
        bool ok = true;
        try
        {
            string server, key;
            ServerAndKey(config, out server, out key);
            string res = Request("GET", server + "/api/connector/ping", key, null, config);
            Match praxis = Regex.Match(res, "\"praxis\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
            report.Append("✓ Verbindung zu ").Append(server).Append(" steht").Append(praxis.Success ? " (Praxis: " + Regex.Unescape(praxis.Groups[1].Value) + ")" : "").Append("\n");
        }
        catch (Exception ex)
        {
            ok = false;
            report.Append("✗ ").Append(ex.Message).Append("\n");
        }
        report.Append(FindBrowser(config) != null ? "✓ App-Fenster: Microsoft Edge gefunden\n" : "• App-Fenster: Edge nicht gefunden, Sorrida öffnet im Standardbrowser\n");
        if (IsWindows)
        {
            string mmi = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "VDDS_MMI.INI");
            bool vdds = File.Exists(mmi) && Regex.IsMatch(File.ReadAllText(mmi, Encoding.Default), "^\\s*PATDATIMPORT\\s*=.*SorridaConnector\\.exe", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            report.Append(vdds ? "✓ VDDS-media: Sorrida ist eingetragen (Zahnarzt-Software)\n" : "• VDDS-media: nicht eingetragen (nur für Zahnarzt-Software nötig)\n");
        }
        string gdtFile = Get(config, "GDTFILE");
        if (gdtFile.Length > 0)
        {
            string d = Path.GetDirectoryName(gdtFile);
            bool exists = !string.IsNullOrEmpty(d) && Directory.Exists(d);
            if (!exists) ok = false;
            report.Append(exists ? "✓ GDT-Anforderung: Ordner " + d + " vorhanden\n" : "✗ GDT-Anforderung: Ordner " + d + " fehlt\n");
        }
        string import = Get(config, "GDTIMPORT");
        if (import.Length > 0)
        {
            bool writable = false;
            try
            {
                string probe = Path.Combine(import, "sorrida_test_" + Guid.NewGuid().ToString("N") + ".tmp");
                File.WriteAllText(probe, "test");
                File.Delete(probe);
                writable = true;
            }
            catch { }
            if (!writable) ok = false;
            report.Append(writable ? "✓ Rückweg: Ergebnisse gehen nach " + import + "\n" : "✗ Rückweg: In " + import + " kann nicht geschrieben werden\n");
        }
        else report.Append("• Rückweg: kein GDT-Importordner eingestellt (Ergebnisse von Hand übernehmen)\n");
        Log("Verbindungstest: " + (ok ? "ok" : "Fehler") + " – " + report.ToString().Replace("\n", " | "));
        Show((ok ? "Sorrida-Connector " + Version + " ist bereit.\n\n" : "Sorrida-Connector " + Version + ": bitte prüfen.\n\n") + report, !ok);
        return ok ? 0 : 1;
    }

    // ---------------------------------------------------------------- Dateien lesen

    private static string ConfigPath()
    {
        string over = Environment.GetEnvironmentVariable("SORRIDA_CONNECTOR_INI");
        if (!string.IsNullOrEmpty(over)) return over;
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Sorrida", "connector.ini");
    }

    private static void ServerAndKey(Dictionary<string, string> config, out string server, out string key)
    {
        server = Get(config, "SERVER").TrimEnd('/');
        key = Get(config, "KEY");
        if (server.Length == 0 || key.Length == 0)
            throw new ConnectorException("Sorrida-Connector ist nicht eingerichtet (SERVER/KEY fehlen in " + ConfigPath() + "). Bitte install.ps1 erneut ausführen.");
        if (!server.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && !server.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase))
            throw new ConnectorException("SERVER muss eine https-Adresse sein.");
    }

    // Die Praxissoftware schreibt die Datei eventuell noch: lesen, sobald sie frei ist und
    // ihre Größe sich nicht mehr ändert (höchstens etwa 3 Sekunden warten).
    private static byte[] ReadStable(string path)
    {
        long lastSize = -1;
        for (int attempt = 0; ; attempt++)
        {
            try
            {
                byte[] bytes;
                using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                using (var ms = new MemoryStream())
                {
                    fs.CopyTo(ms);
                    bytes = ms.ToArray();
                }
                if (bytes.Length > 0 && bytes.Length == lastSize) return bytes;
                if (attempt >= 15)
                {
                    if (bytes.Length == 0) throw new ConnectorException("Die Übergabedatei ist leer.");
                    return bytes;
                }
                lastSize = bytes.Length;
            }
            catch (IOException)
            {
                // gesperrt, weil die Praxissoftware noch schreibt: kurz warten
                if (attempt >= 15) throw new ConnectorException("Die Übergabedatei ist gesperrt. Bitte erneut versuchen.");
            }
            Thread.Sleep(200);
        }
    }

    private static void CheckAge(string path, Dictionary<string, string> config)
    {
        int max;
        if (!int.TryParse(Get(config, "MAXALTER"), out max)) max = 300;
        if (max <= 0) return;
        TimeSpan age = DateTime.UtcNow - File.GetLastWriteTimeUtc(path);
        if (age.TotalSeconds > max)
            throw new ConnectorException("Die Übergabedatei ist veraltet (zuletzt geschrieben vor " + (int)age.TotalMinutes
                + " Minuten). Sorrida öffnet deshalb keinen Patienten. Bitte Sorrida erneut aus der Praxissoftware heraus aufrufen.");
    }

    private static bool LooksLikeGdt(string path)
    {
        try { return DecodeGdt(File.ReadAllBytes(path)) != null; } catch { return false; }
    }

    // GDT erkennen (erste Zeile: Länge + Feld 8000) und im angegebenen Zeichensatz lesen.
    // Feld 9206: 1 = 7-Bit (DIN 66003), 2 = IBM CP437, 3 = ISO 8859-1, 4 = ISO 8859-15.
    // Fehlt 9206, wird erkannt: gültiges UTF-8, sonst CP437 oder Windows-1252 nach den Umlauten.
    internal static string DecodeGdt(byte[] bytes)
    {
        int start = 0;
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) start = 3;
        string probe = Encoding.ASCII.GetString(bytes, start, Math.Min(bytes.Length - start, 200));
        if (!Regex.IsMatch(probe.TrimStart(), "^\\d{3}8000")) return null;
        string ascii = Encoding.ASCII.GetString(bytes);
        Match cs = Regex.Match(ascii, "(?:^|[\r\n])\\s*\\d{3}9206(\\d)");
        string set = cs.Success ? cs.Groups[1].Value : "";
        if (set == "1") return Din66003(Encoding.ASCII.GetString(bytes, start, bytes.Length - start));
        if (set == "2") return Encoding.GetEncoding(437).GetString(bytes, start, bytes.Length - start);
        if (set == "3") return Encoding.GetEncoding(28591).GetString(bytes, start, bytes.Length - start);
        if (set == "4") return Encoding.GetEncoding(28605).GetString(bytes, start, bytes.Length - start);
        if (start == 3 || IsUtf8WithHighBytes(bytes)) return new UTF8Encoding(false).GetString(bytes, start, bytes.Length - start);
        int cp437 = 0, latin = 0;
        foreach (byte b in bytes)
        {
            if (b == 0x81 || b == 0x84 || b == 0x8E || b == 0x94 || b == 0x99 || b == 0x9A || b == 0xE1) cp437++;
            if (b == 0xC4 || b == 0xD6 || b == 0xDC || b == 0xE4 || b == 0xF6 || b == 0xFC || b == 0xDF) latin++;
        }
        return (cp437 > latin ? Encoding.GetEncoding(437) : Encoding.GetEncoding(1252)).GetString(bytes, start, bytes.Length - start);
    }

    // Deutscher 7-Bit-Zeichensatz: [ \ ] { | } ~ @ stehen für Ä Ö Ü ä ö ü ß §.
    private static string Din66003(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (string line in Regex.Split(s, "(\r\n|\r|\n)"))
        {
            if (line.Length > 7 && Regex.IsMatch(line, "^\\s*\\d{7}"))
            {
                int p = line.Length - line.TrimStart().Length + 7;
                sb.Append(line.Substring(0, p));
                foreach (char c in line.Substring(p))
                {
                    switch (c)
                    {
                        case '[': sb.Append('Ä'); break;
                        case '\\': sb.Append('Ö'); break;
                        case ']': sb.Append('Ü'); break;
                        case '{': sb.Append('ä'); break;
                        case '|': sb.Append('ö'); break;
                        case '}': sb.Append('ü'); break;
                        case '~': sb.Append('ß'); break;
                        case '@': sb.Append('§'); break;
                        default: sb.Append(c); break;
                    }
                }
            }
            else sb.Append(line);
        }
        return sb.ToString();
    }

    private static bool IsUtf8WithHighBytes(byte[] bytes)
    {
        bool high = false;
        foreach (byte b in bytes) if (b >= 0x80) { high = true; break; }
        if (!high) return false;
        try { new UTF8Encoding(false, true).GetString(bytes); return true; }
        catch (DecoderFallbackException) { return false; }
    }

    // VDDS-media: Windows-Standardzeichensatz (in Deutschland Windows-1252). Einige Systeme
    // schreiben inzwischen UTF-8 (mit oder ohne BOM); gültiges UTF-8 wird daher bevorzugt.
    internal static string DecodeText(byte[] bytes)
    {
        try
        {
            return new UTF8Encoding(false, true).GetString(bytes).TrimStart('\uFEFF');
        }
        catch (DecoderFallbackException)
        {
            return Encoding.GetEncoding(1252).GetString(bytes);
        }
    }

    private static Dictionary<string, string> ReadSection(string path, string section)
    {
        if (!File.Exists(path)) return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        return ParseSection(DecodeText(File.ReadAllBytes(path)), section);
    }

    // Einfacher INI-Leser; Abschnitte und Schlüssel ohne Rücksicht auf Groß-/Kleinschreibung.
    internal static Dictionary<string, string> ParseSection(string text, string section)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        bool inSection = false;
        foreach (string raw in Regex.Split(text, "\r\n|\r|\n"))
        {
            string line = raw.Trim();
            if (line.Length == 0 || line[0] == ';' || line[0] == '#') continue;
            if (line[0] == '[' && line.EndsWith("]"))
            {
                inSection = string.Equals(line.Substring(1, line.Length - 2).Trim(), section, StringComparison.OrdinalIgnoreCase);
                continue;
            }
            int eq = line.IndexOf('=');
            if (inSection && eq > 0) result[line.Substring(0, eq).Trim()] = line.Substring(eq + 1).Trim();
        }
        return result;
    }

    // Auf Windows über die Windows-Funktion (behält Zeichensatz und Aufbau der Datei bei),
    // sonst (Tests) mit einem einfachen Schreiber.
    private static void WriteIni(string path, string section, string key, string value)
    {
        if (IsWindows)
        {
            if (!WritePrivateProfileString(section, key, value, path)) throw new IOException("Fehler " + Marshal.GetLastWin32Error());
            return;
        }
        var lines = new List<string>(File.ReadAllLines(path, Encoding.GetEncoding(1252)));
        int sec = -1, end = lines.Count;
        for (int i = 0; i < lines.Count; i++)
        {
            string l = lines[i].Trim();
            if (l.StartsWith("[") && l.EndsWith("]"))
            {
                if (sec >= 0) { end = i; break; }
                if (string.Equals(l.Substring(1, l.Length - 2).Trim(), section, StringComparison.OrdinalIgnoreCase)) sec = i;
            }
        }
        if (sec < 0) { lines.Add("[" + section + "]"); sec = lines.Count - 1; end = lines.Count; }
        for (int i = sec + 1; i < end; i++)
        {
            int eq = lines[i].IndexOf('=');
            if (eq > 0 && string.Equals(lines[i].Substring(0, eq).Trim(), key, StringComparison.OrdinalIgnoreCase))
            {
                lines[i] = key + "=" + value;
                File.WriteAllLines(path, lines.ToArray(), Encoding.GetEncoding(1252));
                return;
            }
        }
        lines.Insert(end, key + "=" + value);
        File.WriteAllLines(path, lines.ToArray(), Encoding.GetEncoding(1252));
    }

    private static void TryDelete(string path)
    {
        try { File.Delete(path); }
        catch (Exception ex) { Log("GDT-Anforderung nicht gelöscht: " + ex.Message); }
    }

    // ---------------------------------------------------------------- Netz

    private static string Request(string method, string endpoint, string key, string body, Dictionary<string, string> config)
    {
        // Ein Netzfehler (kein Fehler von Sorrida selbst) wird einmal wiederholt.
        for (int attempt = 0; ; attempt++)
        {
            try { return RequestOnce(method, endpoint, key, body, config); }
            catch (WebException ex)
            {
                if (ex.Response != null || attempt >= 1) throw Explain(ex);
                Thread.Sleep(1500);
            }
        }
    }

    private static string RequestOnce(string method, string endpoint, string key, string body, Dictionary<string, string> config)
    {
        ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
        var request = (HttpWebRequest)WebRequest.Create(endpoint);
        request.Method = method;
        request.Headers[HttpRequestHeader.Authorization] = "Bearer " + key;
        request.Headers["X-Sorrida-Connector"] = "SorridaConnector/" + Version + "; rueckweg=" + (Get(config, "GDTIMPORT").Length > 0 ? "1" : "0");
        request.UserAgent = "SorridaConnector/" + Version;
        request.Timeout = 20000;
        request.ReadWriteTimeout = 20000;
        string proxy = Get(config, "PROXY");
        if (proxy.Length > 0) request.Proxy = new WebProxy(proxy) { UseDefaultCredentials = true };
        else if (request.Proxy != null) request.Proxy.Credentials = CredentialCache.DefaultCredentials;
        if (body != null)
        {
            request.ContentType = "text/plain; charset=utf-8";
            byte[] bytes = Encoding.UTF8.GetBytes(body);
            request.ContentLength = bytes.Length;
            using (Stream s = request.GetRequestStream()) s.Write(bytes, 0, bytes.Length);
        }
        try
        {
            using (var res = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
                return reader.ReadToEnd();
        }
        catch (WebException ex)
        {
            var res = ex.Response as HttpWebResponse;
            if (res == null) throw;
            using (var reader = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
            {
                string text = reader.ReadToEnd();
                Match msg = Regex.Match(text, "\"error\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
                if (msg.Success) throw new ConnectorException(Regex.Unescape(msg.Groups[1].Value));
                if ((int)res.StatusCode == 404) throw new ConnectorException("Sorrida unter " + endpoint + " nicht gefunden. Stimmt SERVER in der Konfiguration?");
                if ((int)res.StatusCode == 407) throw new ConnectorException("Der Proxy der Praxis verlangt eine Anmeldung. Bitte PROXY in der Konfiguration eintragen oder die IT fragen.");
                throw new ConnectorException("Sorrida antwortet mit Fehler " + (int)res.StatusCode + ".");
            }
        }
    }

    // Netzfehler verständlich machen (Praxis-Firewall, Zertifikat, kein Internet).
    private static Exception Explain(WebException ex)
    {
        switch (ex.Status)
        {
            case WebExceptionStatus.NameResolutionFailure:
                return new ConnectorException("Die Adresse von Sorrida kann nicht aufgelöst werden. Hat der PC Internet? Stimmt SERVER?");
            case WebExceptionStatus.ProxyNameResolutionFailure:
                return new ConnectorException("Der eingestellte Proxy ist nicht erreichbar.");
            case WebExceptionStatus.TrustFailure:
            case WebExceptionStatus.SecureChannelFailure:
                return new ConnectorException("Die sichere Verbindung zu Sorrida wurde abgelehnt (Zertifikat/TLS). Häufige Ursache: Windows-Uhrzeit falsch oder ein Virenscanner prüft https-Verbindungen.");
            case WebExceptionStatus.Timeout:
                return new ConnectorException("Sorrida antwortet nicht rechtzeitig. Bitte Internetverbindung prüfen und erneut versuchen.");
            case WebExceptionStatus.ConnectFailure:
                return new ConnectorException("Keine Verbindung zu Sorrida. Möglicherweise blockiert die Firewall der Praxis den Zugriff.");
        }
        return ex;
    }

    // ---------------------------------------------------------------- Fenster, Meldungen, Protokoll

    private static string FindBrowser(Dictionary<string, string> config)
    {
        string own = Get(config, "BROWSER");
        if (own.Length > 0 && File.Exists(own)) return own;
        foreach (string edge in new[]
        {
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
        })
        {
            if (File.Exists(edge)) return edge;
        }
        return null;
    }

    private static void OpenWindow(string url, Dictionary<string, string> config)
    {
        if (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase))
            throw new ConnectorException("Ungültige Start-Adresse.");
        if (!IsWindows)
        {
            Console.WriteLine("URL " + url); // Tests außerhalb von Windows
            return;
        }
        string size = Get(config, "WINDOW");
        string windowSize = Regex.IsMatch(size, @"^\d{3,4},\d{3,4}$") ? size : "1200,900";
        string browser = FindBrowser(config);
        if (browser != null)
        {
            try
            {
                Process.Start(new ProcessStartInfo(browser, "--app=\"" + url + "\" --window-size=" + windowSize) { UseShellExecute = false });
                return;
            }
            catch (Exception ex) { Log("App-Fenster nicht gestartet, nehme Standardbrowser: " + ex.Message); }
        }
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }

    private static void Show(string text, bool error)
    {
        if (silent) return;
        if (IsWindows) MessageBoxW(IntPtr.Zero, text, "Sorrida", error ? 0x10u : 0x40u);
        else (error ? Console.Error : Console.Out).WriteLine("Sorrida: " + text);
    }

    // Protokoll ohne Patientendaten, höchstens etwa 1 MB (danach wird neu begonnen).
    private static void Log(string message)
    {
        try
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Sorrida");
            Directory.CreateDirectory(dir);
            string file = Path.Combine(dir, "connector.log");
            if (File.Exists(file) && new FileInfo(file).Length > 1000000) File.Delete(file);
            File.AppendAllText(file, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + message.Replace("\r", " ").Replace("\n", " ") + "\r\n", Encoding.UTF8);
        }
        catch { }
    }

    private static string Get(Dictionary<string, string> d, string key)
    {
        string v;
        return d.TryGetValue(key, out v) && v != null ? v.Replace("\r", "").Replace("\n", "") : "";
    }

    private sealed class ConnectorException : Exception
    {
        public ConnectorException(string message) : base(message) { }
    }
}

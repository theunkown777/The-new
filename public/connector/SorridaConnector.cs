// Sorrida-Connector: VDDS-media-1.4-Importmodul (PATDATIMPORT) für Windows.
//
// Die Praxissoftware (DS-Win, CGM Z1, charly, evident ...) ruft dieses
// Programm mit dem Pfad der Patientendaten-Übergabedatei als einzigem
// Parameter auf. Der Connector
//   1. liest den [PATIENT]-Abschnitt (Windows-Standardzeichensatz),
//   2. schickt nur die benötigten Felder an Sorrida (Adresse, Telefon,
//      Versichertennummer usw. verlassen den PC nicht),
//   3. öffnet die zurückgegebene Einmal-URL als eigenes App-Fenster
//      (Microsoft Edge im App-Modus, sonst Standardbrowser),
//   4. setzt ERRORLEVEL und zuletzt READY=1 in der Übergabedatei.
//
// Konfiguration: %ProgramData%\Sorrida\connector.ini, Abschnitt [SORRIDA]
//   SERVER=https://ihre-sorrida-adresse.de
//   KEY=sor_conn_...
//   VIEW=bericht | vorschlag | verlauf   (optional, Standard: bericht)
//   WINDOW=1200,900                      (optional)
//
// Übersetzen (macht install.ps1 automatisch):
//   %WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe
//     /out:SorridaConnector.exe SorridaConnector.cs

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

internal static class SorridaConnector
{
    // Felder aus VDDS-media 1.4, Tabelle 3, die Sorrida verarbeitet.
    private static readonly string[] Fields =
    {
        "PVS", "PATID", "PATSHOWNR", "LASTNAME", "FIRSTNAME", "TITLE",
        "BIRTHDAY", "SEX", "INSURANCESTATUS", "INSURANCE", "INFO"
    };

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool WritePrivateProfileString(string section, string key, string value, string path);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    private static int Main(string[] args)
    {
        string handover = args.Length > 0 ? args[0].Trim('"') : null;
        int errorLevel = 0;
        string errorText = "";
        try
        {
            if (string.IsNullOrEmpty(handover) || !File.Exists(handover))
                throw new ConnectorException("Keine Übergabedatei erhalten. Sorrida bitte über die Praxissoftware aufrufen.");

            Dictionary<string, string> config = ReadSection(
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Sorrida", "connector.ini"),
                "SORRIDA");
            string server = Get(config, "SERVER").TrimEnd('/');
            string key = Get(config, "KEY");
            if (server.Length == 0 || key.Length == 0)
                throw new ConnectorException("Sorrida-Connector ist nicht eingerichtet (SERVER/KEY fehlen). Bitte install.ps1 erneut ausführen.");
            if (!server.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && !server.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase))
                throw new ConnectorException("SERVER muss eine https-Adresse sein.");

            Dictionary<string, string> patient = ReadSection(handover, "PATIENT");
            var body = new StringBuilder("[PATIENT]\r\n");
            foreach (string field in Fields)
            {
                string value = Get(patient, field);
                if (value.Length > 0) body.Append(field).Append('=').Append(value).Append("\r\n");
            }

            string view = Get(config, "VIEW");
            string endpoint = server + "/api/connector/launch" + (view.Length > 0 ? "?view=" + Uri.EscapeDataString(view) : "");
            string response = Post(endpoint, key, body.ToString());

            Match url = Regex.Match(response, "\"url\"\\s*:\\s*\"([^\"]+)\"");
            if (url.Success) OpenWindow(url.Groups[1].Value.Replace("\\/", "/"), Get(config, "WINDOW"));
            else if (!Regex.IsMatch(response, "\"info\"\\s*:\\s*true"))
                throw new ConnectorException("Unerwartete Antwort von Sorrida.");
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

        if (!string.IsNullOrEmpty(handover) && File.Exists(handover))
        {
            // Reihenfolge laut Spezifikation: READY=1 immer als letzte Aktion.
            WritePrivateProfileString("PATIENT", "ERRORLEVEL", errorLevel.ToString(), handover);
            WritePrivateProfileString("PATIENT", "ERRORTEXT", errorText, handover);
            WritePrivateProfileString("PATIENT", "READY", "1", handover);
        }
        if (errorLevel > 0) MessageBoxW(IntPtr.Zero, errorText, "Sorrida", 0x10);
        return errorLevel;
    }

    private static string Post(string endpoint, string key, string body)
    {
        ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
        var request = (HttpWebRequest)WebRequest.Create(endpoint);
        request.Method = "POST";
        request.ContentType = "text/plain; charset=utf-8";
        request.Headers[HttpRequestHeader.Authorization] = "Bearer " + key;
        request.Timeout = 15000;
        byte[] bytes = Encoding.UTF8.GetBytes(body);
        using (Stream s = request.GetRequestStream()) s.Write(bytes, 0, bytes.Length);
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
                Match msg = Regex.Match(reader.ReadToEnd(), "\"error\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
                throw new ConnectorException(msg.Success ? Regex.Unescape(msg.Groups[1].Value) : "Sorrida antwortet mit Fehler " + (int)res.StatusCode + ".");
            }
        }
    }

    private static void OpenWindow(string url, string size)
    {
        if (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase))
            throw new ConnectorException("Ungültige Start-Adresse.");
        string windowSize = Regex.IsMatch(size, @"^\d{3,4},\d{3,4}$") ? size : "1200,900";
        foreach (string edge in new[]
        {
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
        })
        {
            if (!File.Exists(edge)) continue;
            Process.Start(new ProcessStartInfo(edge, "--app=\"" + url + "\" --window-size=" + windowSize) { UseShellExecute = false });
            return;
        }
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }

    // Einfacher INI-Leser; VDDS schreibt im Windows-Standardzeichensatz (ANSI).
    private static Dictionary<string, string> ReadSection(string path, string section)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(path)) return result;
        bool inSection = false;
        foreach (string raw in ReadText(path).Split('\n'))
        {
            string line = raw.Trim();
            if (line.Length == 0 || line[0] == ';') continue;
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

    // Laut Spezifikation schreibt die PVS im Windows-Standardzeichensatz (in
    // Deutschland Windows-1252). Einige Systeme schreiben inzwischen UTF-8;
    // gültiges UTF-8 wird daher bevorzugt erkannt.
    private static string ReadText(string path)
    {
        byte[] bytes = File.ReadAllBytes(path);
        try
        {
            return new UTF8Encoding(false, true).GetString(bytes).TrimStart('\uFEFF');
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Default.GetString(bytes);
        }
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

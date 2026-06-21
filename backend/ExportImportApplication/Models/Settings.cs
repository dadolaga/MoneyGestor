using Microsoft.Extensions.Logging;
using System.Reflection;

namespace ExportImportApplication.Models {
    public class Settings {
        public SettingsLog Log { get; set; }
        public SettingsDatabase Database { get; set; }
    }

    public class SettingsLog {
        public LogLevel Level { get; set; }
        public SettingsLogOutput Output { get; set; }
    }

    public class SettingsLogOutput {
        public Boolean? Console { get; set; }
        public SettingsLogFile? File { get; set; }
    }

    public class SettingsLogFile {
        public String Path { get; set; }
        public String FileName { get; set; }
    }

    public class SettingsDatabase {
        public String Host { get; set; }
        public UInt16 Port { get; set; }
        public String Name { get; set; }
        public String User { get; set; }
        public String Password { get; set; }
    }
}

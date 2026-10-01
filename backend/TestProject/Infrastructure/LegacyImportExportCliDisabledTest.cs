using System.Diagnostics;
using System.Reflection;

namespace TestProject.Infrastructure;

[TestFixture]
public sealed class LegacyImportExportCliDisabledTest {
    [TestCase("export")]
    [TestCase("import")]
    [TestCase("anything")]
    public async Task EveryLegacyCommandStopsBeforeSettingsOrFilesystem(String command) {
        var root = Path.Combine(Path.GetTempPath(), $"mg-cli-disabled-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        var archivePath = Path.Combine(root, "must-not-be-created.zip");
        var settingsPath = Path.Combine(root, "must-not-be-read.json");
        var assemblyPath = Assembly.Load("ExportImportApplication").Location;

        try {
            var start = new ProcessStartInfo("dotnet") {
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false
            };
            start.ArgumentList.Add(assemblyPath);
            start.ArgumentList.Add(command);
            start.ArgumentList.Add("--path");
            start.ArgumentList.Add(archivePath);
            start.Environment["IMPORT_EXPORT_APP_SETTINGS"] = settingsPath;

            using var process = Process.Start(start)
                ?? throw new InvalidOperationException("Could not start the legacy CLI process.");
            var stderrTask = process.StandardError.ReadToEndAsync();
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            Assert.Multiple(() => {
                Assert.That(process.ExitCode, Is.EqualTo(2));
                Assert.That(stderrTask.GetAwaiter().GetResult().Trim(), Is.EqualTo("feature_disabled"));
                Assert.That(stdoutTask.GetAwaiter().GetResult(), Is.Empty);
                Assert.That(File.Exists(archivePath), Is.False);
                Assert.That(File.Exists(settingsPath), Is.False);
            });
        } finally {
            var fullRoot = Path.GetFullPath(root);
            var tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (fullRoot.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase) &&
                Path.GetFileName(fullRoot).StartsWith("mg-cli-disabled-", StringComparison.Ordinal) &&
                Directory.Exists(fullRoot)) {
                Directory.Delete(fullRoot, recursive: true);
            }
        }
    }
}
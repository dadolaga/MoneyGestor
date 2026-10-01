internal static class Program {
    private static void Main() {
        Console.Error.WriteLine("feature_disabled");
        Environment.ExitCode = 2;
    }
}
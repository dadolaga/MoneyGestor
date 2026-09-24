namespace TestProject;

internal sealed class TestClock : TimeProvider {
    private DateTimeOffset utcNow = DateTimeOffset.UtcNow;

    public DateTime Now {
        get => TimeZoneInfo.ConvertTime(utcNow, LocalTimeZone).DateTime;
        set {
            var offset = LocalTimeZone.GetUtcOffset(value);
            utcNow = new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Unspecified), offset)
                .ToUniversalTime();
        }
    }

    public override DateTimeOffset GetUtcNow() => utcNow;
}

namespace TestProject.Base;

internal abstract class ClockBase {
    protected TestClock Clock { get; private set; } = null!;

    [SetUp]
    public void ClockSetup() => Clock = new TestClock();
}

namespace database;

public enum DatabaseBootstrapMode {
    Disabled,
    Migrate
}

public enum DatabaseBootstrapOutcome {
    UpToDate,
    Migrated
}

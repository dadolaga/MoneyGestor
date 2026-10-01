namespace database;

public enum DatabaseBootstrapMode {
    Disabled,
    Migrate,
    MigrateAndAdoptLegacy
}

public enum DatabaseBootstrapOutcome {
    UpToDate,
    Migrated,
    AdoptedLegacySchema
}
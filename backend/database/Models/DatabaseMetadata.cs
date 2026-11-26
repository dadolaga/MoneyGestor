using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models;

[Table("database_metadata")]
public sealed class DatabaseMetadata {
    public Int32 Id { get; set; } = 1;
    public Int32 SchemaVersion { get; set; }
}
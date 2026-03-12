using database.Models;

namespace webserver.Models {
    public class Color {
        public UInt64? Id { get; set; }
        public String Name { get; set; }
        public UInt32 Value { get; set; }
        public UInt64? UserId { get; set; }
        public UserDb? User { get; set; }
    }
}

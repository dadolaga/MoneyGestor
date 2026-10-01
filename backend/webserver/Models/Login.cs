namespace webserver.Models {
    public class Login {
        public String User { get; set; } = String.Empty;
        public String Password { get; set; } = String.Empty;
        public Boolean? Remember { get; set; } = false;
    }
}
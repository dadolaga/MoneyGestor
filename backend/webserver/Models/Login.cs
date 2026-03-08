namespace webserver.Models {
    public class Login {
        public String User { get; set; }
        public String Password { get; set; }
        public Boolean? Remember { get; set; } = false;
    }
}

namespace webserver.Models {
    public class ListOutput<T> {
        public Int32 Length { get; set; }
        public IList<T> Data { get; set; }
    }
}

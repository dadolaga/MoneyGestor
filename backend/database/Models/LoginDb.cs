using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database.Models {

    [Table("login")]
    public class LoginDb {
        public UInt64 Id { get; set; }
        public String Token { get; set; }
        public Boolean IsLong { get; set; }
        public DateTime Expirated { get; set; }
        public UInt64 UserId { get; set; }
        public UserDb User { get; set; }
    }
}
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using System.Runtime.CompilerServices;

namespace TrackingApp.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Name { get; set; }
  
        public List<Competition> Competitions { get; set; }
    }

}

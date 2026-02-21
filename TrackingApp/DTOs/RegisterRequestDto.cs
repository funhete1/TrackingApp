using Microsoft.AspNetCore.Identity.Data;
using System.ComponentModel.DataAnnotations;


namespace TrackingApp.DTOs
{
    //passive override of the RegisterRequest
    public class RegisterRequestDto 
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string Username { get; set; }
    }
}

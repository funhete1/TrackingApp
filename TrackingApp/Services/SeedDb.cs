using Microsoft.AspNetCore.Identity;
using System.Text.Json;
using TrackingApp.Models;

namespace TrackingApp.Services
{
    public class SeedDb
    {
        public static async Task SeedRoles(IServiceProvider services)
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            string[] roles = { "Admin", "User" };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        public static async Task<List<double[]>> GetRouteCoordinates(double startLat, double startLng, double endLat, double endLng)
        {
            using var httpClient = new HttpClient();
            // OSRM expects {lng},{lat}
            var url = $"https://router.project-osrm.org/route/v1/driving/{startLng},{startLat};{endLng},{endLat}?overview=full&geometries=geojson";

            var response = await httpClient.GetFromJsonAsync<JsonElement>(url);
            var coords = response.GetProperty("routes")[0]
                                 .GetProperty("geometry")
                                 .GetProperty("coordinates");

            // Deserialize into a list of [longitude, latitude]
            return coords.Deserialize<List<double[]>>();
        }

        public static async Task SeedAdmin(IServiceProvider services)
        {
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

            string adminEmail = "admin@example.com";
            string adminPassword = "Admin123!";

            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true
                };

                await userManager.CreateAsync(adminUser, adminPassword);
            }

            if (!await userManager.IsInRoleAsync(adminUser, "Admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }

    }
}

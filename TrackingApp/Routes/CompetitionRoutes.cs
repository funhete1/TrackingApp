using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Diagnostics;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TrackingApp.Data;
using TrackingApp.DTOs;
using TrackingApp.Models;
using TrackingApp.Services;

namespace TrackingApp.Routes
{
    public static class CompetitionRoutes
    {

        // Implement latter
        public static void ApplicationRoute(this IEndpointRouteBuilder routes) {

            var group = routes.MapGroup("/api/public");

            // Implement latter
            // Designed to Run the simlation using SignalR instead of static data being randomized to the database
            //    group.MapPost("/iniciar/{id}", async (int id, GestorCorrida gestor, AppDbContext db) =>
            //    {
            //        // Busca os dados da corrida no banco de dados
            //        var corrida = await db.Competitions
            //            .Where(c => c.Id == id)
            //            .Select(c => new CompetitionData
            //            {
            //                Id = c.Id,
            //                Nparticipants = c.NumberOfCompetitors,
            //                Beginning = c.Beginning,
            //                Ending = c.End
            //            })
            //            .FirstOrDefaultAsync();

            //        if (corrida == null)
            //            return Results.NotFound("Corrida não encontrada.");

            //        // Alimenta o Gestor (Singleton) com os dados obtidos
            //        gestor.Iniciar(corrida);

            //        return Results.Ok($"Corrida {id} iniciada com {corrida.Nparticipants} competidores.");
            //    }).RequireAuthorization(policy => policy.RequireRole("Admin"));

            //    group.MapPost("/parar", (GestorCorrida gestor) => {
            //        gestor.Parar();
            //        return Results.Ok("Corrida parada!");
            //    }).RequireAuthorization().RequireAuthorization(policy => policy.RequireRole("Admin"));

            group.MapGet("/choose_competitons", async (AppDbContext db) =>
            {
                var competitions = await db.Competitions
                                        .Select(c => new {c.Name, c.Id})
                                        .ToListAsync();

                return Results.Ok(competitions);
                        
            });

            group.MapGet("/competiton_data/", async (AppDbContext db, int compId) =>
            {
                var BegEnd = await db.Competitions
                                .Where(c => c.Id == compId)
                                .Select(c => new {
                                    BeginningLat = c.Beginning.Lat,
                                    BeginningLon = c.Beginning.Lng,
                                    EndLat = c.End.Lat,
                                    EndLon = c.End.Lng
                                })
                                .FirstOrDefaultAsync();
                
                

                var runners = await db.Competidores
                                    .Where(c => c.CompetId == compId)
                                    .Select(c => new { 
                                        Name = c.name,
                                        Lat = c.pos.Lat,
                                        Lng = c.pos.Lng
                                    })
                                    .ToListAsync();

                if (BegEnd == null) {
                    return Results.BadRequest("Failed to load the compettion data");
                }
                
                if (runners == null) 
                {
                    return Results.BadRequest("No runners registed in this run");
                }
                var sortedRunners = runners
                     .OrderBy(r => Position.GetDistance(
                         new Position { Lat = BegEnd.EndLat, Lng = BegEnd.EndLon},
                         new Position { Lat = r.Lat, Lng = r.Lng }
                     ))
                     .ToList();
                return Results.Ok(new {BegEnd,sortedRunners});
            });

        }

    }

    public static class AdminEndpoints
    {
        public static void MapAdminRoutes(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/api/admin")
                              .RequireAuthorization(policy => policy.RequireRole("Admin"));

            group.MapGet("/verify", () => Results.Ok(new { role = "Authorized" }));

            // Return list used by adminDash.js (competitions only for this admin)
            group.MapGet("/competitions", async (AppDbContext db, ClaimsPrincipal user) =>
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Results.Unauthorized();

                var data = await db.Competitions
                    .Where(c => c.ManagerId == userId)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        beginning = new { lat = c.Beginning.Lat, lng = c.Beginning.Lng },
                        end = new { lat = c.End.Lat, lng = c.End.Lng },
                        numberOfCompetitors = c.NumberOfCompetitors,
                        startTime = c.StartTime,
                        duration = c.Duration
                    })
                    .ToListAsync();

                return Results.Ok(data);
            });

            // Promote and demote user logic not working (Implement later)
            //group.MapPost("/promotion/{userId}", async (string userId, UserManager<ApplicationUser> userManager) =>
            //{
            //    var user = await userManager.FindByIdAsync(userId);

            //    if (user == null)
            //        return Results.NotFound("User Not Registered");

            //    var result = await userManager.AddToRoleAsync(user, "Admin");
            //    await userManager.RemoveFromRoleAsync(user, "User");

            //    if (!result.Succeeded)
            //    {                    
            //        return Results.BadRequest(result.Errors);
            //    }

            //    return Results.Ok($"User {user.Email} is now an Admin.");
            //});

            //group.MapPost("/demote/{userId}", async (string userId, UserManager<ApplicationUser> userManager) => 
            //{
            //    Console.WriteLine(userId
            //        );

            //    var user = await userManager.FindByIdAsync(userId);

            //    if (user == null) 
            //        return Results.NotFound("User Not Found");

            //    var result_promte = await userManager.AddToRoleAsync(user, "User");
            //    var result_demote =  await userManager.RemoveFromRoleAsync(user, "Admin");

            //    Console.WriteLine(result_demote.Errors);
                
            //    if (!result_demote.Succeeded) {
            //        return Results.BadRequest(result_demote.Errors);
            //    }
            //    if (!result_promte.Succeeded ) {
            //        return Results.BadRequest(result_promte.Errors);
            //    }

            //    return Results.Ok($"User {user.Email} is now User");
            //});

            // Create an Competiton
            group.MapPost("create", async (CreateCompetitionRequest request,AppDbContext db, ClaimsPrincipal user, IServiceProvider serviceProvider) =>
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

                var competition = new Competition
                {
                    Name = request.Name,
                    Beginning = request.Beginning,
                    End = request.End,
                    Description = request.Description,
                    NumberOfCompetitors = request.NumberOfCompetitors,
                    StartTime = request.StartDate,
                    EndTime = request.EndDate,
                    ManagerId = userId
                };

                // Seed compettion with competidors
                db.Competitions.Add(competition);
                await db.SaveChangesAsync();

                var compId = competition.Id;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        Console.WriteLine("Starting background generation of competitors...");
                        
                        //DB context for background work
                        using var scope = serviceProvider.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        

                        //Delay so dont happen race conditions
                        var exists = await context.Competitions.AnyAsync(c => c.Id == competition.Id);

                        if (!exists)
                        {
                            await Task.Delay(500);
                            exists = await context.Competitions.AnyAsync(c => c.Id == competition.Id);
                        }

                        // Fetch route from OSRM
                        var routePoints = await SeedDb.GetRouteCoordinates(
                            request.Beginning.Lat, request.Beginning.Lng,
                            request.End.Lat, request.End.Lng
                        );

                        Console.WriteLine($"Fetched {routePoints.Count} route points from OSRM.");
                        var random = new Random();
                        var competitors = new List<Competidor>();

                        for (int i = 0; i < request.NumberOfCompetitors; i++)
                        {
                            // Pick a coordinate from the path
                            var basePoint = routePoints[random.Next(routePoints.Count)];

                            //Offset to add some randomness (up to ~15m in any direction)
                            double latOffset = (random.NextDouble() * 2 - 1) * 0.00015;
                            double lngOffset = (random.NextDouble() * 2 - 1) * 0.00015;

                            competitors.Add(new Competidor
                            {
                                CompetId = compId,
                                name = $"Runner {i + 1}",
                                pos = new Position{ 
                                    Lat=basePoint[1] + latOffset,
                                    Lng = basePoint[0] + lngOffset 
                                }

                            });
                        }

                        context.Competidores.AddRange(competitors);
                        await context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {  
                        Console.WriteLine($"Background generation failed: {ex.Message}");
                    }
                });


                return Results.Ok(competition);
            });

            // Return users with role "User" (non-admins) — switch to GET so client can call with default fetch
            group.MapGet("/users", async (UserManager<ApplicationUser> userManager) =>
            {
                var users = await userManager.GetUsersInRoleAsync("User");
                var list = users.Select(u => new { id = u.Id, email = u.Email, name = u.Name }).ToList();
                return Results.Ok(list);
            });

            // Return users with role "Admin"
            group.MapGet("/admins", async (UserManager<ApplicationUser> userManager) =>
            {
                var users = await userManager.GetUsersInRoleAsync("Admin");
                var list = users.Select(u => new { id = u.Id, email = u.Email, name = u.Name }).ToList();
                return Results.Ok(list);
            });

        }
    }
    public static class IdentityRoutes {
        public static void MapIdentityRoutes(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/identity");

            // 1. Custom Register Endpoint
            group.MapPost("/register-custom", async (
                RegisterRequestDto registration,
                UserManager<ApplicationUser> userManager) =>
            {
                var user = new ApplicationUser { Name = registration.Username, UserName = registration.Email, Email = registration.Email };
                var result = await userManager.CreateAsync(user, registration.Password);

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, "User");
                    return Results.Ok();
                }
                return Results.BadRequest(result.Errors);
            });
            group.MapGet("/roles", async (ClaimsPrincipal user, UserManager<ApplicationUser> userManager) =>
            {
                // Check if the user is logged in
                if (user.Identity?.IsAuthenticated != true)
                    return Results.Unauthorized();

                var userEntity = await userManager.GetUserAsync(user);
                if (userEntity == null)
                    return Results.NotFound("User no longer exists.");

                // Get the roles from the AspNetUserRoles table
                var roles = await userManager.GetRolesAsync(userEntity);

                return Results.Ok(roles);
            }).RequireAuthorization();

            // 2. Map the rest (Login, etc.)
            group.MapIdentityApi<ApplicationUser>();
        }
    }

    public static class PublicRoutes
    {
        public static void MapPublicEndpoints(this IEndpointRouteBuilder routes)
        {
            routes.MapGet("/", () => Results.Redirect("/index.html"));
        }
    }
}

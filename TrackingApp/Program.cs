using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TrackingApp.Data;
using TrackingApp.Hubs;
using TrackingApp.Models;
using TrackingApp.Routes;
using TrackingApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Serviços
builder.Services.AddSignalR(options => {
    options.EnableDetailedErrors = true;
});

builder.Services.AddSingleton<GestorCorrida>();
builder.Services.AddSingleton<CorridaBuffer>();
builder.Services.AddHostedService<MotorSimulacao>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=corrida.db"));

// Identity & Auth (A ordem correta)
builder.Services.AddAuthorization();

builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    
    await SeedDb.SeedRoles(services);

    await SeedDb.SeedAdmin(services);
}


app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();


app.MapPublicEndpoints(); 
app.MapHub<CorridaHub>("/hub-corrida");
app.MapIdentityRoutes();
app.MapAdminRoutes();
app.ApplicationRoute();

app.Run();
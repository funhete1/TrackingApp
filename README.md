# TrackingApp

Lightweight race-tracking web app (ASP.NET Core + EF Core + Leaflet).  
Provides admin endpoints to create competitions and a public UI that displays competition routes and runner positions on a Leaflet map.

## Tech stack
- .NET 10 / C# 14
- ASP.NET Core minimal endpoints
- Entity Framework Core (Code First)
- SQLite / SQL Server (configured via `appsettings` / DI)
- Frontend: Leaflet + Leaflet Routing Machine (wwwroot)

## Prerequisites
- .NET 10 SDK
- Visual Studio 2026 or `dotnet` CLI
- DB provider (SQLite/SQL Server) configured in DI

## Quick start (developer)
1. Clone repository.
2. Configure connection string in `appsettings.json` / Secrets.
3. From project root:
   - Create / update migrations:
     - `dotnet ef migrations add Initial`  
     - `dotnet ef database update`
   - Build and run:
     - `dotnet run`
4. Open browser at `http://localhost:5232`

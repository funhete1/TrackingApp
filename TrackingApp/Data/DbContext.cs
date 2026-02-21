using TrackingApp.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore.Internal;

namespace TrackingApp.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    //Define which models should be tables in the database
    public DbSet<Competition> Competitions { get; set; }
    public DbSet<Competidor> Competidores { get; set; }

    public DbSet<PositionHistory> positionHistory { get; internal set; } //It cannot be managed externally, only internally by the app

    public DbSet<ApplicationUser> ApplicationUsers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // N:1 relation between Competidor and Competition
        modelBuilder.Entity<Competidor>()
            .HasOne(c => c.Competition)
            .WithMany(comp => comp.Competidores)
            .HasForeignKey(c => c.CompetId);

        // 1 Competiton Has one Manager
            modelBuilder.Entity<Competition>()
            .HasOne(c => c.Manager)
            .WithMany(u => u.Competitions)
            .HasForeignKey(c => c.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);




        // Ensure that the model Point belongs to the table and is not a a foreing key to a table of points
        modelBuilder.Entity<Competition>().OwnsOne(c => c.Beginning);
        modelBuilder.Entity<Competition>().OwnsOne(c => c.End);
        modelBuilder.Entity<PositionHistory>().OwnsOne(p => p.pos);
        modelBuilder.Entity<Competidor>().OwnsOne(p => p.pos);
    }
}
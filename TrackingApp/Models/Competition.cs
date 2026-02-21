using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace TrackingApp.Models
{
    public class Competition
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public int NumberOfCompetitors { get; set; }

        public Position Beginning { get; set; }

        public Position End { get; set; }

        public List<Competidor> Competidores { get; set; }

        public string ManagerId { get; set; } 
        public ApplicationUser Manager { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public TimeSpan Duration {
            get {
                return EndTime - StartTime;
            }
        }

        // to implent later statiscs for each competition
        // foring key to the statiscs table
    }
}

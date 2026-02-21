namespace TrackingApp.Models
{
    public class PositionHistory
    {
        public int Id { get; set; } // PK
        public int RaceId { get; set; }
        public int CompetidorId { get; set; }
        public Competidor Competidor { get; set; } //FK
        public Position pos { get; set; }
        public DateTime Timestamp { get; set; }
    }
}

using TrackingApp.Models;

namespace TrackingApp.DTOs
{
    public record CreateCompetitionRequest(
        string Name,
        Position Beginning,
        Position End,
        int NumberOfCompetitors,
        string Description,
        DateTime StartDate,
        DateTime EndDate
    );
}

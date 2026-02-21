using Microsoft.EntityFrameworkCore;

namespace TrackingApp.Models
{
    [Owned]
    public class Position
    {
        public double Lat { get; set; }

        public double Lng { get; set; }

    }
}

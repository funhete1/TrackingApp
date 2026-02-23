using Microsoft.EntityFrameworkCore;
using System.Drawing;

namespace TrackingApp.Models
{
    [Owned]
    public class Position
    {
        public double Lat { get; set; }

        public double Lng { get; set; }


        public static double GetDistance(Position p1, Position p2)
        {
            double R = 6371; // Earth's radius in Kilometers
            double dLat = ToRadians(p2.Lat - p1.Lat);
            double dLng = ToRadians(p2.Lng - p1.Lng);

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                        Math.Cos(ToRadians(p1.Lat)) * Math.Cos(ToRadians(p2.Lat)) *
                        Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180;

    }
}
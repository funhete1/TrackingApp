using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using System.Formats.Tar;
using TrackingApp.Models;

namespace TrackingApp.Services;

public class GestorCorrida
{
    public bool EstaAcontecendo { get; private set; } = false;

    public CompetitionData CompParameters { get; set; } = null;

    //Ensure that only the admin starts the competition
    public void Iniciar(CompetitionData Competition) {
        EstaAcontecendo = true;
        CompParameters = Competition;
    }

    public void Parar() { 
        EstaAcontecendo = false;
    }
}
namespace TrackingApp.Services;

using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq; 
using TrackingApp.Models;

public class CorridaBuffer
{
    public ConcurrentDictionary<int, Competidor> Posicoes { get; } = new();
    
    //Used to simulate the new position for each runner
    private readonly Random _random = new Random();

    public List<Competidor> GerarDadosNCompetidores(CompetitionData competition)
    {
        if (Posicoes.IsEmpty)
        {
            for (int i = 1; i <= competition.Nparticipants; i++)
            {
                Posicoes[i] = new Competidor
                {
                    Id = i,
                    name = $"Competidor {i}",
                    pos = new Position
                    {
                        Lat = competition.Beginning.Lat,
                        Lng = competition.Beginning.Lng
                    }
                };
            }
        }

        foreach (var competidor in Posicoes.Values)
        {            
            competidor.pos.Lat += (_random.NextDouble() - 0.5) * 0.001;
            competidor.pos.Lng += (_random.NextDouble() - 0.5) * 0.001;
        }

        return Posicoes.Values.ToList();
    }
    public void LimparBuffer() => Posicoes.Clear();
}
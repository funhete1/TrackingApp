using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using System;
using TrackingApp.Data;
using TrackingApp.Hubs;
using TrackingApp.Models;
using TrackingApp.Services;

public class MotorSimulacao : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<CorridaHub> _hubContext;
    private readonly GestorCorrida _gestor; // Adicionado
    private readonly CorridaBuffer _buffer; // Adicionado

    public MotorSimulacao(IServiceScopeFactory scopeFactory, 
        IHubContext<CorridaHub> hubContext,
        GestorCorrida gestor,
        CorridaBuffer buffer)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _gestor = gestor;
        _buffer = buffer;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_gestor.EstaAcontecendo)
            {
                int currentRaceId = _gestor.CompParameters.Id; // Pegamos o ID atual

                //get the number of competitors for this race
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
               
               
                var novasPosicoes = _buffer.GerarDadosNCompetidores(_gestor.CompParameters);


                // 1. Envia para o SignalR (pode incluir o RaceId no objeto para o Front saber)
                await _hubContext.Clients.All.SendAsync("ReceberPosicoes", new
                {
                    RaceId = currentRaceId,
                    Data = novasPosicoes
                });

                // 2. Salva no SQLite com o RaceId
                _ = Task.Run(async () => {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var historico = novasPosicoes.Select(p => new PositionHistory
                    {
                        RaceId = currentRaceId, // Agora os dados estão linkados!
                        CompetidorId = p.Id,
                        pos = p.pos,
                        Timestamp = DateTime.UtcNow
                    });

                    db.positionHistory.AddRange(historico);
                    await db.SaveChangesAsync();
                });
            }
            await Task.Delay(5000); // Ex: Atualiza a cada 5 segundos
        }
        _buffer.LimparBuffer();
    }
}
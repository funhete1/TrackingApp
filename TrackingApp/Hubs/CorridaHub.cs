using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace TrackingApp.Hubs
{
    public class CorridaHub : Hub
    {
        
        public async Task EnviarAlerta(int competidorId, string mensagem)
        {
            // O Admin (ou todos) recebe o alerta
            await Clients.All.SendAsync("ReceberAlerta", competidorId, mensagem);
        }

        // Quando um novo usuário se conecta ao mapa
        public override async Task OnConnectedAsync()
        {
            // Log para debug ou estatísticas de audiência
            var connectionId = Context.ConnectionId;
            await base.OnConnectedAsync();
        }
    }
}
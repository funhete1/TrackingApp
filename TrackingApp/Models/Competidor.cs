using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace TrackingApp.Models
{
    public class Competidor
    {
        public int Id { get; set; }

        public string name { get; set; }
       
        public Position  pos { get; set; }

        // chave estrangeira para a tabela de Competicoes
        public int CompetId { get; set; }

        public Competition Competition { get; set; }

         // to implent later 
         // should have a pace and a key to an estatisc table
    }
}

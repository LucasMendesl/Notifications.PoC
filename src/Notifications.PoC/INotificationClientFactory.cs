using Notifications.PoC.Email;

namespace Notifications.PoC
{
    public interface INotificationClientFactory
    {
         ISender CreateEmailClient(Configuration emailConfiguration); 
    }
}
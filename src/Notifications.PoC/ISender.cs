using System.Threading.Tasks;

namespace Notifications.PoC
{
    public interface ISender
    {
         Task<NotificationResponse> SendMessage(Message message);
    }
}
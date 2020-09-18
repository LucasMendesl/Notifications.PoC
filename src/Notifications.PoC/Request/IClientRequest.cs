using System.Threading.Tasks;

namespace Notifications.PoC.Request
{
    public interface IClientRequest
    {
        Task<object> Request(object request);  
    }
}
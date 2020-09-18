using System.Threading.Tasks;
using Notifications.PoC.Request;

namespace Notifications.PoC.Email
{
    public class MailSender : ISender
    {
        private readonly IClientRequest _smtpRequest;

        public MailSender(MailConfiguration config) 
            : this(new SmtpRequest(config.User, config.Password, config.Port, config.Host, config.SSL))
        {
        }

        public MailSender(IClientRequest smtpRequest) 
        {
            _smtpRequest = smtpRequest;
        }

        public async Task<NotificationResponse> SendMessage(Message message)
        {
            var response = await _smtpRequest.Request(message);
            return (NotificationResponse)response;
        }

    }
}
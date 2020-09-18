using Notifications.PoC.Email;

namespace Notifications.PoC
{
    public class NotificationClientFactory : INotificationClientFactory
    {
        public ISender CreateEmailClient(Configuration configuration)
        {
            var mailConfig = configuration as MailConfiguration;
            return new MailSender(mailConfig);
        }
    }
}
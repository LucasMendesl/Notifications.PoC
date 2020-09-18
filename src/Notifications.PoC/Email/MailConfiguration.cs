namespace Notifications.PoC.Email
{
    public class MailConfiguration : Configuration
    {
        public int Port { get; set; }
        public bool SSL { get; set; }
    }
}